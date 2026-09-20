import asyncio
import time
import os
import tempfile
import subprocess
from typing import Optional

try:
    from backend.models.schemas import ExecutionResult
except ImportError:
    from pydantic import BaseModel
    class ExecutionResult(BaseModel):
        success: bool
        output: str
        error: str
        duration_ms: float

class DockerSandbox:
    def __init__(self):
        self.image = "python:3.11-slim"
        self.timeout_sec = 60
        self.memory_limit = "512m"
        self.cpus = "1.0"
        self._sandbox_containers = []

    async def is_available(self) -> bool:
        try:
            process = await asyncio.create_subprocess_exec(
                "docker", "info",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            return process.returncode == 0
        except Exception:
            return False

    async def execute_patch(self, patch: str, source_dir: str, test_command: str = 'python -m pytest') -> ExecutionResult:
        start_time = time.time()
        
        if not await self.is_available():
            return ExecutionResult(
                success=False,
                output="",
                error="Docker is not available or not running on this system.",
                duration_ms=(time.time() - start_time) * 1000
            )
            
        container_name = f"sandbox_{int(time.time())}_{os.getpid()}"
        self._sandbox_containers.append(container_name)
        
        with tempfile.TemporaryDirectory() as tmpdir:
            patch_file = os.path.join(tmpdir, "changes.patch")
            with open(patch_file, "w", encoding="utf-8") as f:
                f.write(patch)
                
            cmd = [
                "docker", "run", "--rm",
                "--name", container_name,
                "--network", "none",
                "--memory", self.memory_limit,
                "--cpus", self.cpus,
                "-v", f"{source_dir}:/app:ro",
                "-v", f"{tmpdir}:/tmp/workspace:rw",
                "-w", "/tmp/workspace",
                self.image,
                "bash", "-c",
                f"cp -r /app/* . && patch -p1 < changes.patch && {test_command}"
            ]
            
            try:
                process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                
                try:
                    stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=self.timeout_sec)
                    success = (process.returncode == 0)
                    out_str = stdout.decode('utf-8', errors='replace')
                    err_str = stderr.decode('utf-8', errors='replace')
                    
                except asyncio.TimeoutError:
                    process.kill()
                    success = False
                    out_str = ""
                    err_str = f"Execution timed out after {self.timeout_sec} seconds."
                    
            except Exception as e:
                success = False
                out_str = ""
                err_str = str(e)
                
        duration_ms = (time.time() - start_time) * 1000
        
        try:
            self._sandbox_containers.remove(container_name)
        except ValueError:
            pass
            
        return ExecutionResult(
            success=success,
            output=out_str,
            error=err_str,
            duration_ms=duration_ms
        )

    async def cleanup(self):
        for container in self._sandbox_containers:
            try:
                await asyncio.create_subprocess_exec(
                    "docker", "rm", "-f", container,
                    stdout=asyncio.subprocess.DEVNULL,
                    stderr=asyncio.subprocess.DEVNULL
                )
            except Exception:
                pass
        self._sandbox_containers.clear()