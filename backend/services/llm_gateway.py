import os
import json
import httpx
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path

class LLMGateway:
    def __init__(self):
        self.data_dir = Path(os.environ.get('DATA_DIR', os.path.join(os.getcwd(), 'backend', 'data')))
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.keys_file = self.data_dir / 'api_keys.json'
        
        self.default_nvidia_key = os.environ.get(
            'NVIDIA_API_KEY', 
            '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'
        )
        self.default_openrouter_key = os.environ.get('OPENROUTER_API_KEY', '')
        self.default_google_key = os.environ.get('GOOGLE_API_KEY', '')
        self.ollama_host = os.environ.get('OLLAMA_HOST', 'http://localhost:11434')

        self.nvidia_models = [
            'meta/llama-3.2-11b-vision-instruct',
            'meta/llama-3.2-3b-instruct',
            'deepseek-ai/deepseek-coder-6.7b-instruct',
            'google/gemma-3-12b-it',
            '01-ai/yi-large'
        ]

        self.openrouter_models = [
            'anthropic/claude-3.5-sonnet',
            'meta-llama/llama-3.1-70b-instruct',
            'openai/gpt-4o-mini',
            'google/gemini-2.0-flash-001'
        ]

        self.google_models = [
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-2.0-flash'
        ]

    def _load_keys(self) -> Dict[str, str]:
        keys = {
            'nvidia': self.default_nvidia_key,
            'openrouter': self.default_openrouter_key,
            'google': self.default_google_key
        }
        if self.keys_file.exists():
            try:
                with open(self.keys_file, 'r', encoding='utf-8') as f:
                    saved = json.load(f)
                    if isinstance(saved, dict):
                        for k, v in saved.items():
                            if v and isinstance(v, str):
                                keys[k.lower()] = v.strip()
            except Exception:
                pass
        return keys

    def save_keys(self, new_keys: Dict[str, str]):
        current = self._load_keys()
        for k, v in new_keys.items():
            if v is not None:
                current[k.lower()] = str(v).strip()
        with open(self.keys_file, 'w', encoding='utf-8') as f:
            json.dump(current, f, indent=2)

    def get_keys(self) -> Dict[str, str]:
        raw = self._load_keys()
        return {
            'nvidia': raw.get('nvidia', ''),
            'openrouter': raw.get('openrouter', ''),
            'google': raw.get('google', '')
        }

    async def get_available_models(self) -> Dict[str, Any]:
        keys = self._load_keys()
        all_models = []
        providers_status = {
            'nvidia': bool(keys.get('nvidia')),
            'openrouter': bool(keys.get('openrouter')),
            'google': bool(keys.get('google')),
            'ollama': False
        }

        ollama_models = []
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.ollama_host}/api/tags")
                if res.status_code == 200:
                    providers_status['ollama'] = True
                    for m in res.json().get('models', []):
                        mname = m.get('name')
                        if mname:
                            ollama_models.append(mname)
        except Exception:
            pass

        if keys.get('nvidia'):
            for m in self.nvidia_models:
                all_models.append(f"nvidia/{m}")

        if keys.get('openrouter'):
            for m in self.openrouter_models:
                all_models.append(f"openrouter/{m}")

        if keys.get('google'):
            for m in self.google_models:
                all_models.append(f"google/{m}")

        for m in ollama_models:
            all_models.append(f"ollama/{m}")

        default_model = (
            f"nvidia/{self.nvidia_models[0]}"
            if keys.get('nvidia')
            else (f"ollama/{ollama_models[0]}" if ollama_models else 'nvidia/meta/llama-3.2-11b-vision-instruct')
        )

        return {
            'models': all_models,
            'default_model': default_model,
            'providers': providers_status,
            'keys': {
                'nvidia_configured': bool(keys.get('nvidia')),
                'openrouter_configured': bool(keys.get('openrouter')),
                'google_configured': bool(keys.get('google')),
            }
        }

    async def generate(self, prompt: str, system: Optional[str] = None, model: Optional[str] = None) -> str:
        keys = self._load_keys()
        target_model = model or f"nvidia/{self.nvidia_models[0]}"

        if target_model.startswith('nvidia/') or any(target_model.startswith(pfx) for pfx in ['meta/', 'deepseek-ai/', '01-ai/']):
            pure_model = target_model.replace('nvidia/', '', 1)
            nvidia_key = keys.get('nvidia') or self.default_nvidia_key
            if nvidia_key:
                try:
                    return await self._generate_nvidia(prompt, system, pure_model, nvidia_key)
                except Exception as e:
                    pass

        if target_model.startswith('openrouter/'):
            pure_model = target_model.replace('openrouter/', '', 1)
            openrouter_key = keys.get('openrouter')
            if openrouter_key:
                try:
                    return await self._generate_openrouter(prompt, system, pure_model, openrouter_key)
                except Exception as e:
                    pass

        if target_model.startswith('google/') or target_model.startswith('gemini'):
            pure_model = target_model.replace('google/', '', 1)
            google_key = keys.get('google')
            if google_key:
                try:
                    return await self._generate_google(prompt, system, pure_model, google_key)
                except Exception as e:
                    pass

        pure_ollama = target_model.replace('ollama/', '', 1)
        try:
            return await self._generate_ollama(prompt, system, pure_ollama)
        except Exception:
            pass

        nvidia_key = keys.get('nvidia') or self.default_nvidia_key
        if nvidia_key:
            return await self._generate_nvidia(prompt, system, self.nvidia_models[0], nvidia_key)

        raise RuntimeError("No available LLM provider could generate a response. Please configure an API key.")

    async def _generate_nvidia(self, prompt: str, system: Optional[str], model: str, api_key: str) -> str:
        url = 'https://integrate.api.nvidia.com/v1/chat/completions'
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        messages = []
        if system:
            messages.append({'role': 'system', 'content': system})
        messages.append({'role': 'user', 'content': prompt})

        payload = {
            'model': model,
            'messages': messages,
            'temperature': 0.2,
            'max_tokens': 1024
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                return data['choices'][0]['message']['content']
            raise RuntimeError(f"Nvidia API returned {res.status_code}: {res.text}")

    async def _generate_openrouter(self, prompt: str, system: Optional[str], model: str, api_key: str) -> str:
        url = 'https://openrouter.ai/api/v1/chat/completions'
        headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
        messages = []
        if system:
            messages.append({'role': 'system', 'content': system})
        messages.append({'role': 'user', 'content': prompt})

        payload = {
            'model': model,
            'messages': messages,
            'temperature': 0.2,
            'max_tokens': 1024
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                return data['choices'][0]['message']['content']
            raise RuntimeError(f"OpenRouter API returned {res.status_code}: {res.text}")

    async def _generate_google(self, prompt: str, system: Optional[str], model: str, api_key: str) -> str:
        clean_model = model if model.startswith('gemini') else 'gemini-1.5-flash'
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={api_key}"
        headers = {'Content-Type': 'application/json'}
        contents = []
        if system:
            contents.append({'role': 'user', 'parts': [{'text': f"System Instruction: {system}"}]})
            contents.append({'role': 'model', 'parts': [{'text': "Understood."}]})
        contents.append({'role': 'user', 'parts': [{'text': prompt}]})

        payload = {'contents': contents}
        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                candidates = data.get('candidates', [])
                if candidates:
                    parts = candidates[0].get('content', {}).get('parts', [])
                    if parts:
                        return parts[0].get('text', '')
            raise RuntimeError(f"Google Gemini API returned {res.status_code}: {res.text}")

    async def _generate_ollama(self, prompt: str, system: Optional[str], model: str) -> str:
        payload = {
            'model': model or 'llama3.1:8b',
            'prompt': prompt,
            'stream': False
        }
        if system:
            payload['system'] = system

        async with httpx.AsyncClient(timeout=45.0) as client:
            res = await client.post(f"{self.ollama_host}/api/generate", json=payload)
            if res.status_code == 200:
                return res.json().get('response', '')
            raise RuntimeError(f"Ollama returned {res.status_code}: {res.text}")
