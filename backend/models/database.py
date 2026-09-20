import hashlib
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, List, Dict, Any
import aiosqlite

from backend.config import get_settings

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self):
        self.settings = get_settings()
        self.db_path = str(self.settings.DB_PATH)

    @asynccontextmanager
    async def get_connection(self):
        async with aiosqlite.connect(self.db_path) as conn:
            conn.row_factory = aiosqlite.Row
            yield conn

    async def init_db(self):
        async with self.get_connection() as conn:
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS Chunks (
                    id TEXT PRIMARY KEY,
                    file_path TEXT,
                    start_line INTEGER,
                    end_line INTEGER,
                    raw_content TEXT,
                    redacted_content TEXT,
                    raw_content_hash TEXT,
                    embedding_id TEXT,
                    language TEXT,
                    symbol_name TEXT,
                    symbol_type TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS AuditLog (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_type TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    prev_row_hash TEXT NOT NULL
                )
            ''')
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS Sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE NOT NULL,
                    context TEXT DEFAULT '{}',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            await conn.execute('''
                CREATE TABLE IF NOT EXISTS Settings (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                )
            ''')
            await conn.execute('''
                CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts 
                USING fts5(raw_content, file_path, content=Chunks, content_rowid=rowid)
            ''')
            await conn.commit()

    async def insert_chunk(self, chunk_data: dict) -> bool:
        async with self.get_connection() as conn:
            await conn.execute('''
                INSERT OR REPLACE INTO Chunks (
                    id, file_path, start_line, end_line, raw_content, redacted_content,
                    raw_content_hash, embedding_id, language, symbol_name, symbol_type
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                chunk_data.get('id'),
                chunk_data.get('file_path'),
                chunk_data.get('start_line'),
                chunk_data.get('end_line'),
                chunk_data.get('raw_content'),
                chunk_data.get('redacted_content'),
                chunk_data.get('raw_content_hash'),
                chunk_data.get('embedding_id'),
                chunk_data.get('language'),
                chunk_data.get('symbol_name'),
                chunk_data.get('symbol_type')
            ))
            await conn.commit()
            return True

    async def get_chunk(self, chunk_id: str) -> Optional[Dict[str, Any]]:
        async with self.get_connection() as conn:
            cursor = await conn.execute('SELECT * FROM Chunks WHERE id = ?', (chunk_id,))
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def search_chunks_fts(self, query: str) -> List[Dict[str, Any]]:
        async with self.get_connection() as conn:
            cursor = await conn.execute('''
                SELECT Chunks.*, chunks_fts.rank
                FROM chunks_fts
                JOIN Chunks ON Chunks.rowid = chunks_fts.rowid
                WHERE chunks_fts MATCH ?
                ORDER BY rank
                LIMIT 50
            ''', (query,))
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def insert_audit_event(self, event_type: str, payload: dict) -> int:
        async with self.get_connection() as conn:
            cursor = await conn.execute('SELECT prev_row_hash, payload, timestamp FROM AuditLog ORDER BY id DESC LIMIT 1')
            last_entry = await cursor.fetchone()
            
            if not last_entry:
                prev_hash_data = b'genesis'
            else:
                prev_hash_data = (last_entry['prev_row_hash'] + last_entry['payload'] + last_entry['timestamp']).encode('utf-8')
                
            new_prev_hash = hashlib.sha256(prev_hash_data).hexdigest()
            timestamp = datetime.utcnow().isoformat()
            payload_str = json.dumps(payload)
            
            cursor = await conn.execute(
                'INSERT INTO AuditLog (event_type, payload, timestamp, prev_row_hash) VALUES (?, ?, ?, ?)',
                (event_type, payload_str, timestamp, new_prev_hash)
            )
            await conn.commit()
            return cursor.lastrowid

    async def get_audit_chain(self) -> List[Dict[str, Any]]:
        async with self.get_connection() as conn:
            cursor = await conn.execute('SELECT * FROM AuditLog ORDER BY id ASC')
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

    async def insert_session(self, session_id: str, context: dict = None) -> int:
        context_str = json.dumps(context or {})
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                'INSERT INTO Sessions (session_id, context) VALUES (?, ?)',
                (session_id, context_str)
            )
            await conn.commit()
            return cursor.lastrowid

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        async with self.get_connection() as conn:
            cursor = await conn.execute('SELECT * FROM Sessions WHERE session_id = ?', (session_id,))
            row = await cursor.fetchone()
            return dict(row) if row else None

    async def update_session(self, session_id: str, context: dict) -> bool:
        context_str = json.dumps(context)
        timestamp = datetime.utcnow().isoformat()
        async with self.get_connection() as conn:
            cursor = await conn.execute(
                'UPDATE Sessions SET context = ?, updated_at = ? WHERE session_id = ?',
                (context_str, timestamp, session_id)
            )
            await conn.commit()
            return cursor.rowcount > 0