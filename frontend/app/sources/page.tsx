'use client';

import React, { useState, useEffect } from 'react';
import { SourcePicker } from '@/components/sources/SourcePicker';
import { AutoDetectTabList } from '@/components/sources/AutoDetectTabList';
import { IndexStatusChip } from '@/components/sources/IndexStatusChip';
import { connectorApi } from '@/lib/api/connector';
import { SourcesStatusResponse } from '@/lib/api/types';
import { Layers, ShieldCheck, Database, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SourcesPage() {
  const [status, setStatus] = useState<SourcesStatusResponse>({
    codebase: { status: 'not_indexed', chunks: 0, files_count: 0, path: '', last_updated: '' },
    notes: { status: 'not_indexed', chunks: 0, files_count: 0, path: '', last_updated: '' },
    browser_tab: { status: 'not_indexed', chunks: 0, tabs_count: 0, last_updated: '' }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStatus = async () => {
    setIsRefreshing(true);
    try {
      const data = await connectorApi.getSourcesStatus();
      setStatus(data);
    } catch {
      
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const totalIndexedChunks =
    (status.codebase.chunks || 0) +
    (status.notes.chunks || 0) +
    (status.browser_tab.chunks || 0);

  return (
    <div className="w-full min-h-full p-6 md:p-8 space-y-6 max-w-6xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-outline-variant/40">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Database className="w-5 h-5" />
            </div>
            <h1 className="font-display font-semibold text-2xl text-on-surface">
              Data Sources & Ingestion
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Select and index your Codebases, Notes, and Browser Tabs into the local Moss retrieval engine
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 p-1.5 bg-surface-container-low rounded-2xl border border-outline-variant/40">
            <IndexStatusChip type="codebase" status={status.codebase} compact />
            <IndexStatusChip type="notes" status={status.notes} compact />
            <IndexStatusChip type="browser_tab" status={status.browser_tab} compact />
          </div>

          <button
            type="button"
            onClick={fetchStatus}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-surface-container border border-outline-variant/60 text-on-surface hover:text-primary transition-colors"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 flex items-center justify-between gap-4 flex-wrap text-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-success flex-shrink-0" />
          <div>
            <span className="font-semibold text-on-surface">Local-First Pipeline Active</span>
            <span className="text-on-surface-variant ml-1.5">
              All three sources pass through Tree-sitter AST and text chunking, automated secret redaction, and local in-memory index sync.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs text-on-surface bg-surface-container px-3 py-1.5 rounded-xl border border-outline-variant/30">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span>Total Chunks in Memory:</span>
          <strong className="text-primary">{totalIndexedChunks}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <SourcePicker
            sourceType="codebase"
            title="Codebase Repositories"
            description="Index your local Git repositories and code folders with AST-aware Tree-sitter parsing and high-entropy secret detection"
            status={status.codebase}
            onIndexed={fetchStatus}
            accentColor="primary"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
        >
          <SourcePicker
            sourceType="notes"
            title="Notes, Documents & Spreadsheets"
            description="Index personal notes, research papers, Markdown files, Word documents, PDFs, and Excel spreadsheets"
            status={status.notes}
            onIndexed={fetchStatus}
            accentColor="amber"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <AutoDetectTabList
            status={status.browser_tab}
            onIndexed={fetchStatus}
          />
        </motion.div>
      </div>
    </div>
  );
}