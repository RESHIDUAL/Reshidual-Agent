import os
import sys
import asyncio
import time
from pathlib import Path

sys.path.insert(0, os.path.abspath("."))

import moss
from backend.config import get_settings
from backend.services.moss_engine import MossEngine
from backend.services.privacy_ledger import PrivacyLedger
from backend.services.secret_scanner import SecretScanner
from backend.services.tree_sitter_parser import TreeSitterParser
from backend.services.trust_score import TrustScoreCalculator
from backend.models.schemas import IngestProgress, SearchResult, TimingInfo

async def run_verification():
    print("=" * 70)
    print("MOSS SDK & HONEST NETWORK BOUNDARY VERIFICATION TEST")
    print("=" * 70)

    print("\n[1] Verifying Moss SDK installation...")
    print(f"  - moss module: {moss.__file__}")
    print(f"  - moss version: {getattr(moss, '__version__', '1.12.0')}")
    assert hasattr(moss, "MossClient"), "moss.MossClient not found"
    assert hasattr(moss, "DocumentInfo"), "moss.DocumentInfo not found"
    assert hasattr(moss, "QueryOptions"), "moss.QueryOptions not found"
    assert hasattr(moss, "SearchResult"), "moss.SearchResult not found"
    print("  [PASS] Official Moss SDK verified with all core classes.")

    print("\n[2] Verifying Local AST Chunking & Secret Redaction Pipeline...")
    scanner = SecretScanner()
    parser = TreeSitterParser()

    code_sample = '''
def authenticate_user():
    api_key = "sk-live-9876543210abcdef9876543210abcdef"
    github_pat = "ghp_123456789012345678901234567890123456"
    print("Connecting securely...")
    return True
'''
    scan_res = scanner.scan(code_sample)
    print(f"  - Original secrets contained: 'sk-live-...' and 'ghp_...'")
    print(f"  - Redacted content:\n{scan_res.redacted_content}")
    assert "sk-live-" not in scan_res.redacted_content, "Secret was not redacted!"
    assert "[REDACTED:" in scan_res.redacted_content, "Redaction token missing!"
    print(f"  - Redactions performed locally: {len(scan_res.redactions)}")
    print("  [PASS] Pre-flight local secret redaction verified.")

    print("\n[3] Verifying Unconfigured Credentials Handling...")
    engine_unconfigured = MossEngine(project_id="", project_key="")
    assert not engine_unconfigured.is_configured
    try:
        await engine_unconfigured.query("test query")
        assert False, "Expected ValueError on unconfigured query"
    except ValueError as e:
        print(f"  - Actionable error received: {e}")
        assert "usemoss.dev" in str(e), "Actionable link missing in error"
    print("  [PASS] Graceful, actionable error returned when unconfigured.")

    print("\n[4] Verifying Privacy Ledger Tracking & Network Boundary...")
    ledger = PrivacyLedger()
    await ledger.start_monitoring()

    summary_initial = await ledger.get_summary()
    print(f"  - Initial unexpected connections: {summary_initial['unexpected_connections']}")
    print(f"  - Initial moss_sync events: {summary_initial['moss_sync_events']}")
    assert summary_initial['unexpected_connections'] == 0
    assert summary_initial['is_clean'] is True

    print("\n  Simulating Moss Cloud Sync during Ingestion...")
    sync_event = await ledger.log_moss_sync(
        documents_count=42,
        bytes_count=18450,
        index_name="reshidual_codebase",
        host="api.usemoss.dev"
    )
    print(f"  - Event Type: {sync_event.event_type}")
    print(f"  - Destination: {sync_event.payload.get('destination_url')}")
    print(f"  - Authorized: {sync_event.payload.get('authorized')}")
    print(f"  - Docs synced: {sync_event.payload.get('documents_count')}")
    print(f"  - Payload bytes: {sync_event.payload.get('bytes_count')}")

    summary_after = await ledger.get_summary()
    print(f"  - Summary after sync: unexpected_connections={summary_after['unexpected_connections']}, moss_sync_events={summary_after['moss_sync_events']}")
    assert summary_after['unexpected_connections'] == 0, "Moss sync must not be counted as unexpected!"
    assert summary_after['moss_sync_events'] == 1, "Moss sync count should be 1"
    assert summary_after['is_clean'] is True, "System must remain clean (0 unexpected connections)"

    integrity = await ledger.verify_integrity()
    print(f"  - Cryptographic Hash Chain Integrity: valid={integrity.valid}, length={integrity.chain_length}")
    assert integrity.valid is True

    print("\n[5] Verifying Trust Score with Honest Network Accounting...")
    trust_calc = TrustScoreCalculator()
    trust_score = await trust_calc.calculate(
        eval_result=None,
        external_connections=summary_after['unexpected_connections'],
        moss_sync_events=summary_after['moss_sync_events']
    )
    print(f"  - Overall Trust Score: {trust_score.overall}/100")
    print(f"  - Zero-Leak Status: {trust_score.zero_leak}")
    print(f"  - Unexpected Connections: {trust_score.unexpected_connections}")
    print(f"  - Moss Sync Events: {trust_score.moss_sync_events}")
    print(f"  - Zero Leak Contribution: {trust_score.breakdown.zero_leak_contribution} pts")
    assert trust_score.zero_leak is True
    assert trust_score.breakdown.zero_leak_contribution == 30.0
    print("  [PASS] Trust score properly rewards 0 unexpected connections while openly documenting Moss sync.")

    print("\n[6] Auditing FastAPI Endpoints...")
    from fastapi.testclient import TestClient
    from backend.main import app

    client = TestClient(app)
    
    r_health = client.get("/api/health")
    assert r_health.status_code == 200
    health_data = r_health.json()
    print(f"  - /api/health: moss={health_data.get('moss')}, moss_configured={health_data.get('moss_configured')}")
    assert health_data.get("moss") is True

    r_priv = client.get("/api/privacy_summary")
    assert r_priv.status_code == 200
    priv_data = r_priv.json()
    print(f"  - /api/privacy_summary: unexpected={priv_data.get('unexpected_connections')}, moss_sync={priv_data.get('moss_sync_events')}, is_clean={priv_data.get('is_clean')}")
    assert "unexpected_connections" in priv_data
    assert "moss_sync_events" in priv_data

    r_settings = client.get("/api/settings")
    assert r_settings.status_code == 200
    settings_data = r_settings.json()
    print(f"  - /api/settings: moss_project_id configured: '{settings_data.get('moss_project_id')}'")
    assert "moss_project_id" in settings_data

    r_query = client.post("/api/query", json={"text": "How does authentication work?", "alpha": 0.5})
    assert r_query.status_code == 200
    query_data = r_query.json()
    print(f"  - /api/query answer: {query_data.get('answer')[:80]}...")
    assert "answer" in query_data

    await ledger.stop_monitoring()

    print("\n" + "=" * 70)
    print("ALL MOSS INTEGRATION & HONEST NETWORK BOUNDARY TESTS PASSED!")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_verification())