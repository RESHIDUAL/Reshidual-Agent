import re
from typing import List
import math

try:
    from backend.models.schemas import ScanResult, Redaction
except ImportError:
    from pydantic import BaseModel
    class Redaction(BaseModel):
        start: int
        end: int
        original: str
        replacement: str
        reason: str
        
    class ScanResult(BaseModel):
        redacted_content: str
        redactions: List[Redaction]

class SecretScanner:
    def __init__(self, sensitivity: str = "medium"):
        self.sensitivity = sensitivity
        
        self.patterns = {
            "AWS API Key": re.compile(r"(AKIA[0-9A-Z]{16})"),
            "GitHub Token": re.compile(r"(gh[p|o|s]_[a-zA-Z0-9]{36,})"),
            "Stripe Key": re.compile(r"([sp]k_(?:test|live)_[a-zA-Z0-9]{24,})"),
            "Generic API Key": re.compile(r"(?:api_key|apikey|api-key)\s*[:=]\s*['\"]?([a-zA-Z0-9\-_]{16,})['\"]?", re.IGNORECASE),
            "Bearer Token": re.compile(r"Bearer\s+([a-zA-Z0-9\-\._~+/]+=*)"),
            "JWT Token": re.compile(r"(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)"),
            "OAuth Token": re.compile(r"ya29\.[a-zA-Z0-9_-]+"),
            "Password": re.compile(r"(?:password|passwd|pwd)\s*[:=]\s*['\"]?([^'\"\s]{8,})['\"]?", re.IGNORECASE),
            "Private Key": re.compile(r"(-----BEGIN (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----[\s\S]+?-----END (?:RSA|DSA|EC|OPENSSH) PRIVATE KEY-----)"),
            "URL Credentials": re.compile(r"https?://([^:/\s]+:[^@/\s]+)@[^/\s]+"),
        }
        
        if self.sensitivity == "high":
            self.patterns["Email Address"] = re.compile(r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)")
            self.patterns["IP Address"] = re.compile(r"\b((?:[0-9]{1,3}\.){3}[0-9]{1,3})\b")

    def _shannon_entropy(self, data: str) -> float:
        if not data:
            return 0
        entropy = 0.0
        for x in set(data):
            p_x = float(data.count(x)) / len(data)
            entropy += - p_x * math.log2(p_x)
        return entropy

    def scan(self, content: str) -> ScanResult:
        redactions = []
        redacted_content = content
        
        for reason, pattern in self.patterns.items():
            for match in pattern.finditer(content):
                target = match.group(1) if match.lastindex else match.group(0)
                start = match.start(1) if match.lastindex else match.start()
                end = match.end(1) if match.lastindex else match.end()
                
                replacement = f"[REDACTED:{reason}]"
                redactions.append(Redaction(
                    start=start,
                    end=end,
                    original=target,
                    replacement=replacement,
                    reason=reason
                ))
        
        if self.sensitivity in ["medium", "high"]:
            words = re.findall(r"\b[a-zA-Z0-9+/=]{20,}\b", content)
            for word in words:
                if self._shannon_entropy(word) > 4.5:
                    already_redacted = any(r.original == word for r in redactions)
                    if not already_redacted:
                        idx = content.find(word)
                        if idx != -1:
                            reason = "High Entropy String"
                            redactions.append(Redaction(
                                start=idx,
                                end=idx + len(word),
                                original=word,
                                replacement=f"[REDACTED:{reason}]",
                                reason=reason
                            ))
                            
        redactions.sort(key=lambda x: x.start, reverse=True)
        for r in redactions:
            redacted_content = redacted_content[:r.start] + r.replacement + redacted_content[r.end:]
            
        redactions.sort(key=lambda x: x.start)
        
        return ScanResult(
            redacted_content=redacted_content,
            redactions=redactions
        )