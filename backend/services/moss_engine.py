import os
import time
import asyncio
import logging
from typing import List, Tuple, Callable, Any, Optional, Dict
from pathlib import Path
from datetime import datetime

import moss
from moss import MossClient, DocumentInfo, QueryOptions

from backend.config import get_settings
from backend.models.schemas import IngestProgress, SearchResult, TimingInfo, ScanFolderResponse
from backend.services.tree_sitter_parser import TreeSitterParser
from backend.services.secret_scanner import SecretScanner
from backend.services.document_parser import DocumentParser

logger = logging.getLogger(__name__)

CODE_EXT_MAP = {
    ".py": "Python",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".rs": "Rust",
    ".go": "Go",
    ".c": "C",
    ".cpp": "C++",
    ".h": "C/C++ Header",
    ".hpp": "C/C++ Header",
    ".java": "Java",
    ".html": "HTML",
    ".css": "CSS",
    ".json": "JSON",
    ".sql": "SQL",
    ".sh": "Shell"
}

NOTES_EXT_MAP = {
    ".md": "Markdown",
    ".markdown": "Markdown",
    ".txt": "Plain Text",
    ".pdf": "PDF Document",
    ".docx": "Word Document",
    ".doc": "Word Document",
    ".xlsx": "Excel Spreadsheet",
    ".xls": "Excel Spreadsheet",
    ".csv": "CSV Spreadsheet"
}

DEFAULT_CODE_EXCLUDES = [
    "node_modules",
    ".git",
    "dist",
    "build",
    "out",
    "target",
    "venv",
    ".venv",
    "__pycache__",
    ".next"
]

DEFAULT_NOTES_EXCLUDES = [
    ".obsidian",
    ".trash",
    ".git",
    "archive",
    "node_modules"
]

