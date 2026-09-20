'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EvalHarnessWidget } from '@/components/widgets/EvalHarnessWidget';
import { LatencyRaceWidget } from '@/components/widgets/LatencyRaceWidget';
import { TrustScoreWidget } from '@/components/widgets/TrustScoreWidget';
import { runEval } from '@/lib/api/connector';
import { formatPercentage, formatLatency } from '@/lib/utils/formatters';
import { Play, Loader2 } from 'lucide-react';
import { EvalResult } from '@/lib/api/types';

export default function EvalPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<EvalResult | null>(null);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const handleRunEval = async () => {
    setIsRunning(true);
    try {
      const res = await runEval();
      setResults(res);
      setLastRun(new Date());
    } catch (err) {
      console.error('Failed to run eval', err);
    } finally {
      setIsRunning(false);
    }
  };

  const mockTableData = [
    { query: 'Where is auth handled?', expected: 'auth.ts', found: true, moss: 45, naive: 320 },
    { query: 'How to restart indexing?', expected: 'api/index.ts', found: true, moss: 52, naive: 410 },
    { query: 'Update default alpha', expected: 'settings.ts', found: false, moss: 38, naive: 290 },
  ];

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface p-6 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto space-y-8">

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-medium text-primary">Evaluation Harness</h1>
            {lastRun && <p className="text-sm text-on-surface-variant mt-1">Last run: {lastRun.toLocaleTimeString()}</p>}
          </div>
          <div className="flex items-center gap-4">
            <TrustScoreWidget />
            <Button size="lg" onClick={handleRunEval} disabled={isRunning} className="gap-2">
              {isRunning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              {isRunning ? 'Running Eval...' : 'Run Evaluation'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <EvalHarnessWidget />

            <div className="bg-surface-container rounded-lg border border-outline overflow-hidden">
              <div className="p-4 border-b border-outline bg-surface-container-high">
                <h3 className="font-medium">Query Results</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface-container-highest text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3 font-medium">Query</th>
                      <th className="px-4 py-3 font-medium">Expected</th>
                      <th className="px-4 py-3 font-medium">Found in Top 3?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTableData.map((row, i) => (
                      <tr key={i} className="border-b border-outline last:border-0 hover:bg-surface-container-high transition-colors">
                        <td className="px-4 py-3">{row.query}</td>
                        <td className="px-4 py-3 font-mono text-xs">{row.expected}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.found ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
                            {row.found ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <LatencyRaceWidget />

            <div className="bg-surface-container rounded-lg border border-outline overflow-hidden">
              <div className="p-4 border-b border-outline bg-surface-container-high">
                <h3 className="font-medium">Latency Comparison</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-surface-container-highest text-on-surface-variant">
                    <tr>
                      <th className="px-4 py-3 font-medium">Query</th>
                      <th className="px-4 py-3 font-medium">Moss (ms)</th>
                      <th className="px-4 py-3 font-medium">Naive (ms)</th>
                      <th className="px-4 py-3 font-medium">Speedup</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTableData.map((row, i) => (
                      <tr key={i} className="border-b border-outline last:border-0 hover:bg-surface-container-high transition-colors">
                        <td className="px-4 py-3 truncate max-w-[150px]">{row.query}</td>
                        <td className="px-4 py-3 font-mono text-primary font-medium">{row.moss}ms</td>
                        <td className="px-4 py-3 font-mono text-on-surface-variant">{row.naive}ms</td>
                        <td className="px-4 py-3 font-mono text-success">
                          {(row.naive / row.moss).toFixed(1)}x
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}