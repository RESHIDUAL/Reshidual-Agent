from fastapi import APIRouter, Depends, UploadFile, File
from typing import Dict, Any

from backend.models.schemas import VoiceTranscription
from backend.dependencies import get_livekit_service
from backend.services.livekit_service import LiveKitService

router = APIRouter(tags=["voice"])

@router.post("/voice/transcribe", response_model=VoiceTranscription)
async def transcribe_voice(
    audio: UploadFile = File(...),
    livekit_service: LiveKitService = Depends(get_livekit_service)
):
    audio_data = await audio.read()
    transcription = livekit_service.transcribe_audio(audio_data)
    if isinstance(transcription, str):
        return VoiceTranscription(text=transcription, confidence=1.0)
    return VoiceTranscription(**transcription) if isinstance(transcription, dict) else transcription

@router.get("/voice/config")
async def get_voice_config(
    livekit_service: LiveKitService = Depends(get_livekit_service)
):
    """Return LiveKit connection config for frontend"""
    config = livekit_service.get_config()
    return config
