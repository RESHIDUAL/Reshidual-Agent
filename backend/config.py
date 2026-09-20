import os
from pathlib import Path
from functools import lru_cache
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_PORT: int = 8420
    OLLAMA_HOST: str = 'http://localhost:11434'
    LIVEKIT_PORT: int = 7880
    
    DATA_DIR: Path = Path(os.environ.get('APPDATA') or os.path.expanduser('~/.local/share/reshidual-agent'))
    
    ALPHA_DEFAULT: float = 0.5
    REDACTION_SENSITIVITY: str = 'medium'
    MAX_HEAL_ATTEMPTS: int = 3
    
    MOSS_PROJECT_ID: str = ""
    MOSS_PROJECT_KEY: str = ""
    MOSS_INDEX_NAME: str = "reshidual_codebase"
    
    @property
    def DB_PATH(self) -> Path:
        return self.DATA_DIR / 'agent.db'
        
    @property
    def MOSS_INDEX_DIR(self) -> Path:
        return self.DATA_DIR / 'moss_index'

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    settings.MOSS_INDEX_DIR.mkdir(parents=True, exist_ok=True)
    return settings