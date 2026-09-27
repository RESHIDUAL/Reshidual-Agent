import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends

from backend.dependencies import get_privacy_ledger
from backend.services.privacy_ledger import PrivacyLedger

router = APIRouter(tags=["ledger_ws"])

@router.websocket("/subscribe_ledger")
async def subscribe_ledger(
    websocket: WebSocket,
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger)
):
    await websocket.accept()
    
    initial_count = await privacy_ledger.get_external_connection_count()
    await websocket.send_json({"type": "init", "external_connections": initial_count})
    
    queue = privacy_ledger.subscribe()

    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                event_data = event.model_dump() if hasattr(event, "model_dump") else event
                await websocket.send_json({"type": "event", "data": event_data})
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "heartbeat"})
    except WebSocketDisconnect:
        pass
    finally:
        privacy_ledger.unsubscribe(queue)
