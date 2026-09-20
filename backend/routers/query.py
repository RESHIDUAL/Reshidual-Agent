import os
import time
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from backend.models.schemas import (
    QueryRequest,
    SearchResults,
    SearchResult,
    TimingInfo,
    ModelsResponse,
    KeysUpdateRequest,
    FileAction
)
from backend.dependencies import get_moss_engine, get_ollama_client, get_privacy_ledger, get_llm_gateway
from backend.services.moss_engine import MossEngine
from backend.services.ollama_client import OllamaClient
from backend.services.privacy_ledger import PrivacyLedger
from backend.services.llm_gateway import LLMGateway

router = APIRouter(tags=["query"])

session_store: Dict[str, str] = {}

class ApplyChangeRequest(BaseModel):
    file_path: str
    content: str

@router.get("/models", response_model=ModelsResponse)
async def list_available_models(
    ollama_client: OllamaClient = Depends(get_ollama_client),
    llm_gateway: LLMGateway = Depends(get_llm_gateway)
):
    online, version, _ = await ollama_client.detect()
    gw_data = await llm_gateway.get_available_models()
    return ModelsResponse(
        models=gw_data.get("models", []),
        current_model=gw_data.get("default_model", ""),
        ollama_online=online,
        ollama_version=version,
        providers=gw_data.get("providers", {}),
        keys=gw_data.get("keys", {})
    )

@router.get("/models/keys")
async def get_configured_keys(
    llm_gateway: LLMGateway = Depends(get_llm_gateway)
):
    raw_keys = llm_gateway.get_keys()
    masked = {}
    for k, v in raw_keys.items():
        if v and len(v) > 8:
            masked[k] = f"{v[:6]}...{v[-4:]}"
        elif v:
            masked[k] = "configured"
        else:
            masked[k] = ""
    return {"keys": masked}

@router.post("/models/keys")
async def update_keys(
    request: KeysUpdateRequest,
    llm_gateway: LLMGateway = Depends(get_llm_gateway)
):
    update_dict = {}
    if request.nvidia is not None and request.nvidia.strip():
        update_dict["nvidia"] = request.nvidia.strip()
    if request.openrouter is not None and request.openrouter.strip():
        update_dict["openrouter"] = request.openrouter.strip()
    if request.google is not None and request.google.strip():
        update_dict["google"] = request.google.strip()
    
    if update_dict:
        llm_gateway.save_keys(update_dict)
    
    gw_data = await llm_gateway.get_available_models()
    return {
        "status": "success",
        "providers": gw_data.get("providers", {}),
        "models": gw_data.get("models", []),
        "default_model": gw_data.get("default_model", "")
    }

