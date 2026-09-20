'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { FileText, ShieldAlert } from 'lucide-react';
import { RedactionDiff } from '@/lib/api/types';

interface RedactionDiffViewProps {
  diff: RedactionDiff | null;
}

export function RedactionDiffView({ diff }: RedactionDiffViewProps) {
  if (!diff) {
    return (
      <Card className="h-full min-h-[300px] flex items-center justify-center p-6">
        <EmptyState
          icon={<ShieldAlert className="w-12 h-12 text-md-sys-color-outline" />}
          title="No Redaction Selected"
          description="Select a secret_detected event from the ledger to view redaction details"
        />
      </Card>
    );
  }

  const redactionList = diff.redactions || (diff as any).replacements || [];
  const filePath = (diff as any).filePath || diff.chunk_id || 'unknown_chunk';

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <div className="bg-surface-container-highest px-4 py-3 flex items-center justify-between border-b border-outline-variant">
        <div className="flex items-center gap-2 text-on-surface">
          <FileText className="w-5 h-5 text-on-surface-variant" />
          <span className="font-mono text-sm truncate">{filePath}</span>
        </div>
        <div className="bg-error-container text-on-error-container px-2.5 py-1 rounded-full text-xs font-bold">
          {redactionList.length} Redactions
        </div>
      </div>

      <div className="p-4 flex-grow overflow-auto bg-surface">
        <div className="font-mono text-sm whitespace-pre-wrap break-all leading-relaxed p-4 bg-surface-container rounded-lg border border-outline-variant">
          {redactionList.map((rep: any, idx: number) => (
            <div key={idx} className="mb-4 pb-4 border-b border-outline-variant last:border-0 last:mb-0 last:pb-0">
              <div className="text-on-surface-variant mb-1 text-xs uppercase tracking-wider">Original:</div>
              <div className="line-through bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-2 py-1 rounded">
                {rep.original || rep.originalText}
              </div>

              <div className="text-on-surface-variant mt-3 mb-1 text-xs uppercase tracking-wider">Redacted:</div>
              <div className="font-bold bg-red-100 dark:bg-red-950/40 text-red-900 dark:text-red-200 px-2 py-1 rounded">
                {rep.replacement || `[REDACTED: ${rep.reason}]`}
              </div>
            </div>
          ))}
          {redactionList.length === 0 && (
            <div className="text-on-surface-variant italic">
              {diff.raw_content ? (
                <div>
                  <div className="text-xs uppercase mb-1">Raw:</div>
                  <pre className="bg-surface-container-high p-2 rounded mb-2">{diff.raw_content}</pre>
                  <div className="text-xs uppercase mb-1">Redacted:</div>
                  <pre className="bg-surface-container-high p-2 rounded">{diff.redacted_content}</pre>
                </div>
              ) : (
                'No specific text replacements logged for this diff.'
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-surface-container px-4 py-3 border-t border-outline-variant">
        <h4 className="text-xs text-on-surface-variant mb-2 uppercase tracking-wider">Applied Rules</h4>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set(redactionList.map((r: any) => r.reason))).filter(Boolean).map((reason: any) => (
            <span key={reason} className="px-2 py-1 bg-secondary-container text-on-secondary-container text-xs rounded border border-outline-variant">
              {reason}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}