# Reshidual Agent: Comprehensive System Architecture & Deep Dive into Moss

---

### Project Credentials & Authors
- **Eshwar G**
- **Shivani R**

---

## Part 1: Complete Explanation of What Has Been Built

**Reshidual Agent** is a local-first, privacy-verifiable AI engineering copilot and developer workspace. It eliminates the "Privacy Tax" (exchanging intellectual property or proprietary source code for AI productivity) by bringing retrieval, privacy auditing, and codebase analysis directly onto the developer's workstation.

### 1. Multi-Source Context Ingestion Engine
Unlike standard tools that only index local git repositories, Reshidual Agent ingests three distinct context streams into a single unified workspace:
- **Codebases (AST-Aware Chunking):** Uses Tree-sitter grammars (Python, TypeScript/JavaScript, Rust) to partition source files along logical class and function boundaries rather than arbitrary line counts, preserving complete semantic code scopes.
- **Notes and Documents:** Native document extractors parse `.pdf` (PyPDF), `.docx` (python-docx), `.xlsx` (openpyxl), `.txt`, and `.md` files via native file picker dialogs.
- **Live Chromium Browser Tabs:** Directly decodes Chromium `Sessions/Session_*` and `Tabs_*` SNSS binary packets alongside SQLite `History` files across Google Chrome, Brave, Microsoft Edge, and Opera using non-locking Win32 shared file handles (`FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE`). A live **Refresh Tabs** trigger allows developers to pull in newly opened research tabs on the fly without restarting the agent or causing browser file locks.
- **Source Isolation & Clean Workspace:** Each source category (codebase, documents, browser tabs) can be filtered, re-indexed, or wiped independently with 1-click index clearing to prevent cross-session stale chunk contamination.

### 2. Pre-Flight Privacy Sanitization & Cryptographic Ledger
- **Secret Scanner:** Before any code or text reaches the index or an LLM, a multi-stage sanitizer executes regex pattern matching and Shannon entropy analysis ($H > 4.5$) to detect and redact API keys (AWS, GitHub, Stripe, OpenAI), JWT tokens, private SSH keys, and credentials into `[REDACTED:reason]` tokens.
- **OS Socket Monitoring:** An asynchronous background auditor continuously polls operating system socket tables (`/proc/net/tcp` on Linux, Win32 socket table on Windows) to verify that no unexpected outbound network connections are established.
- **Cryptographic Audit Ledger:** Security and operational events are recorded into an SQLite database with SHA-256 hash-chaining ($\text{Hash}_n = \text{SHA256}(\text{Hash}_{n-1} + \text{Payload}_n + \text{Timestamp}_n)$), providing mathematical proof of audit trail integrity that can be re-verified with one click in the UI.

### 3. Unified LLM Gateway & Bring Your Own Model (BYOM)
Developers can choose between two operational tiers:
- **100% Offline Local Inference:** Connects directly to local **Ollama** daemons (Llama 3.1, Qwen2.5-Coder, DeepSeek-Coder, Mistral).
- **High-Speed External Cloud Providers:** An in-app BYOM management hub allows developers to input API keys and select models across **NVIDIA NIM**, **Google Gemini**, **OpenAI**, **Anthropic Claude**, and **OpenRouter**.
- **Context Injection Boundary:** External LLMs **never** see or scan the developer's filesystem. They only receive the exact, sanitized context snippets retrieved by Moss for that specific prompt.

### 4. Autonomous Code Self-Healing & Local Patch Runner
- When a bug or test failure is submitted, the system retrieves relevant AST context via Moss, generates a fix hypothesis and unified diff via the active LLM, and tests the patch using `backend/services/local_runner.py`.
- The local runner applies patches in isolated temporary workspaces with strict execution timeouts, capturing test output and running retry loops before presenting the diff to the developer for final review.

### 5. Benchmark Suite & Desktop Application
- **Recall@3 Eval Harness:** Evaluates retrieval precision against a 25-item golden question benchmark and measures latency races against naive linear search.
- **Desktop Application:** Packaged using **Tauri v2** (Rust shell) wrapping a **Next.js 14** (App Router, Tailwind CSS, Material 3 Expressive design) frontend and a **FastAPI** Python 3.11+ backend.

---

## Part 2: How Moss is Used in Our Retrieval Layer

In `backend/services/moss_engine.py`, **Moss** serves as the core **Zero-DB in-memory retrieval engine**.

```
[ Chunk Stream (AST / Documents / Browser Tabs) ]
                        │
                        ▼
            [ Secret Redaction Filter ]
                        │
                        ▼
           [ Moss SDK Ingestion Layer ]
        moss.Client(project_id, project_key)
  ┌──────────────────────────────────────────────┐
  │  - Vector Embedding Generation & Sync        │
  │  - In-Memory HNSW Graph Indexing             │
  │  - Inverted BM25 Sparse Index Construction   │
  └──────────────────────┬───────────────────────┘
                         │
        User Query: "How does token refresh work?"
                         │
                         ▼
        [ Moss Hybrid Search Execution ]
  ┌──────────────────────────────────────────────┐
  │  Dense Vector Score  (Semantic Meaning)      │
  │          +                                   │
  │  Sparse BM25 Score   (Exact Keywords)        │
  │                                              │
  │  Blended = α * Semantic + (1 - α) * Keyword  │
  │                                              │
  │  - Latency: < 10ms (In-Memory)               │
  │  - Source filtering: Codebase / Notes / Tabs │
  └──────────────────────┬───────────────────────┘
                         │
                         ▼
            [ Top Ranked Context Chunks ]
  (Injected into LLM prompt with file/line citations)
```

