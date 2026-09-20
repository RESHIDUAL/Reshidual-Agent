from fastapi import APIRouter, Depends

from backend.dependencies import (
    get_moss_engine,
    get_ollama_client,
    get_docker_sandbox,
    get_livekit_service
)
from backend.services.moss_engine import MossEngine
from backend.services.ollama_client import OllamaClient
from backend.services.docker_sandbox import DockerSandbox
from backend.services.livekit_service import LiveKitService
from backend.models.schemas import HealthStatus

router = APIRouter(tags=["health"])

@router.get("/health", response_model=HealthStatus)
async def health_check(
    moss_engine: MossEngine = Depends(get_moss_engine),
    ollama_client: OllamaClient = Depends(get_ollama_client),
    docker_sandbox: DockerSandbox = Depends(get_docker_sandbox),
    livekit_service: LiveKitService = Depends(get_livekit_service)
):
    ollama_ok, version, models = False, "", []
    try:
        ollama_ok, version, models = await ollama_client.detect()
    except Exception:
        pass
    
    docker_ok = False
    try:
        docker_ok = await docker_sandbox.is_available()
    except Exception:
        pass
        
    livekit_ok = False
    try:
        livekit_ok = await livekit_service.check_health()
    except Exception:
        pass
        
    moss_configured = getattr(moss_engine, "is_configured", False)
    
    return HealthStatus(
        ollama=ollama_ok,
        moss=True,
        docker=docker_ok,
        livekit=livekit_ok,
        models=models,
        ollama_version=version or "",
        moss_configured=moss_configured,
        status="ok"
    )
