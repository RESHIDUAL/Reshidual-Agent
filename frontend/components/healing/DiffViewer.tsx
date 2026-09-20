'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { Check, X } from 'lucide-react';

interface DiffViewerProps {
  diff: string;
  onAccept: () => void;
  onReject: () => void;
}

export function DiffViewer({ diff, onAccept, onReject }: DiffViewerProps) {
  const renderLine = (line: string, i: number) => {
    let bg = 'bg-transparent';
    let text = 'text-on-surface';

    if (line.startsWith('+')) {
      bg = 'bg-success/20';
      text = 'text-success';
    } else if (line.startsWith('-')) {
      bg = 'bg-error/20';
      text = 'text-error';
    } else if (line.startsWith('@@')) {
      bg = 'bg-surface-variant';
      text = 'text-on-surface-variant font-bold';
    }

    return (
      <div key={i} className={`flex px-2 py-0.5 ${bg} ${text} hover:bg-on-surface/5`}>
        <div className="w-8 flex-shrink-0 text-right pr-2 select-none opacity-50 text-xs py-0.5">
          {i + 1}
        </div>
        <div className="whitespace-pre flex-1 font-mono text-sm">{line}</div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-surface-container">
      <div className="flex-1 overflow-auto py-2">
        {diff.split('\n').map((line, i) => renderLine(line, i))}
      </div>

      <div className="p-4 bg-surface-container-high border-t border-outline flex justify-end gap-3">
        <Button variant="outlined" className="border-error text-error hover:bg-error/10 gap-2" onClick={onReject}>
          <X className="w-4 h-4" /> Reject
        </Button>
        <Button className="bg-success text-on-success hover:bg-success/90 gap-2" onClick={onAccept}>
          <Check className="w-4 h-4" /> Accept
        </Button>
      </div>
    </div>
  );
}