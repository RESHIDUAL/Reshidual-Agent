import os
import struct
import sqlite3
import shutil
import tempfile
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

def read_file_shared(path: str) -> bytes:
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

    def _fallback_history_scan(self, bname: str, bdir: str, seen_urls: set, seen_titles: set) -> List[Dict[str, str]]:
        fallback_tabs = []
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
            return fallback_tabs

        for hpath in profiles:
            tmp_db = None
            try:
                tmp_db = tempfile.mktemp(suffix='.db')
                shutil.copyfile(hpath, tmp_db)
                conn = sqlite3.connect(tmp_db)
                cur = conn.cursor()
                rows = cur.execute("""
                    SELECT u.title, u.url, v.visit_time
                    FROM visits v
                    JOIN urls u ON v.url = u.id
                    WHERE u.title != ''
                    ORDER BY v.visit_time DESC
                    LIMIT 40
                """).fetchall()

                import time
                now_epoch = time.time()

                for row in rows:
                    title = row[0]
                    url = row[1]
                    vt = row[2]

                    if vt:
                        try:
                            epoch_time = (vt - 11644473600000000) / 1000000.0
                            age_hours = (now_epoch - epoch_time) / 3600.0
                            if age_hours > 8.0:
                                continue
                        except Exception:
                            pass

                    clean_title = title.strip()
                    clean_url = url.strip()
                    if not clean_title or not clean_url:
                        continue
                    if any(ign in clean_url.lower() for ign in [
                        'localhost:', '127.0.0.1', 'chrome://', 'brave://', 'edge://', 'opera://', 
                        'about:', 'newtab', 'accounts.google', 'signin', 'login', 'oauth', 
                        'challenge/pwd', 'callback', 'redirect'
                    ]):
                        continue
                    url_key = clean_url.split('?')[0].rstrip('/')
                    if url_key in seen_urls or clean_title.lower() in seen_titles:
                        continue
                    domain = clean_url.split('/')[2] if len(clean_url.split('/')) > 2 else ''
                    seen_urls.add(url_key)
                    seen_titles.add(clean_title.lower())
                    fallback_tabs.append({
                        'id': f"{bname.lower()}_hist_{len(fallback_tabs)}",
                        'title': clean_title,
                        'url': clean_url,
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
        return fallback_tabs

    def get_open_tabs(self) -> List[Dict[str, str]]:
        running_names = self._get_running_process_names()
        all_tabs: List[Dict[str, str]] = []
        seen_urls = set()
        seen_titles = set()

        for bname, proc_exe, bdir in self.browser_configs:
            if proc_exe.lower() not in running_names:
                continue
            if not os.path.exists(bdir):
                continue

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
                        if (f.startswith('Session_') or f.startswith('Tabs_')) and not f.endswith('-journal'):
                            fp = os.path.join(sdir, f)
                            try:
                                mtime = os.path.getmtime(fp)
                                session_files.append((fp, mtime))
                            except Exception:
                                pass
                    session_files.sort(key=lambda x: x[1], reverse=True)

                    for sfile, _ in session_files:
                        data = read_file_shared(sfile)
                        if not data:
                            continue
                        parsed = self._parse_snss_file(data)
                        if not parsed:
                            continue

                        for item in parsed:
                            clean_url = item['url']
                            clean_title = item['title']

                            if any(ign in clean_url.lower() for ign in [
                                'localhost:3000',
                                'localhost:8420',
                                '127.0.0.1',
                                'chrome://',
                                'brave://',
                                'edge://',
                                'opera://',
                                'about:',
                                'newtab'
                            ]):
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

                        if parsed:
                            break
                except Exception:
                    pass

            hist_tabs = self._fallback_history_scan(bname, bdir, seen_urls, seen_titles)
            all_tabs.extend(hist_tabs)

        return all_tabs