1. **Client Lifecycle:** The backend initializes the official `moss.Client` with project credentials managed via dependency injection.
2. **Metadata-Rich Chunk Indexing:** Every chunk is indexed with its text and rich metadata (file path, line ranges, symbol name, language, source category).
3. **Dynamic Alpha-Blend Hybrid Retrieval:** Moss performs simultaneous vector similarity search and BM25 sparse keyword matching, blending them via the dynamic alpha parameter:
   $$\text{Blended Score} = \alpha \cdot \text{Semantic Score} + (1 - \alpha) \cdot \text{Keyword Score}$$
4. **Explainable Retrieval:** Moss outputs granular component scores, allowing the frontend to display visual score distribution bars and "why-matched" explanations (e.g., distinguishing between exact keyword matches on identifiers vs. conceptual semantic matches).

---

## Part 3: Why Moss Over Traditional Vector Databases?

When architecting a local-first AI development tool, traditional vector databases (Pinecone, ChromaDB, Milvus, Weaviate, Qdrant, or pgvector) introduce significant architectural friction. Below is why Moss was selected over conventional vector databases:

| Feature / Dimension | Traditional Vector Databases (Chroma, Milvus, Pinecone, Qdrant) | Moss (Zero-DB In-Memory Engine) |
|---|---|---|
| **Architecture** | Heavy standalone database daemon, container, or cloud service | Lightweight in-memory engine embedded directly via SDK |
| **Retrieval Latency** | 50ms – 250ms (Network round-trip, disk I/O, IPC socket overhead) | **Sub-10ms** execution directly in RAM |
| **System Footprint** | Requires 1GB – 4GB+ RAM, Docker containers, or background daemon processes | Negligible runtime overhead; zero background daemon footprint |
| **Air-Gap & Zero-Leak** | Cloud DBs (Pinecone) leak code embeddings to third-party servers; self-hosted DBs (Milvus) require complex port management | Operates locally in memory; complies with strict zero-leak policies |
| **Hybrid Search Support** | Requires setting up separate search engines (e.g., Elasticsearch + Qdrant) or complex SQL joining | **Native Hybrid Search** out of the box (Dense Vector + BM25 Sparse matching) |
| **Dynamic Tuning** | Hardcoded or complex re-indexing to adjust search behavior | Dynamic real-time **Alpha slider** ($0.0 \le \alpha \le 1.0$) adjustable per query |
| **Index Lifecycle & Isolation** | Deleting collections or updating embeddings causes disk fragmentation and stale cache locks | Immediate, granular source-level memory clearing and reindexing |

### Deep-Dive Comparison: Key Advantages of Moss

### 1. Zero Infrastructure & Zero Daemon Dependency ("Zero-DB")
- **Traditional Vector DBs:** Require running separate server processes, spinning up heavy Docker containers (e.g., Milvus with etcd and MinIO), or connecting to cloud services (Pinecone). In a desktop developer tool, requiring a user to run a database daemon creates installation failures, port conflicts, and high memory usage.
- **Moss:** Functions as an embedded, zero-infrastructure library. There are no secondary services to start, no ports to bind, and no container runtimes required.

### 2. Sub-10ms In-Memory Latency
- **Traditional Vector DBs:** In a standard RAG pipeline, querying an external or disk-backed vector database incurs network latency, serialization/deserialization overhead, and disk read latency, typically totaling 50ms to 200ms before LLM generation even begins.
- **Moss:** Runs in-memory HNSW vector traversal and sparse scoring simultaneously. Query execution takes **less than 10ms**, making the retrieval step virtually instantaneous to the developer.

### 3. Native Hybrid Search Without Dual-Engine Complexity
- Codebase search fails when using vector-only retrieval because exact variable names, function signatures, error codes, and library imports (`import aiosqlite`, `def execute_patch`) require exact lexical matching, while conceptual queries ("where is authentication handled?") require dense semantic understanding.
- **Traditional Vector DBs:** Often only support vector embeddings. Supporting hybrid search usually requires running an inverted index (like Tantivy or Lucene) alongside the vector store and writing custom reciprocal rank fusion (RRF) logic.
- **Moss:** Delivers unified hybrid search natively. It indexes both dense embeddings and sparse BM25 terms simultaneously, allowing our application to expose an instant alpha slider where developers can tune retrieval between pure keyword ($\alpha = 0.0$) and pure semantic ($\alpha = 1.0$).

### 4. Preservation of Local Data Sovereignty
- Cloud-hosted vector databases require uploading raw code embeddings to remote infrastructure. With modern embedding inversion techniques, dense code embeddings can often be reconstructed back into source code, creating significant enterprise intellectual property risks.
- Moss ensures retrieval indexing and vector operations remain bounded within the client session, maintaining the zero-leak integrity validated by our Privacy Ledger.

### 5. Clean Workspace Isolation and Instant Index Eviction
- Traditional vector databases handle updates and deletions through tombstones and background compaction, leading to index bloat and stale context retention.
- With Moss, our engine maintains discrete source partitions. When a developer switches active branches, closes browser tabs, or clicks **Clear Sources**, Moss immediately purges those specific vectors from memory, guaranteeing that subsequent queries never hallucinate on outdated chunks.
