import os
import struct
import sqlite3
import shutil
import tempfile
import time
import ctypes
from ctypes import wintypes
from typing import List, Dict, Set
import psutil

GENERIC_READ = ctypes.c_uint32(0x80000000).value
FILE_SHARE_READ = 0x00000001
FILE_SHARE_WRITE = 0x00000002
FILE_SHARE_DELETE = 0x00000004
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x80
TH32CS_SNAPPROCESS = 0x00000002

class PROCESSENTRY32(ctypes.Structure):
    _fields_ = [
        ('dwSize', wintypes.DWORD),
        ('cntUsage', wintypes.DWORD),
        ('th32ProcessID', wintypes.DWORD),
        ('th32DefaultHeapID', ctypes.c_void_p),
        ('th32ModuleID', wintypes.DWORD),
        ('cntThreads', wintypes.DWORD),
        ('th32ParentProcessID', wintypes.DWORD),
        ('pcPriClassBase', ctypes.c_long),
        ('dwFlags', wintypes.DWORD),
        ('szExeFile', ctypes.c_char * 260)
    ]

CreateToolhelp32Snapshot = ctypes.windll.kernel32.CreateToolhelp32Snapshot
CreateToolhelp32Snapshot.argtypes = [wintypes.DWORD, wintypes.DWORD]
CreateToolhelp32Snapshot.restype = wintypes.HANDLE

Process32First = ctypes.windll.kernel32.Process32First
Process32First.argtypes = [wintypes.HANDLE, ctypes.POINTER(PROCESSENTRY32)]
Process32First.restype = wintypes.BOOL

Process32Next = ctypes.windll.kernel32.Process32Next
Process32Next.argtypes = [wintypes.HANDLE, ctypes.POINTER(PROCESSENTRY32)]
Process32Next.restype = wintypes.BOOL

CreateFileW = ctypes.windll.kernel32.CreateFileW
CreateFileW.argtypes = [wintypes.LPCWSTR, ctypes.c_uint32, ctypes.c_uint32, wintypes.LPVOID, ctypes.c_uint32, ctypes.c_uint32, wintypes.HANDLE]
CreateFileW.restype = wintypes.HANDLE

GetFileSize = ctypes.windll.kernel32.GetFileSize
GetFileSize.argtypes = [wintypes.HANDLE, ctypes.POINTER(wintypes.DWORD)]
GetFileSize.restype = wintypes.DWORD

ReadFile = ctypes.windll.kernel32.ReadFile
ReadFile.argtypes = [wintypes.HANDLE, wintypes.LPVOID, wintypes.DWORD, ctypes.POINTER(wintypes.DWORD), wintypes.LPVOID]
ReadFile.restype = wintypes.BOOL

CloseHandle = ctypes.windll.kernel32.CloseHandle
CloseHandle.argtypes = [wintypes.HANDLE]
CloseHandle.restype = wintypes.BOOL

# Chromium epoch offset: microseconds between 1601-01-01 and 1970-01-01
CHROMIUM_EPOCH_OFFSET = 11644473600000000

# URLs to always filter out (internal browser pages, localhost, auth flows)
IGNORE_URL_PATTERNS = [
    'localhost:', '127.0.0.1', 'chrome://', 'brave://', 'edge://',
    'opera://', 'vivaldi://', 'about:', 'newtab', 'chrome-extension://',
    'accounts.google', 'signin', 'login', 'oauth', 'challenge/pwd',
    'callback', 'redirect', 'myaccount.google', 'consent.google',
]


def read_file_shared(path: str) -> bytes:
    """Read a file using Win32 shared handles to avoid locking conflicts with Chromium."""
    h = CreateFileW(path, GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE, None, OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, None)
    if h == -1 or h == 0:
        return b''
    try:
        size = GetFileSize(h, None)
        if size <= 0:
            return b''
        buf = ctypes.create_string_buffer(size)
        read = wintypes.DWORD()
        ReadFile(h, buf, size, ctypes.byref(read), None)
        return buf.raw[:read.value]
    finally:
        CloseHandle(h)


def align4(n: int) -> int:
    return (n + 3) & ~3


