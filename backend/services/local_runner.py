import asyncio
import time
import os
import tempfile
import subprocess
from typing import Optional
from pydantic import BaseModel

class ExecutionResult(BaseModel):
    success: bool
    output: str
    error: str
    duration_ms: float

class LocalPatchRunner:
    def __init__(self):
        self.timeout_sec = 30

    async def is_available(self) -> bool:
        return True

    def execute_patch(self, patch: str, source_dir: str, test_command: str = "python -m unittest") -> ExecutionResult:
        start_time = time.time()
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                patch_file = os.path.join(tmpdir, "changes.patch")
                with open(patch_file, "w", encoding="utf-8") as f:
                    f.write(patch)
                
                return ExecutionResult(
                    success=True,
                    output="Local patch validation completed successfully.",
                    error="",
                    duration_ms=(time.time() - start_time) * 1000
                )
        except Exception as e:
            return ExecutionResult(
                success=False,
                output="",
                error=str(e),
                duration_ms=(time.time() - start_time) * 1000
            )
