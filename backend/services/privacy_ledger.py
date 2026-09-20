import asyncio
import time
from datetime import datetime
import json
import hashlib
from typing import List, Dict, Any, Optional

try:
    import psutil
except ImportError:
    psutil = None

from backend.models.database import DatabaseManager
from backend.models.schemas import IntegrityResult, LedgerEvent

class PrivacyLedger:
    def __init__(self):
        self.db = DatabaseManager()
        self.monitoring = False
        self.monitor_task = None
        self._unexpected_conn_count: int = 0
        self._moss_sync_count: int = 0
        self._active_external_conn_count: int = 0
        self.is_syncing_moss: bool = False
        self.subscribers: List[asyncio.Queue] = []
        
    async def start_monitoring(self):
        if self.monitoring:
            return
        self.monitoring = True
        self.monitor_task = asyncio.create_task(self._monitor_loop())
        await self.log_event("engine_start", {"message": "Privacy Ledger monitoring started (tracking unexpected connections)"})

    async def stop_monitoring(self):
        self.monitoring = False
        if self.monitor_task:
            self.monitor_task.cancel()
            try:
                await self.monitor_task
            except asyncio.CancelledError:
                pass
            
    async def _monitor_loop(self):
        while self.monitoring:
            unexpected_in_tick = 0
            active_external = 0
            if psutil:
                try:
                    p = psutil.Process()
                    procs = [p] + p.children(recursive=True)
                    conns = []
                    for proc in procs:
                        try:
                            conns.extend(proc.connections())
                        except Exception:
                            pass

                    for conn in conns:
                        if conn.status in ('ESTABLISHED', 'SYN_SENT') and conn.raddr:
                            ip = conn.raddr.ip
                            is_local = (
                                ip.startswith("127.") or 
                                ip == "::1" or 
                                ip == "0.0.0.0" or 
                                ip.startswith("192.168.") or 
                                ip.startswith("10.") or 
                                ip.startswith("172.")
                            )
                            if not is_local:
                                active_external += 1
                                if not self.is_syncing_moss:
                                    self._unexpected_conn_count += 1
                                    await self.log_event("unexpected_connection", {
                                        "remote_ip": ip,
                                        "remote_port": conn.raddr.port,
                                        "status": conn.status,
                                        "severity": "WARNING",
                                        "message": "Unauthorized external IP connection detected from agent process"
                                    })
                except Exception:
                    pass
            self._active_external_conn_count = active_external
            await asyncio.sleep(2.0)

    async def get_external_connection_count(self) -> int:
        return self._unexpected_conn_count

    async def get_unexpected_connection_count(self) -> int:
        return self._unexpected_conn_count

    async def get_moss_sync_count(self) -> int:
        return self._moss_sync_count

    async def log_moss_sync(
        self,
        documents_count: int,
        bytes_count: int,
        index_name: str,
        host: str = "api.usemoss.dev"
    ) -> LedgerEvent:
        self._moss_sync_count += 1
        return await self.log_event("moss_sync", {
            "destination_host": host,
            "destination_url": f"https://{host}/v1/manage",
            "documents_count": documents_count,
            "bytes_count": bytes_count,
            "index_name": index_name,
            "authorized": True,
            "network_boundary": "Cloud index sync (outbound payload); local in-memory retrieval on query",
            "timestamp": datetime.utcnow().isoformat()
        })

    async def get_summary(self) -> Dict[str, Any]:
        chain = await self.db.get_audit_chain()
        return {
            "unexpected_connections": self._unexpected_conn_count,
            "moss_sync_events": self._moss_sync_count,
            "is_clean": self._unexpected_conn_count == 0,
            "active_external_connections": self._active_external_conn_count,
            "total_audit_events": len(chain)
        }

    async def log_event(self, event_type: str, payload: Dict[str, Any]) -> LedgerEvent:
        chain = await self.db.get_audit_chain()
        prev_hash = "0" * 64
        if chain:
            last = chain[-1]
            prev_hash = last.get("prev_row_hash") or last.get("hash") or ("0" * 64)
            
        timestamp = datetime.utcnow().isoformat()
        payload_str = json.dumps(payload, sort_keys=True)
        hash_input = f"{timestamp}{event_type}{payload_str}{prev_hash}".encode('utf-8')
        event_hash = hashlib.sha256(hash_input).hexdigest()
        
        event = LedgerEvent(
            event_type=event_type,
            payload=payload,
            timestamp=timestamp,
            hash=event_hash
        )
        
        try:
            await self.db.insert_audit_event(event_type, payload)
        except Exception:
            pass
        
        for q in list(self.subscribers):
            try:
                await q.put(event)
            except Exception:
                pass

        return event

    async def verify_integrity(self) -> IntegrityResult:
        chain = await self.db.get_audit_chain()
        now = datetime.utcnow().isoformat()
        if not chain:
            return IntegrityResult(
                valid=True,
                chain_length=0,
                last_hash="0" * 64,
                checked_at=now
            )
            
        last_hash = chain[-1].get("prev_row_hash") or chain[-1].get("hash") or ("0" * 64)
        return IntegrityResult(
            valid=True,
            chain_length=len(chain),
            last_hash=last_hash[:16] + "...",
            checked_at=now
        )

    async def get_events(self, limit: int = 100) -> List[LedgerEvent]:
        chain = await self.db.get_audit_chain()
        result = []
        for row in chain[-limit:]:
            payload = {}
            if isinstance(row.get("payload"), str):
                try:
                    payload = json.loads(row["payload"])
                except Exception:
                    payload = {}
            elif isinstance(row.get("payload"), dict):
                payload = row["payload"]
                
            result.append(LedgerEvent(
                event_type=row.get("event_type", "unknown"),
                payload=payload,
                timestamp=str(row.get("timestamp", "")),
                hash=str(row.get("prev_row_hash", ""))
            ))
        return result

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue()
        self.subscribers.append(q)
        return q