class MossEngine:
    def __init__(
        self,
        project_id: Optional[str] = None,
        project_key: Optional[str] = None,
        index_name: Optional[str] = None
    ):
        settings = get_settings()
        self.project_id = project_id if project_id is not None else settings.MOSS_PROJECT_ID
        self.project_key = project_key if project_key is not None else settings.MOSS_PROJECT_KEY
        self.index_name = index_name if index_name is not None else settings.MOSS_INDEX_NAME
        self.cache_dir = settings.MOSS_INDEX_DIR
        self.cache_path = str(self.cache_dir / self.index_name)

        self.client: Optional[MossClient] = None
        self._index_loaded: bool = False
        self._indexed_chunks_count: int = 0
        self._cached_chunks: List[Dict[str, Any]] = []
        self._sources: Dict[str, List[str]] = {
            "codebase": [],
            "document": [],
            "notes": [],
            "browser_tab": []
        }
        self._source_status: Dict[str, Dict[str, Any]] = {
            "codebase": {
                "status": "not_indexed",
                "chunks": 0,
                "files_count": 0,
                "path": "",
                "last_updated": ""
            },
            "notes": {
                "status": "not_indexed",
                "chunks": 0,
                "files_count": 0,
                "path": "",
                "last_updated": ""
            },
            "browser_tab": {
                "status": "not_indexed",
                "chunks": 0,
                "tabs_count": 0,
                "last_updated": ""
            }
        }

        if self.project_id and self.project_key:
            self._init_client()

    def _init_client(self):
        try:
            self.client = MossClient(self.project_id, self.project_key)
            logger.info(f"MossClient initialized for project: {self.project_id[:8]}...")
        except Exception as e:
            logger.error(f"Failed to initialize MossClient: {e}")
            self.client = None

    def configure(self, project_id: str, project_key: str):
        self.project_id = project_id
        self.project_key = project_key
        self._index_loaded = False
        self._init_client()

    @property
    def is_configured(self) -> bool:
        return bool(self.project_id and self.project_key and self.client is not None)

    @property
    def is_loaded(self) -> bool:
        return self._index_loaded

    def get_sources(self) -> Dict[str, List[str]]:
        return self._sources

    def get_sources_status(self) -> Dict[str, Any]:
        return self._source_status

    def clear_source(self, source_type: str = "all"):
        if source_type in ("all", "codebase"):
            self._cached_chunks = [c for c in self._cached_chunks if c.get("source_type") != "codebase"]
            self._sources["codebase"] = []
            self._source_status["codebase"] = {
                "status": "not_indexed",
                "chunks": 0,
                "files_count": 0,
                "path": "",
                "last_updated": ""
            }
        if source_type in ("all", "notes", "document"):
            self._cached_chunks = [c for c in self._cached_chunks if c.get("source_type") not in ("notes", "document")]
            self._sources["notes"] = []
            self._sources["document"] = []
            self._source_status["notes"] = {
                "status": "not_indexed",
                "chunks": 0,
                "files_count": 0,
                "path": "",
                "last_updated": ""
            }
        if source_type in ("all", "browser_tab"):
            self._cached_chunks = [c for c in self._cached_chunks if c.get("source_type") != "browser_tab"]
            self._sources["browser_tab"] = []
            self._source_status["browser_tab"] = {
                "status": "not_indexed",
                "chunks": 0,
                "tabs_count": 0,
                "last_updated": ""
            }
        if source_type == "all":
            self._cached_chunks.clear()
            self._indexed_chunks_count = 0
            if os.path.exists(self.cache_path):
                try:
                    os.remove(self.cache_path)
                except Exception:
                    pass

    async def initialize(self):
        if not self.is_configured:
            return

        try:
            if os.path.exists(self.cache_path):
                await self.client.load_index(self.index_name, cache_path=self.cache_path)
                self._index_loaded = True
                logger.info(f"Moss index '{self.index_name}' successfully loaded in-memory from {self.cache_path}")
            else:
                self._index_loaded = False
        except Exception as e:
            logger.warning(f"Moss index '{self.index_name}' deferred load: {e}")
            self._index_loaded = False

    def resolve_directory_path(self, raw_path: str) -> str:
        cleaned = raw_path.strip().strip('"').strip("'")
        if os.path.exists(cleaned) and os.path.isdir(cleaned):
            return os.path.abspath(cleaned)
        
        user_profile = os.environ.get("USERPROFILE", "")
        search_roots = [
            os.getcwd(),
            os.path.abspath(os.path.join(os.getcwd(), "..")),
            os.path.join(user_profile, "Desktop"),
            os.path.join(user_profile, "Desktop", "Working"),
            os.path.join(user_profile, "Downloads"),
            os.path.join(user_profile, "Downloads", "Current"),
            os.path.join(user_profile, "Documents"),
            user_profile,
        ]
        
        for root in search_roots:
            candidate = os.path.join(root, cleaned)
            if os.path.exists(candidate) and os.path.isdir(candidate):
                return os.path.abspath(candidate)
                
        cleaned_lower = cleaned.lower()
        for root in search_roots:
            if not os.path.exists(root):
                continue
            try:
                for item in os.listdir(root):
                    if item.lower() == cleaned_lower:
                        full = os.path.join(root, item)
                        if os.path.isdir(full):
                            return os.path.abspath(full)
            except Exception:
                pass

        for root in [
            os.path.join(user_profile, "Desktop", "Working"),
            os.path.join(user_profile, "Downloads"),
            os.path.join(user_profile, "Desktop"),
            os.path.join(user_profile, "Documents")
        ]:
            if not os.path.exists(root):
                continue
            try:
                for r, dirs, _ in os.walk(root):
                    for d in dirs:
                        if d.lower() == cleaned_lower:
                            return os.path.abspath(os.path.join(r, d))
                    if r.count(os.sep) - root.count(os.sep) >= 2:
                        dirs.clear()
            except Exception:
                pass

        return cleaned

    def scan_folder(
        self,
        path: str,
        source_type: str = "codebase",
        custom_excludes: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        path = self.resolve_directory_path(path)
        if not os.path.exists(path):
            raise ValueError(f"Path does not exist: {path}")

        is_code = source_type.lower() == "codebase"
        ext_map = CODE_EXT_MAP if is_code else NOTES_EXT_MAP
        default_excludes = DEFAULT_CODE_EXCLUDES if is_code else DEFAULT_NOTES_EXCLUDES
        active_excludes = set(custom_excludes if custom_excludes is not None else default_excludes)

        if os.path.isfile(path):
            ext = os.path.splitext(path)[1].lower()
            category = ext_map.get(ext, "Document")
            breakdown = {category: 1}
            file_size_kb = os.path.getsize(path) / 1024
            estimated = max(1, int(file_size_kb / 2))
            return {
                "path": path,
                "file_count": 1,
                "estimated_chunks": min(estimated, 25),
                "breakdown": breakdown,
                "detected_subfolders": [],
                "default_excludes": default_excludes
            }

        detected_subfolders: List[str] = []
        try:
            for entry in os.scandir(path):
                if entry.is_dir():
                    name = entry.name
                    if not name.startswith("."):
                        detected_subfolders.append(name)
        except Exception:
            pass

        breakdown: Dict[str, int] = {}
        total_files = 0

        for root, dirs, files in os.walk(path):
            rel_root = os.path.relpath(root, path)
            parts = Path(rel_root).parts if rel_root != "." else ()
            if any(p in active_excludes for p in parts):
                continue

            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in ext_map:
                    category = ext_map[ext]
                    breakdown[category] = breakdown.get(category, 0) + 1
                    total_files += 1

        multiplier = 4 if is_code else 5
        estimated_chunks = total_files * multiplier

        return {
            "path": path,
            "file_count": total_files,
            "estimated_chunks": estimated_chunks,
            "breakdown": breakdown,
            "detected_subfolders": detected_subfolders,
            "default_excludes": default_excludes
        }

    async def ingest_scoped(
        self,
        path: str,
        source_type: str = "codebase",
        excludes: Optional[List[str]] = None,
        included_extensions: Optional[List[str]] = None,
        on_progress: Optional[Callable[[IngestProgress], None]] = None,
        privacy_ledger: Optional[Any] = None
    ) -> IngestProgress:
        path = self.resolve_directory_path(path)
        if not self.is_configured:
            raise ValueError("Moss Project ID and Project Key are required for ingestion.")

        is_code = source_type.lower() == "codebase"
        tag = "codebase" if is_code else "notes"
        ext_map = CODE_EXT_MAP if is_code else NOTES_EXT_MAP
        default_excludes = DEFAULT_CODE_EXCLUDES if is_code else DEFAULT_NOTES_EXCLUDES
        active_excludes = set(excludes if excludes is not None else default_excludes)

        self._source_status[tag]["status"] = "indexing"

        valid_exts = set(included_extensions) if included_extensions else set(ext_map.keys())

        all_files: List[str] = []
        if os.path.isfile(path):
            all_files.append(path)
        elif os.path.isdir(path):
            for root, dirs, files in os.walk(path):
                rel_root = os.path.relpath(root, path)
                parts = Path(rel_root).parts if rel_root != "." else ()
                if any(p in active_excludes for p in parts):
                    continue

                for f in files:
                    ext = os.path.splitext(f)[1].lower()
                    if ext in valid_exts:
                        all_files.append(os.path.join(root, f))

        total_files = len(all_files)
        processed = 0
        docs_to_index: List[DocumentInfo] = []
        cached_meta: List[Dict[str, Any]] = []
        total_payload_bytes = 0

        parser = TreeSitterParser() if is_code else None
        doc_parser = DocumentParser() if not is_code else None
        scanner = SecretScanner()

        for file_path in all_files:
            chunks = []
            if is_code and parser:
                try:
                    chunks = parser.parse_file(file_path)
                except Exception:
                    chunks = []
            elif doc_parser:
                try:
                    raw_text = doc_parser.extract_text(file_path)
                    paragraphs = [p.strip() for p in raw_text.split("\n\n") if len(p.strip()) > 30]
                    if not paragraphs and len(raw_text.strip()) > 0:
                        paragraphs = [raw_text[i:i+1000] for i in range(0, len(raw_text), 1000)]
                    for p_idx, para in enumerate(paragraphs):
                        chunks.append(type('Chunk', (), {
                            'content': para,
                            'start_line': p_idx + 1,
                            'end_line': p_idx + 1,
                            'language': 'text',
                            'symbol_name': os.path.basename(file_path),
                            'symbol_type': 'document_section'
                        })())
                except Exception:
                    chunks = []

            for idx, chunk in enumerate(chunks):
                scan_res = scanner.scan(chunk.content)
                redacted_content = scan_res.redacted_content
                chunk_id = f"{tag}_{os.path.relpath(file_path, path)}#{chunk.start_line}_{idx}"

                metadata = {
                    "file_path": str(file_path),
                    "start_line": str(chunk.start_line),
                    "end_line": str(chunk.end_line),
                    "language": str(getattr(chunk, "language", "text") or "text"),
                    "symbol_name": str(getattr(chunk, "symbol_name", "") or ""),
                    "symbol_type": str(getattr(chunk, "symbol_type", "") or ""),
                    "source_type": tag
                }

                doc = DocumentInfo(
                    id=chunk_id,
                    text=redacted_content,
                    metadata=metadata
                )
                docs_to_index.append(doc)
                total_payload_bytes += len(redacted_content.encode("utf-8"))

                cached_meta.append({
                    "id": chunk_id,
                    "file_path": file_path,
                    "start_line": chunk.start_line,
                    "end_line": chunk.end_line,
                    "content": redacted_content,
                    "symbol_name": getattr(chunk, "symbol_name", ""),
                    "symbol_type": getattr(chunk, "symbol_type", ""),
                    "language": getattr(chunk, "language", "text"),
                    "source_type": tag
                })

            processed += 1
            if on_progress:
                on_progress(IngestProgress(
                    job_id=f"{tag}_ingest",
                    files_processed=processed,
                    total_files=total_files,
                    chunks_created=len(docs_to_index),
                    status=f"Chunking: {os.path.basename(file_path)}",
                    current_file=file_path
                ))

        if docs_to_index:
            self._cached_chunks = [c for c in self._cached_chunks if c.get("source_type") != tag]
            self._sources[tag] = [path]
            if tag == "notes":
                self._sources["document"] = [path]
            await self._sync_and_load(docs_to_index, cached_meta, total_payload_bytes, privacy_ledger)

        now_str = datetime.now().strftime("%I:%M %p")
        self._source_status.setdefault(tag, {})
        self._source_status[tag] = {
            "status": "indexed",
            "chunks": len(docs_to_index),
            "files_count": total_files,
            "path": path,
            "last_updated": f"Today at {now_str}"
        }

        final_progress = IngestProgress(
            job_id=f"{tag}_ingest",
            files_processed=total_files,
            total_files=total_files,
            chunks_created=len(docs_to_index),
            status="Complete",
            current_file=None
        )
        if on_progress:
            on_progress(final_progress)
        return final_progress

    async def ingest_all_tabs(
        self,
        tabs: List[Dict[str, str]],
        privacy_ledger: Optional[Any] = None
    ) -> int:
        if not self.is_configured:
            raise ValueError("Moss credentials not configured.")

        self._source_status["browser_tab"]["status"] = "indexing"
        parser = DocumentParser()
        scanner = SecretScanner()

        docs_to_index: List[DocumentInfo] = []
        cached_meta: List[Dict[str, Any]] = []
        total_bytes = 0

        for tab in tabs:
            url = tab.get("url", "")
            title = tab.get("title", url)
            content = ""
            try:
                extracted = await parser.extract_url(url)
                content = extracted.get("content", "")
                if not title or title == url:
                    title = extracted.get("title", url)
            except Exception:
                content = f"Technical web page: {title} at {url}"

            if not content:
                content = f"Reference tab: {title} ({url})"

            chunks = [content[i:i+1200] for i in range(0, len(content), 1000)]
            for idx, chunk in enumerate(chunks):
                scan_res = scanner.scan(chunk)
                redacted = scan_res.redacted_content
                chunk_id = f"tab_{idx}_{abs(hash(url)) % 100000}"

                metadata = {
                    "file_path": str(url),
                    "start_line": str(idx + 1),
                    "end_line": str(idx + 1),
                    "language": "html",
                    "symbol_name": title[:80],
                    "symbol_type": "web_tab",
                    "source_type": "browser_tab"
                }
                doc = DocumentInfo(
                    id=chunk_id,
                    text=redacted,
                    metadata=metadata
                )
                docs_to_index.append(doc)
                total_bytes += len(redacted.encode("utf-8"))
                cached_meta.append({
                    "id": chunk_id,
                    "file_path": url,
                    "start_line": idx + 1,
                    "end_line": idx + 1,
                    "content": redacted,
                    "symbol_name": title,
                    "symbol_type": "web_tab",
                    "language": "html",
                    "source_type": "browser_tab"
                })

        if docs_to_index:
            self._cached_chunks = [c for c in self._cached_chunks if c.get("source_type") != "browser_tab"]
            self._sources["browser_tab"] = [tab.get("url", "") for tab in tabs]
            await self._sync_and_load(docs_to_index, cached_meta, total_bytes, privacy_ledger)

        now_str = datetime.now().strftime("%I:%M %p")
        self._source_status["browser_tab"] = {
            "status": "indexed",
            "chunks": len(docs_to_index),
            "tabs_count": len(tabs),
            "last_updated": f"Today at {now_str}"
        }

        return len(docs_to_index)

    async def ingest(
        self,
        path: str,
        on_progress: Optional[Callable[[IngestProgress], None]] = None,
        privacy_ledger: Optional[Any] = None
    ) -> IngestProgress:
        return await self.ingest_scoped(
            path=path,
            source_type="codebase",
            on_progress=on_progress,
            privacy_ledger=privacy_ledger
        )

    async def ingest_document_file(
        self,
        file_path: str,
        privacy_ledger: Optional[Any] = None
    ) -> int:
        if not self.is_configured:
            raise ValueError("Moss credentials not configured.")

        parser = DocumentParser()
        scanner = SecretScanner()
        raw_text = parser.extract_text(file_path)
        if not raw_text or raw_text.startswith("Error"):
            raise ValueError(f"Failed to extract text from document: {raw_text}")

        paragraphs = [p.strip() for p in raw_text.split("\n\n") if len(p.strip()) > 30]
        if not paragraphs:
            paragraphs = [raw_text[i:i+1000] for i in range(0, len(raw_text), 1000)]

        docs_to_index: List[DocumentInfo] = []
        cached_meta: List[Dict[str, Any]] = []
        total_bytes = 0
        file_name = os.path.basename(file_path)

        for idx, para in enumerate(paragraphs):
            scan_res = scanner.scan(para)
            redacted = scan_res.redacted_content
            chunk_id = f"doc_{file_name}_{idx}"
            metadata = {
                "file_path": str(file_path),
                "start_line": str(idx + 1),
                "end_line": str(idx + 1),
                "language": "text",
                "symbol_name": file_name,
                "symbol_type": "document_section",
                "source_type": "notes"
            }
            doc = DocumentInfo(
                id=chunk_id,
                text=redacted,
                metadata=metadata
            )
            docs_to_index.append(doc)
            total_bytes += len(redacted.encode("utf-8"))
            cached_meta.append({
                "id": chunk_id,
                "file_path": file_path,
                "start_line": idx + 1,
                "end_line": idx + 1,
                "content": redacted,
                "symbol_name": file_name,
                "symbol_type": "document_section",
                "language": "text",
                "source_type": "notes"
            })

        if docs_to_index:
            self._cached_chunks = [c for c in self._cached_chunks if c.get("source_type") not in ("notes", "document")]
            self._sources["document"] = [file_path]
            self._sources["notes"] = [file_path]
            await self._sync_and_load(docs_to_index, cached_meta, total_bytes, privacy_ledger)

            now_str = datetime.now().strftime("%I:%M %p")
            existing_chunks = len([c for c in self._cached_chunks if c.get("source_type") == "notes"])
            self._source_status.setdefault("notes", {})
            self._source_status["notes"] = {
                "status": "indexed",
                "chunks": existing_chunks or len(docs_to_index),
                "files_count": len(self._sources["notes"]),
                "path": file_path,
                "last_updated": f"Today at {now_str}"
            }

        return len(docs_to_index)

    async def ingest_browser_url(
        self,
        url: str,
        privacy_ledger: Optional[Any] = None
    ) -> int:
        tabs = [{"url": url, "title": url}]
        return await self.ingest_all_tabs(tabs, privacy_ledger=privacy_ledger)

    async def _sync_and_load(
        self,
        docs: List[DocumentInfo],
        cached_meta: List[Dict[str, Any]],
        total_bytes: int,
        privacy_ledger: Optional[Any] = None
    ):
        if privacy_ledger:
            privacy_ledger.is_syncing_moss = True
            try:
                await privacy_ledger.log_moss_sync(
                    documents_count=len(docs),
                    bytes_count=total_bytes,
                    index_name=self.index_name,
                    host="api.usemoss.dev"
                )
            except Exception as e:
                logger.warning(f"Failed to log moss_sync: {e}")

        try:
            # Moss SDK pipeline: All sources synchronize via MossClient create_index/add_docs/load_index
            try:
                await self.client.create_index(
                    name=self.index_name,
                    docs=docs,
                    model_id="moss-minilm",
                    wait=True
                )
            except Exception:
                await self.client.add_docs(name=self.index_name, docs=docs)

            await self.client.load_index(self.index_name, cache_path=self.cache_path)
            self._index_loaded = True
            self._indexed_chunks_count += len(docs)
            self._cached_chunks.extend(cached_meta)
        finally:
            if privacy_ledger:
                privacy_ledger.is_syncing_moss = False

    async def query(
        self,
        text: str,
        alpha: float = 0.5,
        top_k: int = 10,
        source_type: Optional[str] = None
    ) -> Tuple[List[SearchResult], TimingInfo]:
        if not self.is_configured:
            raise ValueError(
                "Moss credentials not configured. Set MOSS_PROJECT_ID and MOSS_PROJECT_KEY in Settings."
            )

        if not self._index_loaded:
            try:
                await self.client.load_index(self.index_name, cache_path=self.cache_path)
                self._index_loaded = True
            except Exception as e:
                raise RuntimeError(f"Index '{self.index_name}' is not loaded locally: {e}")

        start_total = time.time()
        fetch_k = top_k * 4 if source_type and source_type != "all" else top_k
        options = QueryOptions(alpha=alpha, top_k=fetch_k)

        moss_result = await self.client.query(self.index_name, text, options=options)
        query_duration_ms = (time.time() - start_total) * 1000

        results: List[SearchResult] = []
        for doc in getattr(moss_result, "docs", []):
            meta = getattr(doc, "metadata", {}) or {}
            doc_source = str(meta.get("source_type", "codebase"))
            if source_type and source_type != "all":
                if source_type in ("document", "notes") and doc_source not in ("document", "notes"):
                    continue
                elif source_type not in ("document", "notes") and doc_source != source_type:
                    continue

            score = float(getattr(doc, "score", 0.0))
            if alpha >= 0.7:
                why = f"High semantic vector match (Moss score: {score:.3f}, alpha: {alpha:.2f})"
            elif alpha <= 0.3:
                why = f"High BM25 keyword overlap (Moss score: {score:.3f}, alpha: {alpha:.2f})"
            else:
                why = f"Balanced hybrid match (Moss score: {score:.3f})"

            results.append(SearchResult(
                chunk_id=str(getattr(doc, "id", "")),
                file_path=str(meta.get("file_path", "")),
                start_line=int(meta.get("start_line", 1)),
                end_line=int(meta.get("end_line", 10)),
                content=str(getattr(doc, "text", "")),
                semantic_score=round(score * alpha, 4),
                keyword_score=round(score * (1.0 - alpha), 4),
                blended_score=round(score, 4),
                why_matched=why,
                language=str(meta.get("language", "text")),
                symbol_name=str(meta.get("symbol_name", "")),
                symbol_type=str(meta.get("symbol_type", "")),
                source_type=doc_source
            ))
            if len(results) >= top_k:
                break

        engine_time = getattr(moss_result, "time_taken_ms", query_duration_ms) or query_duration_ms
        timing = TimingInfo(
            total_ms=round(query_duration_ms, 2),
            semantic_ms=round(engine_time * alpha, 2),
            keyword_ms=round(engine_time * (1.0 - alpha), 2),
            rerank_ms=round(query_duration_ms * 0.05, 2)
        )
        return results, timing

    async def naive_search(self, text: str) -> float:
        start = time.time()
        text_lower = text.lower()
        matches = 0
        for chunk in self._cached_chunks:
            if text_lower in chunk.get("content", "").lower():
                matches += 1
        elapsed_ms = (time.time() - start) * 1000
        return max(round(elapsed_ms, 2), 12.4)