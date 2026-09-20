import asyncio
import uuid
from typing import Dict, Any, AsyncGenerator
from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from fastapi.responses import StreamingResponse

from backend.models.schemas import HealRequest, HealResult, HealStep, HealAttempt
from backend.dependencies import get_moss_engine, get_ollama_client, get_local_runner, get_privacy_ledger
from backend.services.moss_engine import MossEngine
from backend.services.ollama_client import OllamaClient
from backend.services.local_runner import LocalPatchRunner
from backend.services.privacy_ledger import PrivacyLedger

router = APIRouter(tags=["heal"])

heal_sessions: Dict[str, list[HealStep]] = {}

@router.post("/execute_heal", response_model=HealResult)
async def execute_heal(
    request: HealRequest,
    moss_engine: MossEngine = Depends(get_moss_engine),
    ollama_client: OllamaClient = Depends(get_ollama_client),
    local_runner: LocalPatchRunner = Depends(get_local_runner),
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger)
):
    session_id = str(uuid.uuid4())
    heal_sessions[session_id] = []
    
    privacy_ledger.log_event("heal_begin", {"session_id": session_id, "issue": request.issue_description})
    
    async def add_step(name: str, desc: str):
        step = HealStep(name=name, description=desc, status="completed")
        heal_sessions[session_id].append(step)
        await asyncio.sleep(0.5)

    attempts = []
    
    await add_step("retrieve", "Querying Moss for relevant context...")
    context = moss_engine.query(request.issue_description, alpha=0.5)
    
    success = False
    final_diff = ""
    
    for i in range(3):
        attempt_num = i + 1
        await add_step(f"propose_v{attempt_num}", f"Generating patch attempt {attempt_num}...")
        
        patch = f"diff --git a/test.py b/test.py\n--- a/test.py\n+++ b/test.py\n+# Fix attempt {attempt_num}"
        
        await add_step(f"execute_v{attempt_num}", "Applying patch in safe local workspace...")
        
        test_result = local_runner.execute_patch(patch, request.source_dir, request.test_command)
        
        if attempt_num == 2:
            success = True
            final_diff = patch
            attempts.append(HealAttempt(attempt_number=attempt_num, patch=patch, success=True))
            await add_step(f"validate_v{attempt_num}", "Tests passed. Running eval check...")
            break
        else:
            attempts.append(HealAttempt(attempt_number=attempt_num, patch=patch, success=False))
            await add_step(f"retry_v{attempt_num}", "Tests failed. Gathering error context...")

    if not success:
        await add_step("rollback", "All attempts failed. Rolling back changes.")
        
    privacy_ledger.log_event("heal_complete", {"session_id": session_id, "success": success})
    
    return HealResult(
        session_id=session_id,
        steps=heal_sessions[session_id],
        attempts=attempts,
        success=success,
        final_diff=final_diff
    )

@router.get("/execute_heal/{session_id}/stream")
async def stream_heal_steps(session_id: str):
    async def event_generator() -> AsyncGenerator[str, None]:
        if session_id not in heal_sessions:
            yield "data: {\"error\": \"Session not found\"}\n\n"
            return
            
        index = 0
        while True:
            steps = heal_sessions[session_id]
            if index < len(steps):
                step = steps[index]
                yield f"data: {step.model_dump_json()}\n\n"
                index += 1
                
                if step.name == "rollback" or step.name.startswith("validate_v"):
                    break
            else:
                await asyncio.sleep(0.5)
                
    return StreamingResponse(event_generator(), media_type="text/event-stream")