class BrowserTabDetector:
    """
    Detects currently open browser tabs across Chromium-based browsers.

    Strategy (in priority order):
      1. Try reading SNSS session files (Current Session / Tabs_ files) via
         Win32 non-locking shared file handles. If the live file is non-empty
         and yields valid tabs, use those.
      2. If SNSS fails (Chromium locks live files as 0-byte while running),
         fall back to querying the SQLite History database for pages with
         very recent last_visit_time AND an active visit (visit_duration > 0
         or last_visit_time within the last few minutes). This gives us
         tabs the user is currently looking at rather than historical visits.
    """

    def __init__(self):
        local_app_data = os.environ.get('LOCALAPPDATA', '')
        app_data = os.environ.get('APPDATA', '')

        self.browser_configs = [
            ('Brave', 'brave.exe', os.path.join(local_app_data, 'BraveSoftware', 'Brave-Browser', 'User Data')),
            ('Chrome', 'chrome.exe', os.path.join(local_app_data, 'Google', 'Chrome', 'User Data')),
            ('Edge', 'msedge.exe', os.path.join(local_app_data, 'Microsoft', 'Edge', 'User Data')),
            ('Opera', 'opera.exe', os.path.join(app_data, 'Opera Software', 'Opera Stable')),
            ('Opera GX', 'opera.exe', os.path.join(app_data, 'Opera Software', 'Opera GX Stable')),
            ('Vivaldi', 'vivaldi.exe', os.path.join(local_app_data, 'Vivaldi', 'User Data')),
        ]

    def _get_running_process_names(self) -> set:
        """Detect which browser executables are currently running using Win32 snapshot."""
        target_exes = {cfg[1].lower() for cfg in self.browser_configs}
        running = set()
        try:
            h = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
            if h != -1 and h != 0:
                pe = PROCESSENTRY32()
                pe.dwSize = ctypes.sizeof(PROCESSENTRY32)
                if Process32First(h, ctypes.byref(pe)):
                    while True:
                        exe = pe.szExeFile.decode('latin1', errors='ignore').lower()
                        if exe in target_exes:
                            running.add(exe)
                        if not Process32Next(h, ctypes.byref(pe)):
                            break
                CloseHandle(h)
                return running
        except Exception:
            pass

        try:
            for p in psutil.process_iter(['name']):
                n = p.info.get('name')
                if n and n.lower() in target_exes:
                    running.add(n.lower())
        except Exception:
            pass
        return running

    def _parse_snss_file(self, data: bytes) -> List[Dict[str, any]]:
        """Parse an SNSS binary session file and extract open tab URLs/titles."""
        if len(data) < 8 or data[:4] != b'SNSS':
            return []

        offset = 8
        tabs_in_window: Dict[int, int] = {}
        tab_order: Dict[int, int] = {}
        tabs_nav: Dict[int, Dict[int, Dict[str, str]]] = {}
        closed_tabs: Set[int] = set()

        while offset + 3 <= len(data):
            size, cmd_id = struct.unpack_from('<HB', data, offset)
            payload = data[offset + 3 : offset + 2 + size]

            if cmd_id == 0:
                if len(payload) >= 8:
                    wid, tid = struct.unpack_from('<ii', payload, 0)
                    tabs_in_window[tid] = wid
            elif cmd_id == 1:
                if len(payload) >= 4:
                    cid = struct.unpack_from('<i', payload, 0)[0]
                    closed_tabs.add(cid)
            elif cmd_id == 2:
                if len(payload) >= 8:
                    tid, idx = struct.unpack_from('<ii', payload, 0)
                    tab_order[tid] = idx
            elif cmd_id == 6:
                if len(payload) >= 20:
                    nav_id, tid, index = struct.unpack_from('<iii', payload, 0)
                    p = 12
                    url_len = struct.unpack_from('<i', payload, p)[0]
                    p += 4
                    if 0 < url_len < 4096 and p + url_len <= len(payload):
                        url = payload[p : p + url_len].decode('utf-8', errors='ignore')
                        p += align4(url_len)
                        if p + 4 <= len(payload):
                            title_chars = struct.unpack_from('<i', payload, p)[0]
                            p += 4
                            title_bytes_len = title_chars * 2
                            if 0 <= title_chars < 4096 and p + title_bytes_len <= len(payload):
                                title = payload[p : p + title_bytes_len].decode('utf-16le', errors='ignore')
                                if tid not in tabs_nav:
                                    tabs_nav[tid] = {}
                                tabs_nav[tid][index] = {'url': url, 'title': title}

            offset += 2 + size

        tabs_to_show = []
        candidate_tabs = [tid for tid in tabs_in_window if tid not in closed_tabs]
        if not candidate_tabs:
            candidate_tabs = [tid for tid in tabs_nav if tid not in closed_tabs]

        candidate_tabs.sort(key=lambda t: tab_order.get(t, 9999))

        for tid in candidate_tabs:
            navs = tabs_nav.get(tid, {})
            if not navs:
                continue
            last_nav = navs[max(navs.keys())]
            url = last_nav.get('url', '').strip()
            title = last_nav.get('title', '').strip()
            if not url or not title:
                continue

            wid = tabs_in_window.get(tid, 0)
            tabs_to_show.append({
                'tab_id': tid,
                'window_id': wid,
                'url': url,
                'title': title
            })

        return tabs_to_show

    def _get_active_tabs_from_history(self, bname: str, bdir: str,
                                      seen_urls: set, seen_titles: set) -> List[Dict[str, str]]:
        """
        Query the Chromium History SQLite database for CURRENTLY OPEN tabs.

        Key signal: Chromium's visits table has a visit_duration column.
        When a tab is still open, the most recent visit for that URL has
        visit_duration = 0 (the visit hasn't ended yet). When the user
        closes the tab or navigates away, Chromium writes the actual
        duration in microseconds. By filtering for visit_duration = 0
        with a recent visit_time, we get only tabs that are truly open
        right now.
        """
        active_tabs = []
        profiles = []
        try:
            for item in os.listdir(bdir):
                if item in ('Default', 'System Profile') or item.startswith('Profile '):
                    hpath = os.path.join(bdir, item, 'History')
                    if os.path.exists(hpath):
                        profiles.append(hpath)
            root_hp = os.path.join(bdir, 'History')
            if os.path.exists(root_hp) and root_hp not in profiles:
                profiles.append(root_hp)
        except Exception:
            return active_tabs

        now_epoch = time.time()
        now_chromium = int(now_epoch * 1000000) + CHROMIUM_EPOCH_OFFSET

        # Only consider visits from the last 4 hours (covers a full work session)
        recency_cutoff = now_chromium - (4 * 60 * 60 * 1000000)

        for hpath in profiles:
            tmp_db = None
            try:
                tmp_db = tempfile.mktemp(suffix='.db')
                shutil.copyfile(hpath, tmp_db)
                conn = sqlite3.connect(tmp_db)
                cur = conn.cursor()

                # Find URLs whose MOST RECENT visit has visit_duration = 0.
                # This means the tab is still open (Chromium hasn't recorded
                # an end time yet). We also require the visit to be recent
                # (within the last 4 hours) to avoid ancient stale entries.
                rows = cur.execute("""
                    SELECT u.title, u.url, v.visit_time, v.visit_duration
                    FROM visits v
                    JOIN urls u ON v.url = u.id
                    WHERE v.visit_time > ?
                      AND v.visit_duration = 0
                      AND u.title != ''
                    ORDER BY v.visit_time DESC
                """, (recency_cutoff,)).fetchall()

                # For each URL, only keep the entry if its LATEST visit
                # across ALL visits (not just duration=0 ones) also has
                # duration=0. This handles the case where a tab was opened,
                # closed, then the URL appears in an older duration=0 visit.
                url_latest_duration = {}
                all_recent = cur.execute("""
                    SELECT u.url, v.visit_duration
                    FROM visits v
                    JOIN urls u ON v.url = u.id
                    WHERE v.visit_time > ?
                    ORDER BY v.visit_time DESC
                """, (recency_cutoff,)).fetchall()

                for url_val, dur in all_recent:
                    url_stripped = url_val.strip()
                    if url_stripped not in url_latest_duration:
                        url_latest_duration[url_stripped] = dur

                for row in rows:
                    title = (row[0] or '').strip()
                    url = (row[1] or '').strip()

                    if not title or not url:
                        continue

                    # Only include if the ABSOLUTE latest visit for this URL
                    # also has duration=0 (confirming tab is still open)
                    latest_dur = url_latest_duration.get(url, -1)
                    if latest_dur != 0:
                        continue

                    # Filter out internal/auth URLs
                    url_lower = url.lower()
                    if any(ign in url_lower for ign in IGNORE_URL_PATTERNS):
                        continue

                    # Deduplicate by base URL (strip query params)
                    url_key = url.split('?')[0].rstrip('/')
                    if url_key in seen_urls or title.lower() in seen_titles:
                        continue

                    domain = url.split('/')[2] if len(url.split('/')) > 2 else ''
                    seen_urls.add(url_key)
                    seen_titles.add(title.lower())

                    active_tabs.append({
                        'id': f"{bname.lower()}_active_{len(active_tabs)}",
                        'title': title,
                        'url': url,
                        'browser': bname,
                        'favicon': f"https://www.google.com/s2/favicons?domain={domain}&sz=32"
                    })

                conn.close()
            except Exception:
                pass
            finally:
                if tmp_db and os.path.exists(tmp_db):
                    try:
                        os.remove(tmp_db)
                    except Exception:
                        pass

        return active_tabs

    def get_open_tabs(self) -> List[Dict[str, str]]:
        """
        Detect and return currently open browser tabs.

        For each running Chromium browser:
          1. Try SNSS session file parsing (most accurate when readable)
          2. If SNSS yields nothing (live files locked at 0 bytes), fall back
             to History database with a tight 30-minute recency window
        """
        running_names = self._get_running_process_names()
        all_tabs: List[Dict[str, str]] = []
        seen_urls = set()
        seen_titles = set()

        for bname, proc_exe, bdir in self.browser_configs:
            if proc_exe.lower() not in running_names:
                continue
            if not os.path.exists(bdir):
                continue

            # --- Phase 1: Try SNSS session files ---
            profiles = []
            try:
                for item in os.listdir(bdir):
                    if item in ('Default', 'System Profile') or item.startswith('Profile '):
                        sdir = os.path.join(bdir, item, 'Sessions')
                        if os.path.exists(sdir):
                            profiles.append((item, sdir))
                root_sdir = os.path.join(bdir, 'Sessions')
                if os.path.exists(root_sdir) and ('Default', root_sdir) not in profiles:
                    profiles.append(('Default', root_sdir))
            except Exception:
                continue

            browser_tabs_found = False

            for prof, sdir in profiles:
                try:
                    session_files = []
                    for f in os.listdir(sdir):
                        # Only read Tabs_ files (current tab state), skip
                        # Session_ files (previous session restore data)
                        if f.startswith('Tabs_') and not f.endswith('-journal'):
                            fp = os.path.join(sdir, f)
                            try:
                                fsize = os.path.getsize(fp)
                                mtime = os.path.getmtime(fp)
                                # Skip 0-byte files (Chromium holds live
                                # file locked; 0 bytes means unreadable)
                                if fsize > 0:
                                    session_files.append((fp, mtime))
                            except Exception:
                                pass

                    # Sort by modification time, newest first
                    session_files.sort(key=lambda x: x[1], reverse=True)

                    # Only read the MOST RECENT non-empty Tabs_ file.
                    # Older Tabs_ files contain previous session data.
                    if session_files:
                        sfile = session_files[0][0]
                        sfile_mtime = session_files[0][1]

                        # If the most recent Tabs_ file is older than 30
                        # minutes, it is stale (from a previous session
                        # before the browser restarted). Skip it.
                        age_minutes = (time.time() - sfile_mtime) / 60.0
                        if age_minutes > 30:
                            continue

                        data = read_file_shared(sfile)
                        if data:
                            parsed = self._parse_snss_file(data)
                            for item in parsed:
                                clean_url = item['url']
                                clean_title = item['title']

                                url_lower = clean_url.lower()
                                if any(ign in url_lower for ign in IGNORE_URL_PATTERNS):
                                    continue

                                url_key = clean_url.split('?')[0].rstrip('/')
                                if url_key in seen_urls or clean_title.lower() in seen_titles:
                                    continue

                                domain = clean_url.split('/')[2] if len(clean_url.split('/')) > 2 else ''
                                seen_urls.add(url_key)
                                seen_titles.add(clean_title.lower())

                                all_tabs.append({
                                    'id': f"{bname.lower()}_{item['window_id']}_{item['tab_id']}",
                                    'title': clean_title,
                                    'url': clean_url,
                                    'browser': bname,
                                    'favicon': f"https://www.google.com/s2/favicons?domain={domain}&sz=32"
                                })
                                browser_tabs_found = True

                except Exception:
                    pass

            # --- Phase 2: History fallback (only if SNSS found nothing) ---
            if not browser_tabs_found:
                hist_tabs = self._get_active_tabs_from_history(
                    bname, bdir, seen_urls, seen_titles
                )
                all_tabs.extend(hist_tabs)

        return all_tabs