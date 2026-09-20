'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FolderGit2, 
  FileText, 
  Globe, 
  Layers, 
  ArrowRight,
  Database
} from 'lucide-react';
import { connectorApi } from '@/lib/api/connector';
import { SourcesStatusResponse } from '@/lib/api/types';
import { IndexStatusChip } from '@/components/sources/IndexStatusChip';

interface ContextSourceManagerProps {
  activeSource: string;
  onSelectSource: (source: string) => void;
  onSourcesUpdated?: () => void;
}

export function ContextSourceManager({
  activeSource,
  onSelectSource,
  onSourcesUpdated
}: ContextSourceManagerProps) {
  const [status, setStatus] = useState<SourcesStatusResponse>({
    codebase: { status: 'not_indexed', chunks: 0, files_count: 0, path: '', last_updated: '' },
    notes: { status: 'not_indexed', chunks: 0, files_count: 0, path: '', last_updated: '' },
    browser_tab: { status: 'not_indexed', chunks: 0, tabs_count: 0, last_updated: '' }
  });

  const loadStatus = async () => {
    try {
      const data = await connectorApi.getSourcesStatus();
      setStatus(data);
    } catch {
      
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-surface-container-low rounded-xl border border-outline-variant/40">
          <button
            type="button"
            onClick={() => onSelectSource('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSource === 'all'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Sources</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectSource('codebase')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSource === 'codebase'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>Codebases</span>
            {status.codebase.chunks > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface">
                {status.codebase.chunks}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectSource('notes')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSource === 'notes' || activeSource === 'document'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notes & Docs</span>
            {status.notes.chunks > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface">
                {status.notes.chunks}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onSelectSource('browser_tab')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeSource === 'browser_tab'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Browser Tabs</span>
            {status.browser_tab.chunks > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface">
                {status.browser_tab.chunks}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden sm:flex items-center gap-1.5">
            <IndexStatusChip type="codebase" status={status.codebase} compact />
            <IndexStatusChip type="notes" status={status.notes} compact />
            <IndexStatusChip type="browser_tab" status={status.browser_tab} compact />
          </div>

          <Link
            href="/sources"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container border border-outline-variant/60 text-xs font-medium text-on-surface hover:border-primary/60 hover:text-primary transition-colors shadow-sm"
          >
            <Database className="w-3.5 h-3.5 text-primary" />
            <span>Configure Sources</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}