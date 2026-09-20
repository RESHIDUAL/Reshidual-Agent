# Reshidual Agent: Local-First Privacy AI Engineering Copilot

> **Production-Ready Local-First AI Development Operating System**  
> Sub-10ms in-memory semantic retrieval via **Moss Zero-DB**, zero-leak cryptographic privacy auditing, multi-source ingestion (AST Codebases, Documents & Notes, Live Browser Tabs), local Ollama + Bring-Your-Own-Model (BYOM) gateway, voice copilot, and containerized self-healing code repair.

---

### Project Credentials & Authors
- **Shivani R**
- **Eshwar G**

---

## 1. System Overview & Problem Statement

Modern AI developer tools force engineers into a "Privacy Tax"—exchanging intellectual property, proprietary codebases, and credentials for developer intelligence. Cloud-first RAG setups incur 200–800ms roundtrip latencies, require heavy external vector databases, and leak sensitive contextual metadata to third-party servers.

**Reshidual Agent** solves this by running entirely close to the user:
- **Zero-DB Retrieval**: Powered by **Moss** (`inferedge-moss-core`), indexing code and document embeddings into local memory for sub-10ms semantic search without hosting or managing vector databases.
- **Cryptographic Zero-Leak Ledger**: Continuous OS-level socket monitoring coupled with a SHA-256 hash-chained tamper-evident audit ledger verifiably proving zero unexpected outbound network connections.
- **Live Multi-Source Context**: Simultaneous ingestion of codebases (Tree-sitter AST chunking), documents (PDF, Word `.docx`, Markdown, text, Excel spreadsheets), and live Chromium browser tabs (Brave, Chrome, Edge, Opera).
- **Flexible Intelligence**: Offline-first via local Ollama instances (Llama 3.1, Qwen2.5-Coder), with seamless support for high-throughput cloud endpoints (NVIDIA NIM, Google Gemini, OpenAI, Claude) via an integrated Bring-Your-Own-Model (BYOM) gateway.
- **Autonomous Self-Healing**: Automated diagnostics, AST diff synthesis, and test validation running within an isolated Docker sandbox (`--network none`).

---

## 2. System Architecture

```
                                  +-------------------------------------------------------------+
                                  |                      DESKTOP SURFACES                       |
                                  |  Next.js 14 Desktop UI (Tailwind M3) / Native Tauri v2 Shell|
                                  +------------------------------+------------------------------+
                                                                 | HTTP / WebSocket / SSE
                                                                 v
+-------------------------------------------------------------------------------------------------------------------------------+
|                                                    FASTAPI BACKEND ENGINE                                                     |
|                                                                                                                               |
|   +--------------------------+  +--------------------------+  +--------------------------+  +--------------------------+      |
|   |    Multi-Source Ingest   |  |   Moss In-Memory Core    |  |     LLM Model Gateway    |  |  Cryptographic Ledger    |      |
|   |  - Codebase (TreeSitter) |  |  - In-Memory HNSW Graph  |  |  - Local Ollama Client   |  |  - Win32 / Linux Sockets |      |
|   |  - Notes (DOCX/PDF/MD)   |  |  - Sub-10ms Vector Search|  |  - BYOM NVIDIA NIM       |  |  - SHA-256 Hash Chaining |      |
|   |  - Live Chromium Tabs    |  |  - Dynamic Alpha Blending|  |  - Gemini / OpenAI / Claude|  - Tamper Verification |      |
|   +--------------------------+  +--------------------------+  +--------------------------+  +--------------------------+      |
|                                                                                                                               |
|   +-----------------------------------------------------------------------------------------------------------------------+   |
|   |                                          AUTONOMOUS HEALING & EVALUATION                                              |   |
|   |   - Docker Container Sandbox (--network none)            - Recall@3 Golden Test Harness (25 Question Pairs)           |   |
|   |   - AST Diff Generation & Verification                   - Latency Race vs Naive Linear Baseline                     |   |
|   +-----------------------------------------------------------------------------------------------------------------------+   |
+-------------------------------------------------------------------------------------------------------------------------------+
```

