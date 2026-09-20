import time
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.models.schemas import EvalResult
from backend.dependencies import get_eval_harness, get_moss_engine
from backend.services.eval_harness import EvalHarness
from backend.services.moss_engine import MossEngine

router = APIRouter(tags=["eval"])

class LatencyRaceResult(BaseModel):
    query: str
    moss_latency_ms: float
    naive_latency_ms: float
    winner: str

@router.post("/run_eval", response_model=EvalResult)
async def run_eval(
    eval_harness: EvalHarness = Depends(get_eval_harness),
    moss_engine: MossEngine = Depends(get_moss_engine)
):
    return await eval_harness.run_eval(moss_engine)

@router.get("/latency_race", response_model=LatencyRaceResult)
async def latency_race(
    query: str,
    moss_engine: MossEngine = Depends(get_moss_engine)
):
    start = time.perf_counter()
    try:
        await moss_engine.query(query, alpha=0.5)
    except Exception:
        pass
    moss_latency = (time.perf_counter() - start) * 1000.0
    
    start = time.perf_counter()
    await moss_engine.naive_search(query)
    naive_latency = (time.perf_counter() - start) * 1000.0
    
    winner = "moss" if moss_latency <= naive_latency else "naive"
    
    return LatencyRaceResult(
        query=query,
        moss_latency_ms=round(moss_latency, 2),
        naive_latency_ms=round(naive_latency, 2),
        winner=winner
    )