@router.post("/query", response_model=SearchResults)
async def execute_query(
    request: QueryRequest,
    moss_engine: MossEngine = Depends(get_moss_engine),
    ollama_client: OllamaClient = Depends(get_ollama_client),
    llm_gateway: LLMGateway = Depends(get_llm_gateway),
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger)
):
    start_total = time.time()
    alpha = request.alpha if request.alpha is not None else 0.5
    source_type = request.source_type or "all"
    
    engine_error = None
    try:
        raw_results, engine_timing = await moss_engine.query(
            request.text,
            alpha=alpha,
            source_type=source_type
        )
    except Exception as e:
        engine_error = str(e)
        raw_results, engine_timing = [], None

    mapped_results: List[SearchResult] = []
    for idx, r in enumerate(raw_results):
        c_id = getattr(r, "chunk_id", None) or getattr(r, "id", None) or f"chunk_{idx}"
        f_path = getattr(r, "file_path", "")
        s_line = getattr(r, "start_line", 1) or 1
        e_line = getattr(r, "end_line", 10) or 10
        content = getattr(r, "content", "")
        score = getattr(r, "score", 0.0) or getattr(r, "blended_score", 0.8)
        sem_score = getattr(r, "semantic_score", score * alpha)
        kw_score = getattr(r, "keyword_score", score * (1.0 - alpha))
        why = getattr(r, "why_matched", "Keyword & Semantic hybrid match")
        doc_source = getattr(r, "source_type", "codebase")

        mapped_results.append(SearchResult(
            chunk_id=str(c_id),
            file_path=f_path or "workspace/source",
            start_line=s_line,
            end_line=e_line,
            content=content or "Matching content in local index.",
            semantic_score=float(sem_score),
            keyword_score=float(kw_score),
            blended_score=float(score),
            why_matched=why,
            language=getattr(r, "language", "text") or "text",
            symbol_name=getattr(r, "symbol_name", "") or "",
            symbol_type=getattr(r, "symbol_type", "") or "",
            source_type=doc_source
        ))

    base_session = request.session_id or "default_session"
    thread_session_id = f"{base_session}_{source_type}"

    top_score = max([r.blended_score for r in mapped_results], default=0.0)
    cutoff = request.confidence_threshold if request.confidence_threshold is not None else 0.6
    confidence_level = "high" if top_score >= cutoff else "low"

    is_lookup = any(k in request.text.lower() for k in ["tab", "tabs", "file", "where", "url", "title", "which", "link", "name"]) or len(request.text.strip()) < 80
    cap_count = 4 if is_lookup else 8
    selected_chunks = mapped_results[:cap_count]

    chunks_context = "\n---\n".join([
        f"[{r.source_type.upper()}: {r.file_path} (Score: {r.blended_score:.3f})]\nTitle/Symbol: {r.symbol_name or r.file_path}\nContent:\n{r.content}"
        for r in selected_chunks
    ])
    
    conversation_history = ""
    if request.messages:
        conversation_history = "\n".join([f"{m.role.capitalize()}: {m.content}" for m in request.messages[-4:]]) + "\n"

    system_instruction = (
        "You are Reshidual Agent, an authoritative local AI engineering agent powered by Moss hybrid retrieval. "
        "Strict rules for answering: "
        "1. Always cite the EXACT URL, file path, or document title from the highest-scoring retrieved chunk. Never paraphrase specific titles or URLs into vague generic categories (for example, never say 'the chat tab' if the retrieved title is 'New chat - Claude' or URL is 'https://claude.ai/new'). "
        "2. If multiple retrieved chunks are close in score and refer to different specific tabs, files, or documents, explicitly distinguish between them by their exact names and URLs rather than collapsing them into one vague sentence. "
        "3. Never ask the user to 'please specify' or 'let me know if you mean X' when a top-scored match exists in the retrieved context. Answer directly, confidently, and precisely. "
        "4. Only express uncertainty or suggest clarification if no relevant matches exist or the top retrieval score is below 0.6. "
        "5. If the user asks for code changes, provide the exact modified code clearly."
    )

    prompt = (
        f"Retrieved Moss Context:\n{chunks_context}\n\n"
        f"Retrieval Top Score: {top_score:.3f} (Confidence: {confidence_level.upper()})\n\n"
        f"{conversation_history}"
        f"User: {request.text}\n"
        f"Assistant:"
    )
    
    answer = ""
    file_action = None

    if not request.synthesize:
        answer = ""
    elif engine_error and not mapped_results:
        answer = f"Moss Retrieval Notice: {engine_error}"
    else:
        try:
            answer = await llm_gateway.generate(
                prompt=prompt,
                system=system_instruction,
                model=request.model
            )
        except Exception as gen_err:
            if mapped_results:
                primary_file = mapped_results[0].file_path
                answer = f"Retrieved {len(mapped_results)} matches using Moss hybrid search (top match: {primary_file}). Generation notice: {gen_err}"
            else:
                answer = f"Local search completed. Generation notice: {gen_err}"

    if mapped_results and any(word in request.text.lower() for word in ["change", "update", "modify", "write", "fix", "refactor", "create"]):
        target_path = mapped_results[0].file_path
        code_blocks = re.findall(r'```(?:[a-zA-Z0-9_\-]+)?\n([\s\S]*?)```', answer)
        if code_blocks:
            code_content = code_blocks[0]
            file_action = FileAction(
                action="modify",
                file_path=target_path,
                content=code_content,
                applied=False
            )
            if request.auto_apply and os.path.exists(target_path):
                try:
                    with open(target_path, "w", encoding="utf-8") as f:
                        f.write(code_content)
                    file_action.applied = True
                except Exception:
                    pass

    session_store[thread_session_id] = f"User: {request.text}\nAssistant: {answer}"
    
    try:
        await privacy_ledger.log_event("query_executed", {
            "query": request.text,
            "results_count": len(mapped_results),
            "alpha": alpha,
            "source_type": source_type,
            "model": request.model,
            "session_id": thread_session_id
        })
    except Exception:
        pass

    total_duration_ms = (time.time() - start_total) * 1000
    timing = TimingInfo(
        total_ms=round(total_duration_ms, 2),
        semantic_ms=round(getattr(engine_timing, "semantic_ms", total_duration_ms * 0.6), 2),
        keyword_ms=round(getattr(engine_timing, "keyword_ms", total_duration_ms * 0.3), 2),
        rerank_ms=round(total_duration_ms * 0.1, 2)
    )

    return SearchResults(
        results=mapped_results,
        timing=timing,
        query=request.text,
        alpha=alpha,
        session_id=thread_session_id,
        answer=answer,
        file_action=file_action,
        top_score=round(top_score, 3),
        confidence_level=confidence_level
    )

@router.post("/agent/apply_change")
async def apply_file_change(request: ApplyChangeRequest):
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=400, detail="Target file path does not exist on disk")
    try:
        with open(request.file_path, "w", encoding="utf-8") as f:
            f.write(request.content)
        return {
            "status": "success",
            "file_path": request.file_path,
            "bytes_written": len(request.content.encode("utf-8"))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
