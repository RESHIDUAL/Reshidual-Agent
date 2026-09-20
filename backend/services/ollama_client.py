import httpx
import json
from typing import Tuple, List, Optional, AsyncGenerator

class OllamaClient:
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.default_model = "llama3.1:8b"
        self.fallback_models = [
            "llama3.1:8b",
            "qwen2.5:7b",
            "llama3.2:3b",
            "qwen2.5-coder:1.5b",
            "qwen3:0.6b"
        ]
        
    async def detect(self) -> Tuple[bool, str, List[str]]:
        try:
            async with httpx.AsyncClient() as client:
                version_resp = await client.get(f"{self.base_url}/api/version", timeout=3.0)
                version_resp.raise_for_status()
                version = version_resp.json().get("version", "unknown")
                
                tags_resp = await client.get(f"{self.base_url}/api/tags", timeout=3.0)
                tags_resp.raise_for_status()
                raw_models = [m.get("name") for m in tags_resp.json().get("models", [])]
                
                priority = ["llama3.1", "qwen2.5:7b", "llama3.2", "qwen2.5-coder", "qwen3"]
                def sort_key(name: str):
                    for idx, pfx in enumerate(priority):
                        if pfx in name:
                            return idx
                    return len(priority)
                models = sorted(raw_models, key=sort_key)
                return True, version, models
        except Exception as e:
            return False, str(e), []

    async def generate(self, prompt: str, model: Optional[str] = None, system: Optional[str] = None, context: Optional[List] = None) -> str:
        ok, version, models = await self.detect()
        candidate_models = []
        if model and (not models or model in models):
            candidate_models.append(model)
        if models:
            for m in models:
                if m not in candidate_models:
                    candidate_models.append(m)
        if not candidate_models:
            candidate_models = self.fallback_models

        last_err = None
        for m_name in candidate_models:
            payload = {
                "model": m_name,
                "prompt": prompt,
                "stream": False
            }
            if system:
                payload["system"] = system
            if context:
                payload["context"] = context
                
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(f"{self.base_url}/api/generate", json=payload, timeout=60.0)
                    resp.raise_for_status()
                    res_text = resp.json().get("response", "")
                    if res_text:
                        return res_text
            except Exception as e:
                last_err = e
                continue

        if last_err:
            raise last_err
        return ""

    async def generate_stream(self, prompt: str, model: Optional[str] = None) -> AsyncGenerator[str, None]:
        ok, version, models = await self.detect()
        model_name = model if model and (not models or model in models) else (models[0] if models else self.default_model)
        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": True
        }
        
        async with httpx.AsyncClient() as client:
            async with client.stream("POST", f"{self.base_url}/api/generate", json=payload) as response:
                response.raise_for_status()
                async for chunk in response.aiter_lines():
                    if chunk:
                        try:
                            data = json.loads(chunk)
                            if "response" in data:
                                yield data["response"]
                        except json.JSONDecodeError:
                            continue

    async def embed(self, text: str) -> List[float]:
        payload = {
            "model": self.default_model,
            "prompt": text
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{self.base_url}/api/embeddings", json=payload, timeout=10.0)
            resp.raise_for_status()
            return resp.json().get("embedding", [])