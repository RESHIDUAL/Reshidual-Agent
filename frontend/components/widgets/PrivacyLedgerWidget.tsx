'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { ArrowRight, Cloud, ShieldCheck, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { getPrivacySummary } from '@/lib/api/connector';

interface PrivacyLedgerWidgetProps {
  externalConnections?: number;
  unexpectedConnections?: number;
  mossSyncEvents?: number;
}

export function PrivacyLedgerWidget({
  externalConnections,
  unexpectedConnections,
  mossSyncEvents
}: PrivacyLedgerWidgetProps) {
  const [unexpected, setUnexpected] = useState(unexpectedConnections ?? externalConnections ?? 0);
  const [mossSyncs, setMossSyncs] = useState(mossSyncEvents ?? 0);
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {

    if (unexpectedConnections === undefined && externalConnections === undefined) {
      getPrivacySummary()
        .then(summary => {
          setUnexpected(summary.unexpected_connections);
          setMossSyncs(summary.moss_sync_events);
        })
        .catch(() => {});
    } else {
      if (unexpectedConnections !== undefined) setUnexpected(unexpectedConnections);
      else if (externalConnections !== undefined) setUnexpected(externalConnections);
      if (mossSyncEvents !== undefined) setMossSyncs(mossSyncEvents);
    }
  }, [externalConnections, unexpectedConnections, mossSyncEvents]);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 800;
    const target = unexpected;

    if (target === 0) {
      setDisplayCount(0);
      return;
    }

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setDisplayCount(Math.floor(progress * target));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [unexpected]);

  const isClean = unexpected === 0;

  return (
    <Card variant="elevated" className="flex flex-col p-4 md3-elevation-2 relative overflow-hidden h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isClean ? (
            <ShieldCheck className="w-5 h-5 text-success" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-error animate-bounce" />
          )}
          <h3 className="text-md3-title-small font-medium text-on-surface">
            Unexpected External Connections
          </h3>
        </div>
        <div
          className={clsx(
            "w-3 h-3 rounded-full transition-all duration-500",
            isClean
              ? "bg-success shadow-[0_0_8px_#4ade80] animate-pulse"
              : "bg-error shadow-[0_0_8px_#ef4444]"
          )}
        />
      </div>

      <div className="flex-grow flex flex-col items-center justify-center my-2">
        <div className={clsx(
          "text-5xl font-bold font-display tabular-nums tracking-tighter transition-colors duration-300",
          isClean ? "text-success" : "text-error"
        )}>
          {displayCount}
        </div>
        <span className="text-xs text-on-surface-variant mt-1 text-center">
          {isClean ? 'Strict Zero Unexpected Leak Enforced' : 'Warning: Unauthorized External Traffic Detected'}
        </span>
      </div>

      {}
      <div className="bg-surface-container-high rounded-md p-2.5 my-2 border border-outline-variant flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <Cloud className="w-4 h-4 text-primary" />
          <span className="font-medium text-on-surface">Moss Cloud Sync:</span>
        </div>
        <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded font-mono font-medium">
          {mossSyncs} {mossSyncs === 1 ? 'event' : 'events'}
        </span>
      </div>

      <p className="text-[11px] text-on-surface-variant line-clamp-2 italic">
        Zero unexpected data leaves your device. Moss index sync is the one transparent, logged exception.
      </p>

      <div className="mt-auto pt-3 flex justify-end">
        <Link
          href="/privacy"
          className="text-xs font-medium text-primary hover:text-primary-container transition-colors flex items-center gap-1 group"
        >
          View Privacy Ledger <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </Card>
  );
}