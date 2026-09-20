'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Gauge } from '@/components/ui/Gauge';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { runEval } from '@/lib/api/connector';
import { formatPercentage } from '@/lib/utils/formatters';

export function EvalHarnessWidget() {
  const [recallValue, setRecallValue] = useState<number>(0.85);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunEval = async () => {
    setIsRunning(true);
    try {
      const result = await runEval();
      setRecallValue(result.recall_at_3 ?? result.recallAt3 ?? 0.85);
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunning(false);
    }
  };

  const percentage = recallValue * 100;
  const colorScheme = recallValue > 0.85 ? 'success' : recallValue >= 0.5 ? 'primary' : 'error';

  return (
    <Card className="flex flex-col p-4 h-full items-center justify-between gap-4">
      <div className="w-full text-left">
        <h3 className="text-md3-title-medium text-md-sys-color-on-surface">Recall@3</h3>
        <p className="text-md3-body-small text-md-sys-color-on-surface-variant">Evaluation Harness</p>
      </div>

      <div className="flex-grow flex flex-col items-center justify-center relative w-full">
        {isRunning ? (
          <LoadingState text="Running eval..." />
        ) : (
          <>
            <Gauge size="md" value={percentage} colorScheme={colorScheme} />
            <div className="mt-2 text-md3-title-medium font-mono text-md-sys-color-on-surface">
              {recallValue.toFixed(3)}
            </div>
          </>
        )}
      </div>

      <div className="w-full">
        <Button onClick={handleRunEval} disabled={isRunning} variant="filled" size="sm" className="w-full">
          Run Eval
        </Button>
      </div>
    </Card>
  );
}