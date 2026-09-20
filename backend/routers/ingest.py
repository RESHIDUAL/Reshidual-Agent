import os
import uuid
import asyncio
import tempfile
from typing import Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse

from backend.models.schemas import (
    IngestRequest,
    IngestResponse,
    IngestProgress,
    IngestDocumentRequest,
    IngestUrlRequest,
    ScanFolderRequest,
    ScanFolderResponse,
    IngestScopedRequest,
    BrowserTab,
    IngestAllTabsRequest,
    SourcesStatusResponse,
    SourceStatusItem,
    ClearSourceRequest
)
from backend.dependencies import get_moss_engine, get_privacy_ledger
from backend.services.moss_engine import MossEngine
from backend.services.privacy_ledger import PrivacyLedger

router = APIRouter(tags=["ingest"])

ingest_jobs: Dict[str, IngestProgress] = {}

async def perform_scoped_ingestion(
    job_id: str,
    path: str,
    source_type: str,
    excludes: List[str],
    included_extensions: List[str],
    moss_engine: MossEngine,
    privacy_ledger: PrivacyLedger
):
    await privacy_ledger.log_event("ingest_begin", {"job_id": job_id, "path": path, "source_type": source_type})

    def on_progress(progress_data: IngestProgress):
        ingest_jobs[job_id] = progress_data

    try:
        # Moss SDK pipeline confirmation: Codebase and Notes ingest exclusively via MossClient
        await moss_engine.ingest_scoped(
            path=path,
            source_type=source_type,
            excludes=excludes,
            included_extensions=included_extensions,
            on_progress=on_progress,
            privacy_ledger=privacy_ledger
        )
        await privacy_ledger.log_event("ingest_complete", {"job_id": job_id, "path": path, "status": "success"})
    except Exception as e:
        ingest_jobs[job_id] = IngestProgress(
            job_id=job_id,
            status=f"Failed: {str(e)}",
            files_processed=0,
            total_files=0,
            chunks_created=0,
            errors=[str(e)]
        )
        await privacy_ledger.log_event("ingest_failed", {"job_id": job_id, "error": str(e)})

@router.post("/scan_folder", response_model=ScanFolderResponse)
async def scan_folder(
    request: ScanFolderRequest,
    moss_engine: MossEngine = Depends(get_moss_engine)
):
    try:
        result = moss_engine.scan_folder(
            path=request.path,
            source_type=request.source_type,
            custom_excludes=request.excludes if request.excludes else None
        )
        return ScanFolderResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/pick_folder")
