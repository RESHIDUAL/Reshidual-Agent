from fastapi import APIRouter

from backend.routers.health import router as health_router
from backend.routers.ingest import router as ingest_router
from backend.routers.query import router as query_router
from backend.routers.heal import router as heal_router
from backend.routers.privacy import router as privacy_router
from backend.routers.ledger_ws import router as ledger_ws_router
from backend.routers.eval import router as eval_router
from backend.routers.voice import router as voice_router
from backend.routers.settings import router as settings_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(ingest_router)
api_router.include_router(query_router)
api_router.include_router(heal_router)
api_router.include_router(privacy_router)
api_router.include_router(ledger_ws_router)
api_router.include_router(eval_router)
api_router.include_router(voice_router)
api_router.include_router(settings_router)