---

## 3. Detailed Repository File Structure & Breakdown

### Root Directory
- [`run.bat`](file:///run.bat): One-click Windows startup batch script that simultaneously boots the FastAPI backend (`uvicorn backend.main:app`), launches the Next.js frontend (`npm run dev`), and opens `http://localhost:3000`.
- [`package.json`](file:///package.json): Root NPM manifest orchestrating Tauri v2 desktop shell lifecycle and workspace scripts.
- [`package-lock.json`](file:///package-lock.json): Pinned lockfile for root desktop dependencies.
- [`.env.example`](file:///.env.example): Complete template of environment variables, Moss credentials, port bindings, and BYOM provider keys.
- [`.gitignore`](file:///.gitignore): Comprehensive exclusion list preventing environment secrets, node dependencies, build artifacts (`.next/`, `out/`), python caches, and databases from reaching git.
- [`verify_moss_integration.py`](file:///verify_moss_integration.py): Standalone validation suite verifying Moss SDK bindings, local Tree-sitter AST parsing, and regex/entropy secret redaction.
- [`Architecture.jpg`](file:///Architecture.jpg): Detailed high-resolution architectural diagram illustrating component topology.
- [`PRD.md`](file:///PRD.md): Product Requirements Document defining functional tiers (P0, P1, P2), architecture, and non-functional requirements.
- [`README.md`](file:///README.md): Comprehensive system documentation, usage guides, and file directory breakdown.

---

### Backend Components (`backend/`)

#### Core Configuration & Foundation
- [`backend/main.py`](file:///backend/main.py): FastAPI application entrypoint. Configures CORS, sets up lifespan event handlers (initializing the SQLite database and starting the background socket monitor), registers all API routers with the `/api` prefix, and serves health checks.
- [`backend/config.py`](file:///backend/config.py): Central application configuration based on Pydantic `BaseSettings`. Loads environment variables from `.env` for server ports, Ollama host, Docker constraints, and Moss credentials.
- [`backend/dependencies.py`](file:///backend/dependencies.py): Dependency injection container managing singleton instances of `DatabaseManager`, `MossEngine`, `PrivacyLedger`, `SecretScanner`, and `LLMGateway`.
- [`backend/requirements.txt`](file:///backend/requirements.txt): Python dependency manifest specifying exact package versions (`fastapi`, `uvicorn`, `pydantic`, `moss`, `tree-sitter`, `ollama`, `psutil`, `docker`, `aiosqlite`, `python-docx`, `pypdf`, etc.).

#### Data Models (`backend/models/`)
- [`backend/models/schemas.py`](file:///backend/models/schemas.py): Strict Pydantic v2 schemas for all API payloads, including `IngestRequest`, `QueryRequest`, `SearchResults`, `HealRequest`, `LedgerEvent`, `TrustScore`, and `ClearSourceRequest`.
- [`backend/models/database.py`](file:///backend/models/database.py): Async SQLite abstraction using `aiosqlite`. Manages `Chunks` table with FTS5 virtual full-text search, `Sessions` table for context persistence, and `AuditLog` table with SHA-256 cryptographic hash-chaining.

#### API Routers (`backend/routers/`)
- [`backend/routers/query.py`](file:///backend/routers/query.py): Handles semantic search and conversational RAG generation. Orchestrates context retrieval via Moss, confidence threshold filtering, and answer synthesis through local Ollama or BYOM models.
- [`backend/routers/ingest.py`](file:///backend/routers/ingest.py): Multi-source ingestion endpoints. Supports repository directory scanning, native single-document file picking/uploading, Chromium browser tab discovery, SSE progress streaming, and 1-click source index clearing.
- [`backend/routers/privacy.py`](file:///backend/routers/privacy.py): Privacy audit endpoints providing network activity summaries, zero-leak verification metrics, and trust score calculations.
- [`backend/routers/ledger_ws.py`](file:///backend/routers/ledger_ws.py): Real-time WebSocket server (`/api/subscribe_ledger`) streaming live OS network events and cryptographic integrity checks to the frontend.
- [`backend/routers/heal.py`](file:///backend/routers/heal.py): Autonomous self-healing endpoint triggering diagnostic evaluation, hypothesis formulation, AST patching, and containerized verification.
- [`backend/routers/health.py`](file:///backend/routers/health.py): Health probe inspecting live statuses for Ollama, Moss core, Docker daemon, and LiveKit audio server.
- [`backend/routers/eval.py`](file:///backend/routers/eval.py): Evaluation harness endpoints executing Recall@3 accuracy benchmarks on golden sets and measuring latency races against naive linear search.
- [`backend/routers/settings.py`](file:///backend/routers/settings.py): Reads and updates runtime parameters (active model, retrieval alpha, redaction sensitivity, and Moss credentials).
- [`backend/routers/voice.py`](file:///backend/routers/voice.py): Audio transcription endpoint interfacing with local Whisper models.

#### Backend Services (`backend/services/`)
- [`backend/services/moss_engine.py`](file:///backend/services/moss_engine.py): Primary retrieval service interfacing with the official Moss SDK. Manages AST chunk indexing, hybrid search (blending semantic embeddings with BM25 keyword matching), confidence scoring, and source-isolated index clearing.
- [`backend/services/browser_tab_detector.py`](file:///backend/services/browser_tab_detector.py): Live Chromium session decoder. Reads `Sessions/Session_*` and `Tabs_*` SNSS binary packets using Win32 non-locking shared file handles (`FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE`) and supplements with SQLite `History` discovery to detect active tabs in real-time.
- [`backend/services/llm_gateway.py`](file:///backend/services/llm_gateway.py): Unified model router. Seamlessly directs generation prompts to local Ollama instances or external BYOM providers (NVIDIA NIM, Google Gemini, OpenAI, Claude, OpenRouter) with automatic fallback and key validation.
- [`backend/services/ollama_client.py`](file:///backend/services/ollama_client.py): Direct client for local Ollama daemon. Detects installed models, pulls weights, and streams tokens.
- [`backend/services/document_parser.py`](file:///backend/services/document_parser.py): Multi-format document extractor supporting `.pdf` (pypdf), `.docx` (python-docx), `.xlsx` (openpyxl), `.txt`, and `.md`.
- [`backend/services/tree_sitter_parser.py`](file:///backend/services/tree_sitter_parser.py): AST-aware code chunker using Tree-sitter grammars to partition source files along logical class and function boundaries.
- [`backend/services/secret_scanner.py`](file:///backend/services/secret_scanner.py): Pre-flight privacy sanitizer executing regex matching and Shannon entropy analysis to detect and redact API keys, bearer tokens, and private credentials before indexing.
- [`backend/services/privacy_ledger.py`](file:///backend/services/privacy_ledger.py): Continuous background network auditor polling OS sockets (`/proc/net/tcp` on Linux, Win32 socket table on Windows) to verify zero unexpected outbound traffic and record immutable SHA-256 audit events.
- [`backend/services/docker_sandbox.py`](file:///backend/services/docker_sandbox.py): Manages isolated Docker containers configured with `--network none`, strict memory caps (512MB), and CPU quotas for secure patch testing.
- [`backend/services/eval_harness.py`](file:///backend/services/eval_harness.py): Executes automated Recall@3 benchmarks against a curated 25-item golden question set and measures p95 latency against linear string search.
- [`backend/services/trust_score.py`](file:///backend/services/trust_score.py): Computes composite Trust Scores (0–100) based on retrieval recall, execution latency, and verified zero-leak status.
- [`backend/services/livekit_service.py`](file:///backend/services/livekit_service.py): Local audio pipeline integration for voice capture and real-time streaming.

---

### Frontend Components (`frontend/`)

#### Configuration & Styling
- [`frontend/package.json`](file:///frontend/package.json): Frontend dependencies manifest (`next`, `react`, `framer-motion`, `lucide-react`, `tailwindcss`, `@tauri-apps/api`).
- [`frontend/tailwind.config.ts`](file:///frontend/tailwind.config.ts): Custom Tailwind CSS design tokens implementing Material 3 Expressive theming (color roles, surface elevations, smooth spring animations).
- [`frontend/tsconfig.json`](file:///frontend/tsconfig.json): TypeScript configuration with path alias mappings (`@/*`).
- [`frontend/app/globals.css`](file:///frontend/app/globals.css): Global typography, styling rules, and custom scrollbar styles.
- [`frontend/app/layout.tsx`](file:///frontend/app/layout.tsx): Root layout providing theme providers, global modals, and top navigation.

#### Application Pages (`frontend/app/`)
- [`frontend/app/search/page.tsx`](file:///frontend/app/search/page.tsx): Main dashboard view. Features consolidated mode switching (`AI Agent` vs `Semantic Search`), source filter tabs (`All`, `Codebase`, `Notes`, `Browser Tabs`), dynamic `Refresh Tabs` button, active workspace target status, 1-click reindexing, and multi-turn conversational chat.
- [`frontend/app/healing/page.tsx`](file:///frontend/app/healing/page.tsx): Self-healing laboratory displaying active patch attempts, unified AST diff viewers, and Docker sandbox test logs.
- [`frontend/app/privacy/page.tsx`](file:///frontend/app/privacy/page.tsx): Privacy ledger dashboard showcasing real-time socket monitoring, SHA-256 audit log integrity verification, and trust score breakdowns.
- [`frontend/app/eval/page.tsx`](file:///frontend/app/eval/page.tsx): Retrieval evaluation suite executing Recall@3 benchmarks and visualizing Moss sub-10ms latency races against naive search.
- [`frontend/app/settings/page.tsx`](file:///frontend/app/settings/page.tsx): System settings view configuring Ollama models, BYOM API keys, microphone inputs, and Moss credentials.
- [`frontend/app/sources/page.tsx`](file:///frontend/app/sources/page.tsx): Comprehensive source catalog inspecting chunk counts and file breakdowns across all indexed targets.
- [`frontend/app/onboarding/page.tsx`](file:///frontend/app/onboarding/page.tsx): First-run onboarding wizard guiding repository selection and zero-leak verification.

#### Interactive Components (`frontend/components/`)
- [`frontend/components/sources/InlineSourceManager.tsx`](file:///frontend/components/sources/InlineSourceManager.tsx): Unified modal for managing data sources. Features native directory picking, document file upload, live Chromium tab selection, and source index clearing.
- [`frontend/components/models/BYOMModal.tsx`](file:///frontend/components/models/BYOMModal.tsx): Modal dialog for configuring external model providers (NVIDIA NIM, Google Gemini, OpenAI, Claude, OpenRouter) with real-time key testing and model selection.
- [`frontend/components/layout/Sidebar.tsx`](file:///frontend/components/layout/Sidebar.tsx): Primary application sidebar with navigation links and dedicated BYOM model launcher chips featuring branded provider logos.
- [`frontend/components/layout/Header.tsx`](file:///frontend/components/layout/Header.tsx): Top application header displaying active model indicators, latency chips, and desktop controls.
- [`frontend/components/layout/ContextPanel.tsx`](file:///frontend/components/layout/ContextPanel.tsx): Collapsible right-hand side panel showing live retrieved context chunks and token allocations.
- [`frontend/components/search/SemanticSearchRaw.tsx`](file:///frontend/components/search/SemanticSearchRaw.tsx): Raw retrieval inspection interface equipped with dynamic alpha-blend slider (0.0 to 1.0) and latency telemetry.

#### Client Libraries (`frontend/lib/`)
- [`frontend/lib/api/connector.ts`](file:///frontend/lib/api/connector.ts): Central API client handling all HTTP requests, Server-Sent Events, and WebSocket connections to the FastAPI backend.
- [`frontend/lib/api/types.ts`](file:///frontend/lib/api/types.ts): TypeScript interface definitions mirroring backend Pydantic models.

---

### Desktop Application Shell (`src-tauri/`)
- [`src-tauri/tauri.conf.json`](file:///src-tauri/tauri.conf.json): Tauri desktop configuration defining native window properties, title bar appearance, and security policies.
- [`src-tauri/src/main.rs`](file:///src-tauri/src/main.rs): Native Rust desktop application entrypoint.
- [`src-tauri/Cargo.toml`](file:///src-tauri/Cargo.toml): Rust package manifest for Tauri v2 dependencies.

---

## 4. Getting Started & Installation

### Prerequisites
- **Python 3.11+**
- **Node.js 20+**
- **Ollama** (optional, for 100% offline local generation): [Download Ollama](https://ollama.ai)
- **Moss Account & Key** (for embedding sync): [Portal Moss](https://portal.usemoss.dev)
- **Docker Desktop** (optional, for containerized self-healing code repair)

### Step 1: Clone and Configure Environment
```bash
git clone https://github.com/Shivani-R-Eshwar-G/reshidual-agent.git
cd reshidual-agent

# Create your local environment file
copy .env.example .env
```
Edit `.env` and configure your Moss credentials:
```env
MOSS_PROJECT_ID=your_moss_project_id
MOSS_PROJECT_KEY=your_moss_project_key
```

### Step 2: Install Dependencies
```bash
# Install Python backend requirements
pip install -r backend/requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 3: Run Reshidual Agent

#### Option A: 1-Click Startup (Windows)
Double-click `run.bat` or run:
```bash
run.bat
```

#### Option B: Manual Service Startup
In Terminal 1 (Backend):
```bash
python -m uvicorn backend.main:app --port 8420 --host 127.0.0.1 --reload
```

In Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 5. Verification & Testing

Verify that all local AST parsers, secret sanitizers, and Moss SDK bindings are operational:
```bash
python verify_moss_integration.py
```

Verify the frontend production build:
```bash
cd frontend
npm run build
```

---

## 6. Core REST & WebSocket API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | `GET` | Health check for Ollama, Moss, Docker, and LiveKit |
| `/api/models` | `GET` | Retrieve installed local Ollama and configured BYOM models |
| `/api/query` | `POST` | Execute hybrid semantic/keyword search with RAG synthesis |
| `/api/ingest_scoped` | `POST` | Index a codebase folder or document file into Moss |
| `/api/pick_folder` | `POST` | Launch native Windows folder selection dialog |
| `/api/pick_file` | `POST` | Launch native Windows document file selection dialog |
| `/api/sources/browser_tabs`| `GET` | Detect and list open Chromium browser tabs (SNSS + History) |
| `/api/sources/ingest_tabs` | `POST` | Index selected live browser tabs into Moss |
| `/api/sources/clear` | `POST` | Flush index chunks for a specific source or all sources |
| `/api/sources/status` | `GET` | Get chunk counts and status for all sources |
| `/api/execute_heal` | `POST` | Run autonomous code repair loop in Docker sandbox |
| `/api/privacy_summary` | `GET` | Audit metrics for unexpected connections |
| `/api/trust_score` | `GET` | Composite Trust Score (Recall, Latency, Zero-Leak) |
| `/api/verify_integrity` | `POST` | Recompute cryptographic SHA-256 audit ledger chain |
| `/api/subscribe_ledger` | `WS` | Real-time WebSocket stream of security & network events |
| `/api/run_eval` | `POST` | Execute Recall@3 evaluation on golden benchmark set |
| `/api/voice/transcribe` | `POST` | Transcribe recorded audio chunks via Whisper |

---

## 7. License

This project is licensed under the MIT License.
