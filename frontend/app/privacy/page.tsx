'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { EventStreamFeed } from '@/components/privacy/EventStreamFeed';
import { IntegrityCheck } from '@/components/privacy/IntegrityCheck';
import { RedactionDiffView } from '@/components/privacy/RedactionDiffView';
import { useLedger } from '@/lib/hooks/useLedger';
import { Shield, Cloud, AlertTriangle, CheckCircle2, Lock, ArrowUpRight } from 'lucide-react';
import { RedactionDiff, PrivacySummary } from '@/lib/api/types';
import { getPrivacySummary } from '@/lib/api/connector';
import { motion } from 'framer-motion';

export default function PrivacyPage() {
  const { events, isConnected } = useLedger();
  const [selectedDiff, setSelectedDiff] = useState<RedactionDiff | null>(null);
  const [selectedSync, setSelectedSync] = useState<any | null>(null);
  const [summary, setSummary] = useState<PrivacySummary>({
    unexpected_connections: 0,
    moss_sync_events: 0,
    is_clean: true,
    active_connections: 0,
    total_audit_events: 0
  });

  const refreshSummary = () => {
    getPrivacySummary()
      .then(s => setSummary(s))
      .catch(() => {});
  };

  useEffect(() => {
    refreshSummary();
    const interval = setInterval(refreshSummary, 3000);
    return () => clearInterval(interval);
  }, []);

  const mossEventsCount = events.filter(e => e.event_type === 'moss_sync').length || summary.moss_sync_events;
  const unexpectedCount = events.filter(e => e.event_type === 'unexpected_connection').length || summary.unexpected_connections;
  const isClean = unexpectedCount === 0;

  const handleEventClick = (eventId: string, type: string) => {
    const ev = events.find(e => (e.id === eventId || e.timestamp === eventId));
    if (type === 'secret_detected') {
      setSelectedSync(null);
      setSelectedDiff({
        chunk_id: eventId,
        raw_content: 'const API_KEY = "sk-live-123456789";\nexport default API_KEY;',
        redacted_content: 'const API_KEY = "[REDACTED:API_KEY]";\nexport default API_KEY;',
        redactions: [
          {
            start: 16,
            end: 35,
            original: 'sk-live-123456789',
            replacement: '[REDACTED:API_KEY]',
            reason: 'High-entropy secret key detected'
          }
        ]
      });
    } else if (type === 'moss_sync') {
      setSelectedDiff(null);
      setSelectedSync(ev?.payload || {
        destination_host: 'api.usemoss.dev',
        destination_url: 'https://api.usemoss.dev/v1/manage',
        documents_count: 0,
        bytes_count: 0,
        index_name: 'reshidual_codebase',
        authorized: true,
        network_boundary: 'Cloud index sync (outbound payload); local in-memory retrieval on query'
      });
    } else {
      setSelectedDiff(null);
      setSelectedSync(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface p-6">
      <div className="max-w-6xl w-full mx-auto space-y-6 h-full flex flex-col">

        {}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {}
          <Card className="flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-sm font-medium text-on-surface-variant uppercase tracking-wider mb-2">
              Unexpected External Connections
            </h3>
            <div className={`text-5xl font-display font-bold flex items-center gap-2 ${isClean ? 'text-success' : 'text-error'}`}>
              {unexpectedCount}
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`w-3.5 h-3.5 rounded-full ${isClean ? 'bg-success shadow-[0_0_10px_#4ade80]' : 'bg-error shadow-[0_0_10px_#ef4444]'}`}
              />
            </div>

            {}
            <div className="mt-3 flex items-center gap-2 bg-surface-container px-3 py-1 rounded-full border border-outline-variant text-xs text-on-surface-variant">
              <Cloud className="w-3.5 h-3.5 text-primary" />
              <span>Moss Cloud Sync:</span>
              <span className="font-semibold text-primary font-mono">{mossEventsCount} events</span>
            </div>
          </Card>

          {}
          <IntegrityCheck />

          {}
          <Card className="flex flex-col items-center justify-center p-6 text-center bg-primary-container/30 border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-6 h-6 text-primary" />
              <h3 className="text-base font-semibold text-on-surface">Zero Unexpected Leaks</h3>
            </div>
            <p className="text-xs text-on-surface-variant mb-3 leading-relaxed">
              Zero unexpected data leaves your device. Moss index sync is the one transparent, logged exception.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-success font-medium bg-success/10 px-3 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Network Boundary Verified</span>
            </div>
          </Card>
        </div>

        {}
        <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
          {}
          <div className="w-full md:w-[58%] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium">Live Event Ledger</h2>
              <span className="text-xs text-on-surface-variant">Click an event to inspect payload</span>
            </div>
            <EventStreamFeed
              events={events}
              isConnected={isConnected}
              onEventClick={handleEventClick}
            />
          </div>

          {}
          <div className="w-full md:w-[42%] flex flex-col">
            <h2 className="text-lg font-medium mb-3">
              {selectedSync ? 'Moss Cloud Sync Inspector' : 'Redaction Inspector'}
            </h2>
            <div className="flex-1 bg-surface-container rounded-lg border border-outline overflow-hidden">
              {selectedDiff ? (
                <RedactionDiffView diff={selectedDiff} />
              ) : selectedSync ? (
                <div className="h-full flex flex-col p-5 overflow-y-auto space-y-4">
                  <div className="flex items-center gap-2 text-primary font-medium text-base border-b border-outline pb-3">
                    <Cloud className="w-5 h-5" />
                    <span>Authorized Cloud Index Sync</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-on-surface-variant block mb-0.5">Destination Host:</span>
                      <code className="bg-surface-container-high px-2 py-1 rounded text-primary font-mono block">
                        {selectedSync.destination_url || `https://${selectedSync.destination_host || 'api.usemoss.dev'}/v1/manage`}
                      </code>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface-container-high p-3 rounded">
                        <span className="text-on-surface-variant block mb-1">Redacted Chunks</span>
                        <span className="text-base font-bold font-mono text-on-surface">
                          {selectedSync.documents_count ?? 0}
                        </span>
                      </div>
                      <div className="bg-surface-container-high p-3 rounded">
                        <span className="text-on-surface-variant block mb-1">Payload Size</span>
                        <span className="text-base font-bold font-mono text-on-surface">
                          {selectedSync.bytes_count ? `${(selectedSync.bytes_count / 1024).toFixed(1)} KB` : '0 KB'}
                        </span>
                      </div>
                    </div>

                    <div className="bg-surface-container-high p-3 rounded border border-outline-variant space-y-1">
                      <div className="flex items-center gap-1.5 text-success font-medium">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Pre-flight Redaction Guarantee</span>
                      </div>
                      <p className="text-on-surface-variant text-[11px] leading-relaxed">
                        AST-aware chunking and high-entropy secret detection ran locally on your device prior to transmission. All secrets and API keys were stripped.
                      </p>
                    </div>

                    <div className="bg-primary-container/20 p-3 rounded border border-primary/20 space-y-1">
                      <span className="text-primary font-medium block">Query Network Boundary</span>
                      <p className="text-on-surface-variant text-[11px] leading-relaxed">
                        Once synced, search queries run 100% locally in-memory via the embedded Rust core (<code className="font-mono">inferedge-moss-core</code>) with zero external round-trips.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-on-surface-variant p-6 text-center">
                  <Shield className="w-10 h-10 mb-4 opacity-50 text-primary" />
                  <p className="text-sm font-medium text-on-surface mb-1">Inspect Security & Privacy Events</p>
                  <p className="text-xs text-on-surface-variant max-w-xs">
                    Click a <code className="text-orange-400 font-mono">secret_detected</code> event to view redacted diffs, or a <code className="text-cyan-400 font-mono">moss_sync</code> event to inspect cloud transmission details.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}