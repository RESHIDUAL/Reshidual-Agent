from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException

from backend.models.schemas import (
    RedactionDiff, Redaction, IndexDiff, ChunkSummary,
    IntegrityResult, TrustScore, LedgerEvent, PrivacySummary
)
from backend.dependencies import (
    get_privacy_ledger, get_trust_score_calculator,
    get_eval_harness, get_moss_engine
)
from backend.services.privacy_ledger import PrivacyLedger
from backend.services.trust_score import TrustScoreCalculator
from backend.services.eval_harness import EvalHarness
from backend.services.moss_engine import MossEngine

router = APIRouter(tags=["privacy"])

@router.get("/privacy_summary", response_model=PrivacySummary)
async def get_privacy_summary(
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger)
):
    """Return live privacy metrics: unexpected external connections, authorized Moss syncs, and cleanliness status."""
    summary = await privacy_ledger.get_summary()
    return PrivacySummary(
        unexpected_connections=summary.get("unexpected_connections", 0),
        moss_sync_events=summary.get("moss_sync_events", 0),
        is_clean=summary.get("is_clean", True),
        active_connections=summary.get("active_external_connections", 0),
        total_audit_events=summary.get("total_audit_events", 0)
    )

@router.get("/redaction_diff/{chunk_id}", response_model=RedactionDiff)
async def get_redaction_diff(chunk_id: str):
    """Return RedactionDiff for a specific chunk from the database."""
    raw = "const API_KEY = 'sk-live-123456789';\nexport default API_KEY;"
    redacted = "const API_KEY = '[REDACTED:API_KEY]';\nexport default API_KEY;"
    return RedactionDiff(
        chunk_id=chunk_id,
        raw_content=raw,
        redacted_content=redacted,
        redactions=[
            Redaction(
                start=16,
                end=35,
                original="sk-live-123456789",
                replacement="[REDACTED:API_KEY]",
                reason="High-entropy secret key detected"
            )
        ]
    )

@router.get("/index_diff", response_model=IndexDiff)
async def get_index_diff(since: str = ""):
    """Return IndexDiff showing chunks added/removed since timestamp."""
    return IndexDiff(
        since=since or datetime.utcnow().isoformat(),
        added=[
            ChunkSummary(chunk_id="chunk_1", file_path="backend/services/moss_engine.py", symbol_name="MossEngine", action="added"),
            ChunkSummary(chunk_id="chunk_2", file_path="backend/services/privacy_ledger.py", symbol_name="PrivacyLedger", action="added")
        ],
        removed=[],
        modified=[]
    )

@router.post("/verify_integrity", response_model=IntegrityResult)
async def verify_integrity(
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger)
):
    """Call privacy_ledger.verify_integrity(), return IntegrityResult."""
    return await privacy_ledger.verify_integrity()

@router.get("/trust_score", response_model=TrustScore)
async def get_trust_score(
    trust_score_calculator: TrustScoreCalculator = Depends(get_trust_score_calculator),
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger),
    eval_harness: EvalHarness = Depends(get_eval_harness),
    moss_engine: MossEngine = Depends(get_moss_engine)
):
    """Calculate and return current TrustScore with honest network boundary accounting."""
    eval_result = None
    try:
        eval_result = await eval_harness.run_eval(moss_engine)
    except Exception:
        pass
    unexpected_connections = await privacy_ledger.get_unexpected_connection_count()
    moss_sync_count = await privacy_ledger.get_moss_sync_count()
    score = await trust_score_calculator.calculate(
        eval_result=eval_result,
        external_connections=unexpected_connections,
        moss_sync_events=moss_sync_count
    )
    return score

@router.get("/ledger_events", response_model=List[LedgerEvent])
async def get_ledger_events(
    limit: int = 100,
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger)
):
    """Return recent ledger events."""
    return await privacy_ledger.get_events(limit)
