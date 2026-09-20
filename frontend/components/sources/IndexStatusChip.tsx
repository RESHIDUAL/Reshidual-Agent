'use client';

import React from 'react';
import { FolderGit2, FileText, Globe } from 'lucide-react';
import { SourceStatusItem } from '@/lib/api/types';

interface IndexStatusChipProps {
  type: 'codebase' | 'notes' | 'browser_tab';
  status: SourceStatusItem;
  onClick?: () => void;
  compact?: boolean;
}

export function IndexStatusChip({ type, status, onClick, compact = false }: IndexStatusChipProps) {
  const getIcon = () => {
    if (type === 'codebase') return <FolderGit2 className="w-3.5 h-3.5 text-primary" />;
    if (type === 'notes') return <FileText className="w-3.5 h-3.5 text-amber-500" />;
    return <Globe className="w-3.5 h-3.5 text-emerald-500" />;
  };

  const getLabel = () => {
    if (type === 'codebase') return 'Codebase';
    if (type === 'notes') return 'Notes';
    return 'Browser Tabs';
  };

  const isIndexed = status.status === 'indexed';
  const isIndexing = status.status === 'indexing';

  const getStatusText = () => {
    if (isIndexing) return 'Indexing...';
    if (isIndexed) {
      if (compact) return `${status.chunks} chunks`;
      return `${status.chunks} chunks (${status.last_updated || 'Indexed'})`;
    }
    return 'Not indexed';
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-xs font-mono select-none ${
        isIndexed
          ? 'bg-surface-container border-outline-variant/60 text-on-surface hover:border-primary/50 hover:bg-surface-container-high'
          : isIndexing
          ? 'bg-primary/10 border-primary/40 text-primary animate-pulse'
          : 'bg-surface-container-low border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
      }`}
    >
      {getIcon()}
      <span className="font-sans font-medium text-on-surface">{getLabel()}</span>
      <span className="text-outline-variant">:</span>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isIndexed
            ? 'bg-success shadow-[0_0_6px_#4ade80]'
            : isIndexing
            ? 'bg-primary shadow-[0_0_6px_#3b82f6] animate-ping'
            : 'bg-outline-variant'
        }`}
      />
      <span className="text-[11px] text-on-surface-variant">{getStatusText()}</span>
    </button>
  );
}