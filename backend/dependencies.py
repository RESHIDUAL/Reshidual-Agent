import logging
from typing import Optional

from backend.services.moss_engine import MossEngine
from backend.services.ollama_client import OllamaClient
from backend.services.privacy_ledger import PrivacyLedger
from backend.services.secret_scanner import SecretScanner
from backend.services.docker_sandbox import DockerSandbox
from backend.services.eval_harness import EvalHarness
from backend.services.trust_score import TrustScoreCalculator
from backend.services.livekit_service import LiveKitService
from backend.models.database import DatabaseManager
from backend.services.llm_gateway import LLMGateway

logger = logging.getLogger(__name__)

class DependencyContainer:
    _moss_engine: Optional[MossEngine] = None
    _ollama_client: Optional[OllamaClient] = None
    _privacy_ledger: Optional[PrivacyLedger] = None
    _secret_scanner: Optional[SecretScanner] = None
    _docker_sandbox: Optional[DockerSandbox] = None
    _eval_harness: Optional[EvalHarness] = None
    _trust_score_calculator: Optional[TrustScoreCalculator] = None
    _livekit_service: Optional[LiveKitService] = None
    _database_manager: Optional[DatabaseManager] = None
    _llm_gateway: Optional[LLMGateway] = None
    _moss_initialized: bool = False
    _ledger_started: bool = False

container = DependencyContainer()

async def get_moss_engine() -> MossEngine:
    if container._moss_engine is None:
        container._moss_engine = MossEngine()
    if not container._moss_initialized:
        try:
            await container._moss_engine.initialize()
            container._moss_initialized = True
        except Exception as e:
            logger.warning(f"MossEngine initialization deferred: {e}")
    return container._moss_engine

async def get_ollama_client() -> OllamaClient:
    if container._ollama_client is None:
        container._ollama_client = OllamaClient()
    return container._ollama_client

async def get_privacy_ledger() -> PrivacyLedger:
    if container._privacy_ledger is None:
        container._privacy_ledger = PrivacyLedger()
    if not container._ledger_started:
        try:
            await container._privacy_ledger.start_monitoring()
            container._ledger_started = True
        except Exception as e:
            logger.warning(f"PrivacyLedger monitoring deferred: {e}")
    return container._privacy_ledger

async def get_secret_scanner() -> SecretScanner:
    if container._secret_scanner is None:
        container._secret_scanner = SecretScanner()
    return container._secret_scanner

async def get_docker_sandbox() -> DockerSandbox:
    if container._docker_sandbox is None:
        container._docker_sandbox = DockerSandbox()
    return container._docker_sandbox

async def get_eval_harness() -> EvalHarness:
    if container._eval_harness is None:
        container._eval_harness = EvalHarness()
    return container._eval_harness

async def get_trust_score_calculator() -> TrustScoreCalculator:
    if container._trust_score_calculator is None:
        container._trust_score_calculator = TrustScoreCalculator()
    return container._trust_score_calculator

async def get_livekit_service() -> LiveKitService:
    if container._livekit_service is None:
        container._livekit_service = LiveKitService()
    return container._livekit_service

async def get_database_manager() -> DatabaseManager:
    if container._database_manager is None:
        container._database_manager = DatabaseManager()
    return container._database_manager

async def get_llm_gateway() -> LLMGateway:
    if container._llm_gateway is None:
        container._llm_gateway = LLMGateway()
    return container._llm_gateway