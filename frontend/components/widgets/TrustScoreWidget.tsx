'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Gauge } from '@/components/ui/Gauge';
import { getTrustScore } from '@/lib/api/connector';
import { formatLatency } from '@/lib/utils/formatters';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { TrustScore } from '@/lib/api/types';

export function TrustScoreWidget() {
  const [data, setData] = useState<TrustScore | null>(null);

  useEffect(() => {
    getTrustScore().then(setData).catch(console.error);
  }, []);

  const score = data?.overall ?? 0;
  const colorScheme = score > 80 ? 'success' : score > 50 ? 'warning' : 'error';

  return (
    <Card className="flex flex-col p-4 h-full items-center justify-center gap-3">
      <h3 className="text-sm font-semibold w-full text-left" style={{ color: 'var(--md-sys-color-on-surface)' }}>
        Trust Score
      </h3>

      <div className="flex-grow flex items-center justify-center">
        <Gauge size="md" value={score} label={String(score)} colorScheme={colorScheme === 'warning' ? 'primary' : colorScheme} />
      </div>

      <div className="grid grid-cols-3 gap-2 w-full mt-1">
        <div className="flex flex-col items-center p-2 rounded-lg" style={{ backgroundColor: 'var(--md-sys-color-surface-container)' }}>
          <span className="text-[10px]" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}> Recall</span>
          <div className="w-full h-1 rounded-full mt-1 mb-1" style={{ backgroundColor: 'var(--md-sys-color-surface-container-highest)' }}>
            <div className="h-full rounded-full" style={{ backgroundColor: 'var(--md-sys-color-primary)', width: `${(data?.recall_at_3 ?? 0) * 100}%` }} />
          </div>
          <span className="text-xs font-bold">{data?.recall_at_3?.toFixed(2) ?? '-'}</span>
        </div>

        <div className="flex flex-col items-center p-2 rounded-lg" style={{ backgroundColor: 'var(--md-sys-color-surface-container)' }}>
          <span className="text-[10px]" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}> Latency</span>
          <span className="text-xs font-bold mt-auto">{data ? formatLatency(data.p95_latency_ms) : '-'}</span>
        </div>

        <div className="flex flex-col items-center p-2 rounded-lg" style={{ backgroundColor: 'var(--md-sys-color-surface-container)' }}>
          <span className="text-[10px]" style={{ color: 'var(--md-sys-color-on-surface-variant)' }}> Zero-Leak</span>
          <div className="mt-auto">
            {data?.zero_leak !== false ? (
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--md-sys-color-success)' }} />
            ) : (
              <XCircle className="w-4 h-4" style={{ color: 'var(--md-sys-color-error)' }} />
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}