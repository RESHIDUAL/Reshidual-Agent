'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, XCircle } from 'lucide-react';
import { FailedAttempt } from '@/lib/hooks/useHealing';
import { motion, AnimatePresence } from 'framer-motion';

export function FailedAttemptTrail({ attempts }: { attempts: FailedAttempt[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <h3 className="font-medium text-sm text-on-surface-variant uppercase tracking-wider mb-3">Rollback Trail</h3>
      {attempts.map((attempt, idx) => (
        <div key={idx} className="border border-error/30 rounded-lg overflow-hidden bg-error/5">
          <button
            onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
            className="w-full flex items-center justify-between p-3 bg-error/10 hover:bg-error/20 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-error" />
              <span className="font-medium text-error">Attempt {idx + 1} Failed</span>
            </div>
            {expandedIndex === idx ? <ChevronDown className="w-4 h-4 text-error" /> : <ChevronRight className="w-4 h-4 text-error" />}
          </button>

          <AnimatePresence>
            {expandedIndex === idx && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 border-t border-error/20 flex flex-col gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-on-surface-variant mb-1">Diff</h4>
                    <pre className="text-xs font-mono bg-surface p-2 rounded border border-outline overflow-x-auto text-on-surface">
                      {attempt.diff}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface-variant mb-1">Error Output</h4>
                    <pre className="text-xs font-mono bg-error/10 p-2 rounded border border-error/20 text-error overflow-x-auto">
                      {attempt.test_output || (attempt as any).error}
                    </pre>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}