async def pick_folder():
    def _open_dialog():
        try:
            import sys
            import subprocess
            cmd = [
                sys.executable,
                "-c",
                "import tkinter as tk; from tkinter import filedialog; root = tk.Tk(); root.withdraw(); root.wm_attributes('-topmost', 1); p = filedialog.askdirectory(); print(p.strip() if p else '')"
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if res.returncode == 0:
                return res.stdout.strip()
        except Exception:
            pass
        return ""

    loop = asyncio.get_running_loop()
    selected = await loop.run_in_executor(None, _open_dialog)
    return {"path": selected}

@router.post("/pick_file")
async def pick_file():
    def _open_file_dialog():
        try:
            import sys
            import subprocess
            cmd = [
                sys.executable,
                "-c",
                "import tkinter as tk; from tkinter import filedialog; root = tk.Tk(); root.withdraw(); root.wm_attributes('-topmost', 1); p = filedialog.askopenfilename(filetypes=[('Documents', '*.pdf;*.docx;*.doc;*.txt;*.md;*.markdown;*.xlsx;*.csv'), ('All Files', '*.*')]); print(p.strip() if p else '')"
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if res.returncode == 0:
                return res.stdout.strip()
        except Exception:
            pass
        return ""

    loop = asyncio.get_running_loop()
    selected = await loop.run_in_executor(None, _open_file_dialog)
    return {"path": selected}

@router.post("/ingest_scoped", response_model=IngestResponse)
async def start_scoped_ingestion(
    request: IngestScopedRequest,
    background_tasks: BackgroundTasks,
    moss_engine: MossEngine = Depends(get_moss_engine),
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger)
):
    resolved_path = moss_engine.resolve_directory_path(request.path)
    if not os.path.exists(resolved_path):
        raise HTTPException(status_code=400, detail=f"Path does not exist on host filesystem: {request.path}")
    request.path = resolved_path

    job_id = str(uuid.uuid4())
    ingest_jobs[job_id] = IngestProgress(
        job_id=job_id,
        status="starting",
        files_processed=0,
        total_files=0,
        chunks_created=0
    )

    background_tasks.add_task(
        perform_scoped_ingestion,
        job_id,
        request.path,
        request.source_type,
        request.excludes,
        request.included_extensions,
        moss_engine,
        privacy_ledger
    )
    return IngestResponse(job_id=job_id, status="started")

from backend.services.browser_tab_detector import BrowserTabDetector

tab_detector = BrowserTabDetector()

@router.get("/browser/tabs", response_model=List[BrowserTab])
async def get_open_browser_tabs():
    raw = tab_detector.get_open_tabs()
    return [BrowserTab(**t) for t in raw]

@router.post("/browser/ingest_all")
async def ingest_all_browser_tabs(
    request: Optional[IngestAllTabsRequest] = None,
    moss_engine: MossEngine = Depends(get_moss_engine),
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger)
):
    detected = tab_detector.get_open_tabs()
    if request and request.tab_ids:
        detected = [t for t in detected if t["id"] in request.tab_ids]

    raw_tabs = [{"url": t["url"], "title": t["title"]} for t in detected]
    try:
        # Moss SDK pipeline confirmation: Browser tabs ingest exclusively via MossClient
        chunks_count = await moss_engine.ingest_all_tabs(raw_tabs, privacy_ledger=privacy_ledger)
        return {
            "status": "success",
            "tabs_count": len(raw_tabs),
            "chunks_created": chunks_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sources/status", response_model=SourcesStatusResponse)
async def get_sources_status(
    moss_engine: MossEngine = Depends(get_moss_engine)
):
    data = moss_engine.get_sources_status()
    return SourcesStatusResponse(
        codebase=SourceStatusItem(**data.get("codebase", {})),
        notes=SourceStatusItem(**data.get("notes", {})),
        browser_tab=SourceStatusItem(**data.get("browser_tab", {}))
    )

@router.post("/sources/clear")
async def clear_source_index(
    request: ClearSourceRequest,
    moss_engine: MossEngine = Depends(get_moss_engine)
):
    moss_engine.clear_source(request.source_type)
    data = moss_engine.get_sources_status()
    return {
        "status": "cleared",
        "source_type": request.source_type,
        "sources_status": SourcesStatusResponse(
            codebase=SourceStatusItem(**data.get("codebase", {})),
            notes=SourceStatusItem(**data.get("notes", {})),
            browser_tab=SourceStatusItem(**data.get("browser_tab", {}))
        )
    }

@router.post("/ingest", response_model=IngestResponse)
async def start_ingestion(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
    moss_engine: MossEngine = Depends(get_moss_engine),
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger)
):
    job_id = str(uuid.uuid4())
    ingest_jobs[job_id] = IngestProgress(
        job_id=job_id,
        status="starting",
        files_processed=0,
        total_files=0,
        chunks_created=0
    )
    background_tasks.add_task(
        perform_scoped_ingestion,
        job_id,
        request.path,
        "codebase",
        [],
        [],
        moss_engine,
        privacy_ledger
    )
    return IngestResponse(job_id=job_id, status="started")

@router.post("/ingest_file")
async def ingest_document(
    request: IngestDocumentRequest,
    moss_engine: MossEngine = Depends(get_moss_engine),
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger)
):
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=400, detail="File path does not exist on host system")
    try:
        chunks_count = await moss_engine.ingest_document_file(request.file_path, privacy_ledger=privacy_ledger)
        return {
            "status": "success",
            "file_path": request.file_path,
            "chunks_created": chunks_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload_document")
async def upload_document(
    file: UploadFile = File(...),
    moss_engine: MossEngine = Depends(get_moss_engine),
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger)
):
    suffix = os.path.splitext(file.filename)[1] if file.filename else ".txt"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        chunks_count = await moss_engine.ingest_document_file(tmp_path, privacy_ledger=privacy_ledger)
        return {
            "status": "success",
            "filename": file.filename,
            "chunks_created": chunks_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ingest_url")
async def ingest_web_url(
    request: IngestUrlRequest,
    moss_engine: MossEngine = Depends(get_moss_engine),
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger)
):
    try:
        chunks_count = await moss_engine.ingest_browser_url(request.url, privacy_ledger=privacy_ledger)
        return {
            "status": "success",
            "url": request.url,
            "chunks_created": chunks_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sources")
async def get_indexed_sources(
    moss_engine: MossEngine = Depends(get_moss_engine)
):
    return moss_engine.get_sources()

@router.get("/ingest/{job_id}/status", response_model=IngestProgress)
async def get_ingestion_status(job_id: str):
    if job_id not in ingest_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return ingest_jobs[job_id]

@router.get("/ingest/{job_id}/stream")
async def stream_ingestion_status(job_id: str):
    async def event_generator():
        last_progress = None
        while True:
            if job_id not in ingest_jobs:
                yield "data: {\"error\": \"Job not found\"}\n\n"
                break
            current = ingest_jobs[job_id]
            if last_progress != current:
                yield f"data: {current.model_dump_json()}\n\n"
                last_progress = current
            if current.status in ["completed", "failed"]:
                break
            await asyncio.sleep(1)
    return StreamingResponse(event_generator(), media_type="text/event-stream")
