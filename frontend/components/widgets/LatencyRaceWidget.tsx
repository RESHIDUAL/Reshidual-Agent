'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Trophy, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { runLatencyRace } from '@/lib/api/connector';
import { formatLatency } from '@/lib/utils/formatters';

interface LatencyRaceWidgetProps {
  initialQuery?: string;
}

export function LatencyRaceWidget({ initialQuery = 'test' }: LatencyRaceWidgetProps) {
  const [mossMs, setMossMs] = useState(0);
  const [naiveMs, setNaiveMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [winner, setWinner] = useState<'moss' | 'naive' | null>(null);

  const triggerRace = async () => {
    setIsRunning(true);
    setMossMs(0);
    setNaiveMs(0);
    setWinner(null);

    try {
      const result = await runLatencyRace(initialQuery);
      const m = result.moss_latency_ms ?? result.mossLatencyMs ?? 0;
      const n = result.naive_latency_ms ?? result.naiveLatencyMs ?? 0;
      setMossMs(m);
      setNaiveMs(n);
      setWinner(m <= n ? 'moss' : 'naive');
    } catch (e) {
      console.error("Race failed", e);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    triggerRace();

  }, []);

  const maxMs = Math.max(mossMs, naiveMs, 100);
  const mossWidth = (mossMs / maxMs) * 100;
  const naiveWidth = (naiveMs / maxMs) * 100;

  return (
    <Card className="flex flex-col p-4 h-full gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-md-sys-color-primary" />
          <h3 className="text-md3-title-medium text-md-sys-color-on-surface">Latency Race</h3>
        </div>
        <Button onClick={triggerRace} disabled={isRunning} variant="tonal" size="sm">
          Run Race
        </Button>
      </div>

      <div className="flex flex-col gap-4 flex-grow justify-center">
        {}
        <div className="space-y-1">
          <div className="flex justify-between text-md3-label-medium text-md-sys-color-on-surface-variant">
            <span className="flex items-center gap-1">Moss {winner === 'moss' && <Star className="w-3 h-3 text-yellow-500 fill-current" />}</span>
            <span>{formatLatency(mossMs)}</span>
          </div>
          <div className="h-4 bg-md-sys-color-surface-container-highest rounded-full overflow-hidden w-full relative">
            <motion.div
              layout
              initial={{ width: 0 }}
              animate={{ width: `${mossWidth}%` }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.8 }}
              className="absolute left-0 top-0 bottom-0 bg-md-sys-color-primary rounded-full"
            />
          </div>
        </div>

        {}
        <div className="space-y-1">
          <div className="flex justify-between text-md3-label-medium text-md-sys-color-on-surface-variant">
            <span className="flex items-center gap-1">Naive {winner === 'naive' && <Star className="w-3 h-3 text-yellow-500 fill-current" />}</span>
            <span>{formatLatency(naiveMs)}</span>
          </div>
          <div className="h-4 bg-md-sys-color-surface-container-highest rounded-full overflow-hidden w-full relative">
            <motion.div
              layout
              initial={{ width: 0 }}
              animate={{ width: `${naiveWidth}%` }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.8, delay: 0.1 }}
              className="absolute left-0 top-0 bottom-0 bg-md-sys-color-tertiary rounded-full"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}