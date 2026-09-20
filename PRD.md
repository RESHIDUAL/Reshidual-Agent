# Product Requirements Document (PRD): Reshidual Agent

## 1. Executive Summary & Document Control
- **Product Name:** Reshidual Agent (Local-First Privacy AI Engineering Copilot)
- **Document Version:** 2.0 (Final Production Architecture)
- **Authors & Project Credentials:** **Shivani R & Eshwar G**
- **Status:** Approved / Implemented

Reshidual Agent is a production-grade, local-first developer operating system providing high-performance semantic retrieval, conversational code reasoning, multi-source context synthesis, and autonomous self-healing. By utilizing **Moss Zero-DB** for sub-10ms in-memory vector search and a tamper-evident **Privacy Ledger**, Reshidual Agent eliminates the "Privacy Tax" of cloud AI without sacrificing speed or developer capabilities.

---

## 2. Core Problem Statement
Modern developer copilots and enterprise AI tools require sending proprietary source code, private documents, and contextual activity over the internet. This model exposes organizations to intellectual property leakage, metadata tracking, and API outages. Furthermore, cloud vector databases introduce 200–800ms latencies and heavy operational overhead.

Developers need an AI engineering copilot that:
1. Operates close to the user on local hardware with sub-10ms retrieval latency.
2. Mathematically and cryptographically proves zero unexpected network exposure.
3. Dynamically accesses all live developer contexts: code repositories, documents/notes, and active browser tabs.
4. Provides flexibility between 100% offline local inference (Ollama) and high-throughput model endpoints (NVIDIA, Gemini, OpenAI, Claude).

---

## 3. Goals & Key Objectives
- **Sub-10ms In-Memory Retrieval:** Deliver instantaneous semantic search across codebases and documents using Moss Zero-DB without traditional vector database hosting.
- **Verifiable Zero-Leak Privacy:** Monitor OS-level socket connections in real time and maintain a tamper-evident SHA-256 hash-chained audit ledger.
- **Dynamic Multi-Source Context Ingestion:**
  - **Codebases:** Tree-sitter AST parsing for function/class-level chunking.
  - **Notes & Documents:** Native file selection and indexing for `.pdf`, `.docx`, `.doc`, `.txt`, `.md`, and `.xlsx`.
  - **Live Browser Tabs:** Real-time Chromium SNSS session binary decoding and SQLite history discovery across Brave, Chrome, Edge, and Opera with dynamic UI refresh.
- **Bring Your Own Model (BYOM) Flexibility:** Support local Ollama models alongside cloud providers (NVIDIA NIM, Google Gemini, OpenAI, Anthropic Claude) through a unified gateway.
- **Autonomous Self-Healing:** Diagnose errors, generate AST-aware patches, and execute verification test loops in a network-isolated Docker sandbox (`--network none`).
- **Clean Session Isolation:** Prevent stale chunk cross-contamination with 1-click source reindexing and complete index clearing.

---

## 4. User Persona & Target Stakeholders
- **Security-Conscious Software Engineers:** Working on proprietary codebases where cloud transmission is restricted.
- **Enterprise Security & Compliance Teams:** Requiring air-gapped or audited development tooling with tamper-evident logs.
- **Full-Stack Developers:** Requiring high-speed semantic search across multi-repository workspaces, documentation, and live research tabs simultaneously.

---

## 5. Functional Requirements

### P0: Core Retrieval & Privacy Foundation
- **Tree-sitter AST Chunking:** Syntactic decomposition of code into semantic blocks based on class and function boundaries (Python, TypeScript, JavaScript, Rust, Go, Java, C++).
- **Secret Sanitization:** Ingestion-time regex and Shannon entropy scanner redacting credentials and tokens before indexing, with diff inspection.
- **Moss Zero-DB Local Retrieval:** In-memory vector search utilizing `inferedge-moss-core` with sub-10ms query execution and dynamic alpha blending (BM25 keyword vs vector similarity).
- **Live Chromium Tab Detection:** Low-level Win32 shared-access parsing of Chromium SNSS binary session packets (`Sessions/Session_*`, `Tabs_*`) and real-time SQLite history integration to discover live open tabs without locking errors.
- **Dynamic Live Tab Refresh:** UI-level refresh trigger allowing instant discovery and re-indexing of newly opened browser tabs during active development sessions.
- **Privacy Ledger:** Continuous OS socket polling tracking all external network connections and logging authorized events to an immutable SHA-256 hash-chained SQLite table.
- **Local Ollama Integration:** Direct token streaming and model management across all locally pulled Ollama models.

### P1: Model Agility & Observability
- **Bring Your Own Model (BYOM) Gateway:** In-app configuration dialog for external API keys (NVIDIA NIM, Google Gemini, OpenAI, Claude, OpenRouter) with real-time key testing and model selection.
- **Active Working Workspace Bar:** Clear interface indicators showing the currently active repository path, document file, or tab count with 1-click **[Reindex]** and **[Clear Index]** controls.
- **Alpha-Blend Slider (0.0 to 1.0):** Interactive slider dynamically re-ranking results between BM25 keyword matching and vector semantic similarity in raw retrieval mode.
- **Recall@3 Evaluation Harness:** Automated benchmark suite measuring retrieval accuracy across a 25-pair golden Q&A dataset.
- **Sub-10ms Latency Race:** Side-by-side benchmark widget comparing Moss retrieval latency against a naive linear search baseline.
- **Cryptographic Integrity Verification:** One-click recomputation and validation of the entire SHA-256 audit ledger chain.

