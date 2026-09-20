'use client';

import React from 'react';
import { HealingInput } from '@/components/healing/HealingInput';
import { HealingStepper } from '@/components/healing/HealingStepper';
import { FailedAttemptTrail } from '@/components/healing/FailedAttemptTrail';
import { DiffViewer } from '@/components/healing/DiffViewer';
import { useHealing } from '@/lib/hooks/useHealing';
import { EmptyState } from '@/components/ui/EmptyState';
import { Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HealingPage() {
  const {
    startHealing,
    isHealing,
    steps,
    failedAttempts,
    finalDiff,
    acceptDiff,
    rejectDiff,
    currentOutput
  } = useHealing();

  const hasStarted = isHealing || steps.length > 0 || finalDiff;

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface p-6">
      <div className="max-w-5xl w-full mx-auto space-y-8 flex-1 flex flex-col">
        <HealingInput onStart={startHealing} disabled={isHealing} />

        {!hasStarted ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={<Wrench className="w-16 h-16 text-primary" />}
              title="Self-Healing Loop"
              description="Describe a bug or issue to start the autonomous self-healing process."
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
            <div className="w-full md:w-[60%] flex flex-col gap-6 overflow-y-auto pr-2 pb-4">
              <HealingStepper steps={steps} />

              {failedAttempts.length > 0 && (
                <FailedAttemptTrail attempts={failedAttempts} />
              )}
            </div>

            <div className="w-full md:w-[40%] flex flex-col bg-surface-container rounded-lg border border-outline overflow-hidden">
              <div className="p-4 bg-surface-container-high border-b border-outline font-medium text-on-surface">
                {finalDiff ? 'Proposed Fix (Diff)' : 'Current Output'}
              </div>
              <div className="flex-1 overflow-y-auto p-0">
                <AnimatePresence mode="wait">
                  {finalDiff ? (
                    <motion.div
                      key="diff"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="h-full"
                    >
                      <DiffViewer
                        diff={finalDiff}
                        onAccept={acceptDiff}
                        onReject={rejectDiff}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="output"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-4 font-mono text-sm whitespace-pre-wrap text-on-surface-variant"
                    >
                      {currentOutput || 'Waiting for output...'}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}