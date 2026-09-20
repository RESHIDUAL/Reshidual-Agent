export type ConnectorType = 'repo' | 'file' | 'directory';

export interface IngestRequest {
  path: string;
  type?: ConnectorType;
}

export interface IngestResponse {
  job_id: string;
  status: string;
}

export interface IngestProgress {
  job_id: string;
  status: string;
  files_processed: number;
  total_files: number;
  chunks_created: number;
  current_file?: string | null;
  errors: string[];
  processedFiles?: number;
  totalFiles?: number;
  chunksCreated?: number;
  currentFile?: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface FileAction {
  action: 'modify' | 'create' | 'read' | 'none';
  file_path?: string;
  content?: string;
  diff?: string;
  applied?: boolean;
}

export interface QueryRequest {
  text: string;
  alpha?: number;
  session_id?: string;
  model?: string;
  source_type?: string;
  messages?: ChatMessage[];
  auto_apply?: boolean;
  confidence_threshold?: number;
  synthesize?: boolean;
}

export interface SearchResult {
  chunk_id: string;
  id?: string;
  file_path: string;
  start_line: number;
  end_line: number;
  content: string;
  semantic_score: number;
  keyword_score: number;
  blended_score: number;
  why_matched: string;
  language?: string;
  symbol_name?: string;
  symbol_type?: string;
  source_type?: string;
  line_start?: number;
  line_end?: number;
  content_snippet?: string;
}

export interface TimingInfo {
  total_ms: number;
  semantic_ms: number;
  keyword_ms: number;
  rerank_ms: number;
}

export interface SearchResults {
  results: SearchResult[];
  timing: TimingInfo;
  query: string;
  alpha: number;
  session_id: string;
  answer?: string;
  file_action?: FileAction | null;
  top_score?: number;
  confidence_level?: 'high' | 'low';
}

export interface HealRequest {
  issue: string;
  session_id?: string;
}

export interface HealStep {
  step: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  detail?: string;
  timestamp?: string;
}

export interface HealAttempt {
  attempt_number: number;
  diff: string;
  test_output: string;
  success: boolean;
}

export interface HealResult {
  status: string;
  steps: HealStep[];
  final_diff?: string;
  attempts: HealAttempt[];
  accepted?: boolean | null;
}

export interface Redaction {
  start?: number;
  end?: number;
  original: string;
  originalText?: string;
  replacement: string;
  reason: string;
}

export interface RedactionDiff {
  chunk_id?: string;
  id?: string;
  file_path?: string;
  filePath?: string;
  raw_content?: string;
  original?: string;
  originalContent?: string;
  redacted_content?: string;
  redacted?: string;
  redactions?: Redaction[];
  replacements?: Redaction[];
  count?: number;
}

export interface ChunkSummary {
  chunk_id: string;
  file_path: string;
  symbol_name?: string;
  action?: string;
}

export interface IndexDiff {
  since: string;
  added: ChunkSummary[];
  removed: ChunkSummary[];
  modified: ChunkSummary[];
}

export interface IntegrityResult {
  valid: boolean;
  chain_length: number;
  last_hash: string;
  checked_at: string;
  chainLength?: number;
  lastHash?: string;
  checkedAt?: string;
}

export interface LedgerEvent {
  id?: string;
  event_type: string;
  type?: string;
  actor?: string;
  payload: Record<string, any>;
  timestamp: string;
  hash?: string;
}

export interface TrustScoreBreakdown {
  recall_contribution: number;
  latency_contribution: number;
  zero_leak_contribution: number;
}

export interface TrustScore {
  overall: number;
  recall_at_3: number;
  p95_latency_ms: number;
  zero_leak: boolean;
  unexpected_connections?: number;
  moss_sync_events?: number;
  breakdown: TrustScoreBreakdown;
  overallScore?: number;
  recall?: number;
  latencyMs?: number;
  zeroLeak?: boolean;
}

export interface PrivacySummary {
  unexpected_connections: number;
  moss_sync_events: number;
  is_clean: boolean;
  active_connections?: number;
  total_audit_events?: number;
}

export interface LatencyRace {
  query: string;
  moss_latency_ms: number;
  naive_latency_ms: number;
  mossLatencyMs?: number;
  naiveLatencyMs?: number;
}

export interface EvalResult {
  recall_at_3: number;
  total_queries: number;
  correct_at_3: number;
  moss_p95_latency_ms: number;
  naive_p95_latency_ms: number;
  latency_races: LatencyRace[];
  recallAt3?: number;
}

export interface HealthStatus {
  ollama: boolean;
  moss: boolean;
  livekit: boolean;
  models: string[];
  ollama_version?: string;
  moss_configured?: boolean;
  status: string;
}

export type SystemHealth = HealthStatus;

export interface VoiceTranscription {
  text: string;
  confidence: number;
  duration_ms: number;
}

export interface ModelsResponse {
  models: string[];
  current_model: string;
  ollama_online: boolean;
  ollama_version: string;
  providers?: Record<string, boolean>;
  keys?: Record<string, boolean>;
}

export interface KeysUpdateRequest {
  nvidia?: string;
  openrouter?: string;
  google?: string;
}

export interface ConfiguredKeysResponse {
  keys: Record<string, string>;
}

export interface IndexedSources {
  codebase: string[];
  document: string[];
  browser_tab: string[];
}

export interface AppSettings {
  theme?: 'light' | 'dark' | 'system';
  ollama_model?: string;
  ollamaModel?: string;
  livekit_port?: number;
  livekitPort?: number;
  mic_device?: string;
  micDevice?: string;
  alpha_default?: number;
  defaultAlpha?: number;
  redaction_sensitivity?: 'low' | 'medium' | 'high' | string;
  redactionSensitivity?: 'low' | 'medium' | 'high' | string;
  moss_project_id?: string;
  moss_project_key?: string;
  mossProjectId?: string;
  mossProjectKey?: string;
  moss_last_synced?: string;
  dataDirectory?: string;
  confidence_threshold?: number;
  confidenceThreshold?: number;
}

export type SettingsConfig = AppSettings;

export interface ScanFolderRequest {
  path: string;
  source_type?: string;
  excludes?: string[];
}

export interface ScanFolderResponse {
  path: string;
  file_count: number;
  estimated_chunks: number;
  breakdown: Record<string, number>;
  detected_subfolders: string[];
  default_excludes: string[];
}

export interface IngestScopedRequest {
  path: string;
  source_type?: string;
  excludes?: string[];
  included_extensions?: string[];
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  favicon: string;
  browser?: string;
}

export interface SourceStatusItem {
  status: 'not_indexed' | 'indexing' | 'indexed' | string;
  chunks: number;
  files_count?: number;
  tabs_count?: number;
  path?: string;
  last_updated?: string;
}

export interface SourcesStatusResponse {
  codebase: SourceStatusItem;
  notes: SourceStatusItem;
  browser_tab: SourceStatusItem;
}