from enum import Enum
from typing import List, Optional
from pydantic import BaseModel

class ConnectorType(str, Enum): 
    REPO = 'repo'
    FILE = 'file'
    DIRECTORY = 'directory'

class IngestRequest(BaseModel): 
    path: str
    type: ConnectorType = ConnectorType.REPO

class IngestDocumentRequest(BaseModel):
    file_path: str

class IngestUrlRequest(BaseModel):
    url: str

class IngestResponse(BaseModel): 
    job_id: str
    status: str = 'started'

class IngestProgress(BaseModel): 
    job_id: str
    status: str
    files_processed: int
    total_files: int
    chunks_created: int
    current_file: str | None = None
    errors: list[str] = []

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class FileAction(BaseModel):
    action: str = 'none'
    file_path: Optional[str] = None
    content: Optional[str] = None
    diff: Optional[str] = None
    applied: bool = False

class QueryRequest(BaseModel): 
    text: str
    alpha: float = 0.5
    session_id: str = ''
    model: Optional[str] = None
    source_type: Optional[str] = 'all'
    messages: Optional[List[ChatMessage]] = None
    auto_apply: bool = False
    confidence_threshold: float = 0.6
    synthesize: bool = True

class SearchResult(BaseModel): 
    chunk_id: str
    file_path: str
    start_line: int
    end_line: int
    content: str
    semantic_score: float
    keyword_score: float
    blended_score: float
    why_matched: str
    language: str = ''
    symbol_name: str = ''
    symbol_type: str = ''
    source_type: str = 'codebase'

class TimingInfo(BaseModel): 
    total_ms: float
    semantic_ms: float
    keyword_ms: float
    rerank_ms: float

class SearchResults(BaseModel): 
    results: list[SearchResult]
    timing: TimingInfo
    query: str
    alpha: float
    session_id: str
    answer: str = ''
    file_action: Optional[FileAction] = None
    top_score: float = 0.0
    confidence_level: str = 'high'

class HealRequest(BaseModel): 
    issue: str
    session_id: str = ''

class HealStep(BaseModel): 
    step: str
    status: str
    detail: str = ''
    timestamp: str = ''

class HealAttempt(BaseModel): 
    attempt_number: int
    diff: str
    test_output: str
    success: bool

class HealResult(BaseModel): 
    status: str
    steps: list[HealStep]
    final_diff: str = ''
    attempts: list[HealAttempt] = []
    accepted: bool | None = None

class Redaction(BaseModel): 
    start: int
    end: int
    original: str
    replacement: str
    reason: str

class RedactionDiff(BaseModel): 
    chunk_id: str
    raw_content: str
    redacted_content: str
    redactions: list[Redaction]

class ChunkSummary(BaseModel): 
    chunk_id: str
    file_path: str
    symbol_name: str = ''
    action: str = ''

class IndexDiff(BaseModel): 
    since: str
    added: list[ChunkSummary]
    removed: list[ChunkSummary]
    modified: list[ChunkSummary] = []

class IntegrityResult(BaseModel): 
    valid: bool
    chain_length: int
    last_hash: str
    checked_at: str

class LedgerEvent(BaseModel): 
    event_type: str
    payload: dict
    timestamp: str
    hash: str = ''

class TrustScoreBreakdown(BaseModel): 
    recall_contribution: float
    latency_contribution: float
    zero_leak_contribution: float

class TrustScore(BaseModel): 
    overall: int
    recall_at_3: float
    p95_latency_ms: float
    zero_leak: bool
    unexpected_connections: int = 0
    moss_sync_events: int = 0
    breakdown: TrustScoreBreakdown

class LatencyRace(BaseModel): 
    query: str
    moss_latency_ms: float
    naive_latency_ms: float

class EvalResult(BaseModel): 
    recall_at_3: float
    total_queries: int
    correct_at_3: int
    moss_p95_latency_ms: float
    naive_p95_latency_ms: float
    latency_races: list[LatencyRace] = []

class HealthStatus(BaseModel): 
    ollama: bool
    moss: bool
    livekit: bool
    models: list[str] = []
    ollama_version: str = ''
    moss_configured: bool = False
    status: str = 'ok'

class PrivacySummary(BaseModel):
    unexpected_connections: int = 0
    moss_sync_events: int = 0
    is_clean: bool = True
    active_connections: int = 0
    total_audit_events: int = 0

class VoiceTranscription(BaseModel): 
    text: str
    confidence: float
    duration_ms: float

class ModelsResponse(BaseModel):
    models: list[str] = []
    current_model: str = ''
    ollama_online: bool = False
    ollama_version: str = ''
    providers: dict[str, bool] = {}
    keys: dict[str, bool] = {}

class KeysUpdateRequest(BaseModel):
    nvidia: Optional[str] = None
    openrouter: Optional[str] = None
    google: Optional[str] = None

class AppSettings(BaseModel): 
    theme: str = 'system'
    ollama_model: str = 'llama3.1:8b'
    livekit_port: int = 7880
    mic_device: str = 'default'
    alpha_default: float = 0.5
    redaction_sensitivity: str = 'medium'
    moss_project_id: str = ''
    moss_project_key: str = ''
    moss_last_synced: str = ''
    confidence_threshold: float = 0.6

class ScanFolderRequest(BaseModel):
    path: str
    source_type: str = 'codebase'
    excludes: list[str] = []

class ScanFolderResponse(BaseModel):
    path: str
    file_count: int
    estimated_chunks: int
    breakdown: dict[str, int]
    detected_subfolders: list[str]
    default_excludes: list[str]

class IngestScopedRequest(BaseModel):
    path: str
    source_type: str = 'codebase'
    excludes: list[str] = []
    included_extensions: list[str] = []

class BrowserTab(BaseModel):
    id: str
    title: str
    url: str
    favicon: str
    browser: Optional[str] = "Brave"

class IngestAllTabsRequest(BaseModel):
    tab_ids: Optional[list[str]] = None

class SourceStatusItem(BaseModel):
    status: str = 'not_indexed'
    chunks: int = 0
    files_count: int = 0
    tabs_count: int = 0
    path: str = ''
    last_updated: str = ''

class SourcesStatusResponse(BaseModel):
    codebase: SourceStatusItem
    notes: SourceStatusItem
    browser_tab: SourceStatusItem

class ClearSourceRequest(BaseModel):
    source_type: str = 'all'