### P2: Autonomous Healing & Voice Pipeline
- **Containerized Code Repair:** Multi-stage diagnostic, patch generation, and test verification cycle running inside a local Docker container with `--network none` and strict resource caps (512MB RAM, 1 CPU).
- **LiveKit Audio Streaming:** Local voice capture and streaming server enabling push-to-talk speech interactions with hotword detection.
- **Tauri v2 Desktop Packaging:** Native cross-platform desktop shell wrapping the Next.js frontend with low memory overhead.

---

## 6. System Architecture & Component Interactions

```
+---------------------------------------------------------------------------------------------------+
|                                        FRONTEND INTERFACES                                        |
|  Next.js 14 App Router / Material 3 Expressive Design / Native Tauri v2 Shell Window              |
|                                                                                                   |
|  - Consolidated Mode Switch: [ AI Agent (RAG) | Semantic Search (Raw Retrieval) ]                 |
|  - Source Scope Switcher: [ All Sources | Codebase | Notes & Docs | Browser Tabs ]                |
|  - Real-Time Tab Refresh & Active Workspace Target Action Bar (Reindex / Clear)                   |
|  - Bring Your Own Model (BYOM) Modal with Branded Provider Launchers                              |
+-------------------------------------------------+-------------------------------------------------+
                                                  | REST API / SSE / WebSocket
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                      FASTAPI BACKEND ENGINE                                       |
|                                                                                                   |
|  +---------------------+   +---------------------+   +---------------------+   +----------------+ |
|  | Multi-Source Ingest |   |   Moss Engine Core  |   | Unified LLM Gateway |   | Privacy Ledger | |
|  | - TreeSitter AST    |   | - In-Memory HNSW    |   | - Local Ollama      |   | - Win32 Sockets| |
|  | - PDF/DOCX/XLSX/MD  |   | - Sub-10ms Search   |   | - NVIDIA NIM        |   | - SHA-256 Chain| |
|  | - Chromium SNSS/Hist|   | - Dynamic Alpha     |   | - Gemini / OpenAI   |   | - Tamper Audit | |
|  +---------------------+   +---------------------+   +---------------------+   +----------------+ |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  |                                  AUTONOMOUS HEALING & EVAL                                  |  |
|  |  - Docker Container Sandbox (--network none)       - Recall@3 Golden Evaluation Suite       |  |
|  |  - AST Diff Generation & Patch Validation          - Latency Race vs Linear Search          |  |
|  +---------------------------------------------------------------------------------------------+  |
+---------------------------------------------------------------------------------------------------+
```

---

## 7. Data Storage & Schema Specifications

### 1. In-Memory Vector Store
- Binary vector representations managed by `inferedge-moss-core` cached in host RAM for low-latency retrieval.

### 2. SQLite Database (`backend/data/reshidual.db`)
- **`Chunks` Table:**
  - `id` (TEXT PRIMARY KEY)
  - `file_path` (TEXT)
  - `start_line` (INTEGER)
  - `end_line` (INTEGER)
  - `raw_content` (TEXT)
  - `redacted_content` (TEXT)
  - `raw_content_hash` (TEXT)
  - `language` (TEXT)
  - `symbol_name` (TEXT)
  - `symbol_type` (TEXT)
  - `created_at` (TIMESTAMP)
- **`chunks_fts` (Virtual FTS5 Table):**
  - Full-text search index linked to raw content for BM25 keyword matching.
- **`AuditLog` Table (Cryptographic Chain):**
  - `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
  - `event_type` (TEXT)
  - `payload` (TEXT)
  - `timestamp` (TEXT)
  - `prev_row_hash` (TEXT) - `SHA-256(prev_row_hash + payload + timestamp)`
- **`Sessions` Table:**
  - `session_id` (TEXT UNIQUE PRIMARY KEY)
  - `context` (TEXT JSON)
  - `updated_at` (TIMESTAMP)

---

## 8. Non-Functional & Performance Requirements
- **Query Latency:** p95 retrieval latency < 10ms for indices up to 100,000 chunks.
- **Zero-Leak Guarantee:** 0 unexpected outbound network connections recorded during active operations.
- **Offline Parity:** Full conversational RAG functionality maintained when disconnected from the internet using local Ollama models.
- **Cross-Platform Compatibility:** Windows 10/11, macOS, and Linux support via Tauri v2 and Python.

---

## 9. Verification & Acceptance Criteria
1. **Moss SDK Retrieval:** `python verify_moss_integration.py` successfully verifies local AST parsing, secret redaction, and in-memory query execution.
2. **Dynamic Live Tab Detection:** Browser tab detector discovers all open tabs across running Chromium browsers (Brave, Chrome, Edge, Opera) without locking contention, with real-time UI refresh.
3. **Session Cleanliness:** Re-indexing or selecting a new workspace flushes previous chunks clean and prevents session pollution.
4. **Production Build:** `npm run build` succeeds with exit code 0 across all static routes.
5. **Backend Compilation:** `python -m compileall backend` passes with exit code 0.