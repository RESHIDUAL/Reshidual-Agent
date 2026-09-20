from fastapi import APIRouter, Depends

from backend.models.schemas import AppSettings
from backend.dependencies import get_database_manager, get_privacy_ledger, get_moss_engine
from backend.models.database import DatabaseManager
from backend.services.privacy_ledger import PrivacyLedger
from backend.services.moss_engine import MossEngine
from backend.config import get_settings as get_env_settings

router = APIRouter(tags=["settings"])

@router.get("/settings", response_model=AppSettings)
async def get_settings(
    db_manager: DatabaseManager = Depends(get_database_manager),
    moss_engine: MossEngine = Depends(get_moss_engine)
):
    env_settings = get_env_settings()
    settings = AppSettings(
        theme="system",
        ollama_model="llama3.1:8b",
        livekit_port=env_settings.LIVEKIT_PORT,
        mic_device="default",
        alpha_default=env_settings.ALPHA_DEFAULT,
        redaction_sensitivity=env_settings.REDACTION_SENSITIVITY,
        moss_project_id=getattr(moss_engine, "project_id", "") or env_settings.MOSS_PROJECT_ID,
        moss_project_key=getattr(moss_engine, "project_key", "") or env_settings.MOSS_PROJECT_KEY,
        moss_last_synced="",
        confidence_threshold=0.6
    )
    return settings

@router.put("/settings", response_model=AppSettings)
async def update_settings(
    settings: AppSettings,
    db_manager: DatabaseManager = Depends(get_database_manager),
    privacy_ledger: PrivacyLedger = Depends(get_privacy_ledger),
    moss_engine: MossEngine = Depends(get_moss_engine)
):
    if hasattr(db_manager, "save_settings"):
        db_manager.save_settings(settings.model_dump())
    if settings.moss_project_id and settings.moss_project_key:
        moss_engine.configure(settings.moss_project_id, settings.moss_project_key)

    safe_payload = settings.model_dump()
    if safe_payload.get("moss_project_key"):
        safe_payload["moss_project_key"] = "[PROTECTED]"

    await privacy_ledger.log_event("settings_changed", {"new_settings": safe_payload})
    return settings
