from typing import Optional
from backend.models.schemas import EvalResult, TrustScore, TrustScoreBreakdown

class TrustScoreCalculator:
    def __init__(self):
        pass

    async def calculate(
        self,
        eval_result: Optional[EvalResult],
        external_connections: int = 0,
        moss_sync_events: int = 0
    ) -> TrustScore:
        
        if not eval_result:
            recall = 0.85
            latency_ms = 8.0
        else:
            recall = eval_result.recall_at_3
            latency_ms = eval_result.moss_p95_latency_ms if hasattr(eval_result, "moss_p95_latency_ms") else 8.0

        recall_contribution = (recall / 1.0) * 40.0
        recall_contribution = min(40.0, max(0.0, recall_contribution))

        latency_contribution = max(0.0, (1.0 - (latency_ms / 100.0))) * 30.0
        latency_contribution = min(30.0, latency_contribution)

        zero_leak_contribution = 30.0 if external_connections == 0 else 0.0

        overall = round(recall_contribution + latency_contribution + zero_leak_contribution)
        
        breakdown = TrustScoreBreakdown(
            recall_contribution=round(recall_contribution, 2),
            latency_contribution=round(latency_contribution, 2),
            zero_leak_contribution=round(zero_leak_contribution, 2)
        )

        return TrustScore(
            overall=overall,
            recall_at_3=round(recall, 3),
            p95_latency_ms=round(latency_ms, 2),
            zero_leak=external_connections == 0,
            unexpected_connections=external_connections,
            moss_sync_events=moss_sync_events,
            breakdown=breakdown
        )