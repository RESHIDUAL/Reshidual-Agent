import os
import re
from typing import List, Optional

try:
    from backend.models.schemas import CodeChunk
except ImportError:
    from pydantic import BaseModel
    class CodeChunk(BaseModel):
        content: str
        start_line: int
        end_line: int
        language: str
        symbol_name: Optional[str] = None
        symbol_type: Optional[str] = None

class TreeSitterParser:
    def __init__(self):
        self.use_tree_sitter = False
        try:
            import tree_sitter
            self.use_tree_sitter = True
        except ImportError:
            pass
            
        self.language_map = {
            ".py": "python",
            ".ts": "typescript",
            ".tsx": "typescript",
            ".js": "javascript",
            ".jsx": "javascript",
            ".rs": "rust"
        }

    def parse_file(self, file_path: str) -> List[CodeChunk]:
        if not os.path.exists(file_path):
            return []
            
        _, ext = os.path.splitext(file_path)
        language = self.language_map.get(ext, "unknown")
        
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        if self.use_tree_sitter and language != "unknown":
            try:
                return self._parse_with_tree_sitter(content, language)
            except Exception as e:
                return self._parse_with_fallback(content, language)
        else:
            return self._parse_with_fallback(content, language)
            
    def _parse_with_tree_sitter(self, content: str, language: str) -> List[CodeChunk]:
        return self._parse_with_fallback(content, language)
        
    def _parse_with_fallback(self, content: str, language: str) -> List[CodeChunk]:
        chunks = []
        lines = content.splitlines()
        
        patterns = {
            "python": [(r"^\s*def\s+([a-zA-Z_]\w*)\s*\(", "function"),
                       (r"^\s*class\s+([a-zA-Z_]\w*)\s*[:\(]", "class"),
                       (r"^\s*async\s+def\s+([a-zA-Z_]\w*)\s*\(", "function")],
            "typescript": [(r"^\s*function\s+([a-zA-Z_]\w*)\s*\(", "function"),
                           (r"^\s*class\s+([a-zA-Z_]\w*)\s*\{", "class"),
                           (r"^\s*const\s+([a-zA-Z_]\w*)\s*=\s*\(.*=>", "function"),
                           (r"^\s*export\s+(?:const|function|class)\s+([a-zA-Z_]\w*)", "module")],
            "javascript": [(r"^\s*function\s+([a-zA-Z_]\w*)\s*\(", "function"),
                           (r"^\s*class\s+([a-zA-Z_]\w*)\s*\{", "class"),
                           (r"^\s*const\s+([a-zA-Z_]\w*)\s*=\s*\(.*=>", "function")],
            "rust": [(r"^\s*fn\s+([a-zA-Z_]\w*)\s*\(", "function"),
                     (r"^\s*impl\s+(?:<.*>\s+)?([a-zA-Z_]\w*)", "class"),
                     (r"^\s*struct\s+([a-zA-Z_]\w*)", "class"),
                     (r"^\s*enum\s+([a-zA-Z_]\w*)", "class")]
        }
        
        lang_patterns = patterns.get(language, [])
        if not lang_patterns:
            chunk_size = 50
            overlap = 10
            for i in range(0, len(lines), chunk_size - overlap):
                chunk_lines = lines[i:i+chunk_size]
                if not chunk_lines:
                    break
                chunks.append(CodeChunk(
                    content="\n".join(chunk_lines),
                    start_line=i + 1,
                    end_line=i + len(chunk_lines),
                    language=language,
                    symbol_name=None,
                    symbol_type=None
                ))
            return chunks
            
        current_chunk_start = 0
        current_symbol = None
        current_type = None
        
        for i, line in enumerate(lines):
            for pattern, sym_type in lang_patterns:
                match = re.search(pattern, line)
                if match:
                    if current_chunk_start < i:
                        chunks.append(CodeChunk(
                            content="\n".join(lines[current_chunk_start:i]),
                            start_line=current_chunk_start + 1,
                            end_line=i,
                            language=language,
                            symbol_name=current_symbol,
                            symbol_type=current_type
                        ))
                    current_chunk_start = i
                    current_symbol = match.group(1)
                    current_type = sym_type
                    break
                    
        if current_chunk_start < len(lines):
            chunks.append(CodeChunk(
                content="\n".join(lines[current_chunk_start:]),
                start_line=current_chunk_start + 1,
                end_line=len(lines),
                language=language,
                symbol_name=current_symbol,
                symbol_type=current_type
            ))
            
        return chunks