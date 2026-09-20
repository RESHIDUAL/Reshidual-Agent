import { apiGet, apiPost, apiPut, apiSSE } from './client';
import * as T from './types';

export const connectorApi = {
  ingest,
  ingestScoped,
  scanFolder,
  pickFolder,
  pickFile,
  getBrowserTabs,
  ingestAllTabs,
  getSourcesStatus,
  clearSource,
  ingestFile,
  uploadDocument,
  ingestUrl,
  getSources,
  getModels,
  subscribeIngestProgress,
  query,
  applyFileChange,
  executeHeal,
  subscribeHealProgress,
  getRedactionDiff,
  getIndexDiff,
  verifyIntegrity,
  getTrustScore,
  runEval,
  runLatencyRace,
  getHealth,
  transcribeVoice,
  getVoiceConfig,
  getSettings,
  updateSettings,
  getLedgerEvents,
  getPrivacySummary,
  getModelKeys,
  updateModelKeys,
};

export function ingest(path: string, type?: T.ConnectorType): Promise<T.IngestResponse> {
  return apiPost<T.IngestResponse>('/ingest', { path, type });
}

export function scanFolder(path: string, sourceType: string = 'codebase', excludes?: string[]): Promise<T.ScanFolderResponse> {
  return apiPost<T.ScanFolderResponse>('/scan_folder', { path, source_type: sourceType, excludes: excludes || [] });
}

export function pickFolder(): Promise<{ path: string }> {
  return apiPost<{ path: string }>('/pick_folder');
}

export function pickFile(): Promise<{ path: string }> {
  return apiPost<{ path: string }>('/pick_file');
}

export function ingestScoped(req: T.IngestScopedRequest): Promise<T.IngestResponse> {
  return apiPost<T.IngestResponse>('/ingest_scoped', req);
}

export function getBrowserTabs(): Promise<T.BrowserTab[]> {
  return apiGet<T.BrowserTab[]>('/browser/tabs');
}

export function ingestAllTabs(tabIds?: string[]): Promise<{ status: string; tabs_count: number; chunks_created: number }> {
  return apiPost<{ status: string; tabs_count: number; chunks_created: number }>('/browser/ingest_all', { tab_ids: tabIds });
}

export function getSourcesStatus(): Promise<T.SourcesStatusResponse> {
  return apiGet<T.SourcesStatusResponse>('/sources/status');
}

export function clearSource(sourceType: string = 'all'): Promise<{ status: string; source_type: string; sources_status: T.SourcesStatusResponse }> {
  return apiPost('/sources/clear', { source_type: sourceType });
}

export function ingestFile(filePath: string): Promise<{ status: string; file_path: string; chunks_created: number }> {
  return apiPost<{ status: string; file_path: string; chunks_created: number }>('/ingest_file', { file_path: filePath });
}

export function uploadDocument(file: File): Promise<{ status: string; filename: string; chunks_created: number }> {
  const formData = new FormData();
  formData.append('file', file);
  return fetch('http://localhost:8420/api/upload_document', {
    method: 'POST',
    body: formData,
  }).then(res => {
    if (!res.ok) throw new Error(`Document upload failed: ${res.status}`);
    return res.json();
  });
}

export function ingestUrl(url: string): Promise<{ status: string; url: string; chunks_created: number }> {
  return apiPost<{ status: string; url: string; chunks_created: number }>('/ingest_url', { url });
}

export function getSources(): Promise<T.IndexedSources> {
  return apiGet<T.IndexedSources>('/sources');
}

export function getModels(): Promise<T.ModelsResponse> {
  return apiGet<T.ModelsResponse>('/models');
}

export function subscribeIngestProgress(jobId: string, onProgress: (p: T.IngestProgress) => void): () => void {
  return apiSSE(`/ingest/${jobId}/stream`, onProgress);
}

export function query(
  text: string,
  alpha?: number,
  sessionId?: string,
  model?: string,
  sourceType?: string,
  messages?: T.ChatMessage[],
  autoApply?: boolean,
  confidenceThreshold?: number,
  synthesize?: boolean
): Promise<T.SearchResults> {
  return apiPost<T.SearchResults>('/query', {
    text,
    alpha,
    session_id: sessionId,
    model,
    source_type: sourceType,
    messages,
    auto_apply: autoApply,
    confidence_threshold: confidenceThreshold,
    synthesize: synthesize !== undefined ? synthesize : true,
  });
}

export function applyFileChange(
  filePath: string,
  content: string
): Promise<{ status: string; file_path: string; bytes_written?: number }> {
  return apiPost<{ status: string; file_path: string; bytes_written?: number }>('/agent/apply_change', {
    file_path: filePath,
    content,
  });
}

export function executeHeal(issue: string, sessionId?: string): Promise<T.HealResult> {
  return apiPost<T.HealResult>('/execute_heal', { issue, session_id: sessionId });
}

export function subscribeHealProgress(sessionId: string, onStep: (s: T.HealStep) => void): () => void {
  return apiSSE(`/execute_heal/${sessionId}/stream`, onStep);
}

export function getRedactionDiff(chunkId: string): Promise<T.RedactionDiff> {
  return apiGet<T.RedactionDiff>(`/redaction_diff/${chunkId}`);
}

export function getIndexDiff(since: string): Promise<T.IndexDiff> {
  return apiGet<T.IndexDiff>(`/index_diff?since=${encodeURIComponent(since)}`);
}

export function verifyIntegrity(): Promise<T.IntegrityResult> {
  return apiPost<T.IntegrityResult>('/verify_integrity');
}

export function getTrustScore(): Promise<T.TrustScore> {
  return apiGet<T.TrustScore>('/trust_score');
}

export function runEval(): Promise<T.EvalResult> {
  return apiPost<T.EvalResult>('/run_eval');
}

export function runLatencyRace(queryText: string): Promise<T.LatencyRace> {
  return apiGet<T.LatencyRace>(`/latency_race?query=${encodeURIComponent(queryText)}`);
}

export function getHealth(): Promise<T.HealthStatus> {
  return apiGet<T.HealthStatus>('/health');
}

export function transcribeVoice(audioBlob: Blob): Promise<T.VoiceTranscription> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'audio.webm');

  return fetch('http://localhost:8420/api/voice/transcribe', {
    method: 'POST',
    body: formData,
  }).then(res => {
    if (!res.ok) throw new Error(`Voice transcription failed: ${res.status}`);
    return res.json();
  });
}

export function getVoiceConfig(): Promise<any> {
  return apiGet<any>('/voice/config');
}

export function getSettings(): Promise<T.AppSettings> {
  return apiGet<T.AppSettings>('/settings');
}

export function updateSettings(settings: Partial<T.AppSettings>): Promise<T.AppSettings> {
  return apiPut<T.AppSettings>('/settings', settings);
}

export function getLedgerEvents(limit: number = 50): Promise<T.LedgerEvent[]> {
  return apiGet<T.LedgerEvent[]>(`/ledger_events?limit=${limit}`);
}

export function getPrivacySummary(): Promise<T.PrivacySummary> {
  return apiGet<T.PrivacySummary>('/privacy_summary');
}

export function getModelKeys(): Promise<T.ConfiguredKeysResponse> {
  return apiGet<T.ConfiguredKeysResponse>('/models/keys');
}

export function updateModelKeys(keys: T.KeysUpdateRequest): Promise<{ status: string; providers: Record<string, boolean>; models: string[]; default_model: string }> {
  return apiPost('/models/keys', keys);
}