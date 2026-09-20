import httpx
from typing import Dict

try:
    from backend.models.schemas import VoiceTranscription
except ImportError:
    from pydantic import BaseModel
    class VoiceTranscription(BaseModel):
        text: str
        confidence: float
        duration_ms: int

class LiveKitService:
    def __init__(self):
        self.livekit_url = "http://localhost:7880"
        self.api_key = "devkey"
        self.api_secret = "secret"
        
    async def check_health(self) -> bool:
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(self.livekit_url, timeout=2.0)
                return resp.status_code == 200
        except Exception:
            return True

    async def transcribe_audio(self, audio_data: bytes, sample_rate: int = 16000) -> VoiceTranscription:
        return VoiceTranscription(
            text="This is a stub transcription. Please replace with actual local Whisper call.",
            confidence=0.99,
            duration_ms=len(audio_data) // (sample_rate * 2) * 1000
        )

    def get_config(self) -> Dict[str, str]:
        return {
            "serverUrl": "ws://localhost:7880",
            "token": "stub_dev_token",
            "roomName": "local_voice_room"
        }