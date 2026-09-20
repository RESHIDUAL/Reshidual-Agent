'use client';

import { useState, useEffect } from 'react';
import { 
  ChevronRight, 
  ChevronLeft, 
  Cpu, 
  Zap, 
  Copy, 
  Check, 
  Layers, 
  Database, 
  ExternalLink,
  Code2,
  FileCode,
  Globe,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { connectorApi } from '@/lib/api/connector';
import { SearchResult, SourcesStatusResponse } from '@/lib/api/types';

export default function ContextPanel() {
  const [isOpen, setIsOpen] = useState(true);
  const [inspectedChunk, setInspectedChunk] = useState<SearchResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [sourcesStatus, setSourcesStatus] = useState<SourcesStatusResponse | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await connectorApi.getSourcesStatus();
      setSourcesStatus(data);
    } catch {
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);

    const handler = (e: Event) => {
      const customEvt = e as CustomEvent<SearchResult>;
      if (customEvt.detail) {
        setInspectedChunk(customEvt.detail);
        setIsOpen(true);
      }
    };

    window.addEventListener('inspect-chunk', handler);
    return () => {
      clearInterval(interval);
      window.removeEventListener('inspect-chunk', handler);
    };
  }, []);

  const handleCopyContent = () => {
    if (!inspectedChunk) return;
    navigator.clipboard.writeText(inspectedChunk.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalChunks = (sourcesStatus?.codebase.chunks || 0) + 
                      (sourcesStatus?.notes.chunks || 0) + 
                      (sourcesStatus?.browser_tab.chunks || 0);

  return (
    <aside className="h-screen sticky top-0 flex flex-shrink-0 z-30 select-none">
      <div className="relative flex items-center justify-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-14 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/60 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-all shadow-elevation-2 z-40"
          title={isOpen ? 'Collapse panel' : 'Expand telemetry & inspector'}
        >
          {isOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 35 }}
            className="w-[340px] h-screen bg-surface-container-low border-l border-outline-variant/40 flex flex-col overflow-hidden"
          >
            <div className="h-16 flex-shrink-0 flex items-center justify-between px-5 border-b border-outline-variant/30 bg-surface/50">
              <div className="flex items-center gap-2 font-display font-bold text-sm text-on-surface">
                <Cpu className="w-4 h-4 text-primary" />
                <span>Engine & Citations</span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                <span>Sub-10ms Ready</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-4 bg-surface rounded-2xl border border-outline-variant/40 space-y-3 shadow-elevation-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-on-surface flex items-center gap-1.5 font-display">
                    <Zap className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Moss In-Memory Core</span>
                  </span>
                  <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded font-bold">
                    {totalChunks} chunks
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low text-[11px]">
                    <span className="flex items-center gap-1.5 text-on-surface-variant">
                      <FileCode className="w-3.5 h-3.5 text-primary" />
                      <span>Codebase</span>
                    </span>
                    <strong className="text-on-surface">{sourcesStatus?.codebase.chunks || 0} chunks</strong>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low text-[11px]">
                    <span className="flex items-center gap-1.5 text-on-surface-variant">
                      <FileText className="w-3.5 h-3.5 text-amber-500" />
                      <span>Notes</span>
                    </span>
                    <strong className="text-on-surface">{sourcesStatus?.notes.chunks || 0} chunks</strong>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-xl bg-surface-container-low text-[11px]">
                    <span className="flex items-center gap-1.5 text-on-surface-variant">
                      <Globe className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Browser Tabs</span>
                    </span>
                    <strong className="text-on-surface">{sourcesStatus?.browser_tab.chunks || 0} chunks</strong>
                  </div>
                </div>

                <p className="text-[11px] text-on-surface-variant font-sans leading-tight">
                  High-speed local retrieval executing directly in-process without network hops or database roundtrips.
                </p>
              </div>

              {inspectedChunk ? (
                <div className="p-4 bg-surface rounded-2xl border border-primary/40 space-y-3 shadow-elevation-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-bold text-primary uppercase tracking-wider block">
                        Inspected Chunk
                      </span>
                      <h4 className="font-mono text-xs font-bold text-on-surface truncate">
                        {inspectedChunk.file_path}
                      </h4>
                      <span className="text-[10px] font-mono text-on-surface-variant">
                        Lines {inspectedChunk.start_line} to {inspectedChunk.end_line}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyContent}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                      title="Copy chunk"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded-xl bg-surface-container-low">
                      <span className="text-on-surface-variant block text-[10px]">Blended</span>
                      <strong className="text-primary text-xs">{inspectedChunk.blended_score.toFixed(3)}</strong>
                    </div>
                    <div className="p-2 rounded-xl bg-surface-container-low">
                      <span className="text-on-surface-variant block text-[10px]">Semantic</span>
                      <strong className="text-on-surface text-xs">{inspectedChunk.semantic_score.toFixed(3)}</strong>
                    </div>
                  </div>

                  <div className="bg-surface-container-lowest p-3 rounded-xl font-mono text-[11px] text-on-surface overflow-x-auto max-h-72 border border-outline-variant/30 whitespace-pre-wrap leading-relaxed">
                    {inspectedChunk.content}
                  </div>

                  {inspectedChunk.why_matched && (
                    <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 text-[11px] font-mono text-on-surface-variant">
                      <strong className="text-primary block text-[10px] uppercase">Why Matched</strong>
                      <span>{inspectedChunk.why_matched}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 bg-surface rounded-2xl border border-outline-variant/30 text-center space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-surface-container mx-auto flex items-center justify-center text-on-surface-variant">
                    <Code2 className="w-5 h-5 text-primary" />
                  </div>
                  <h4 className="font-display font-semibold text-xs text-on-surface">
                    Citation Inspector
                  </h4>
                  <p className="text-[11px] text-on-surface-variant font-sans leading-relaxed">
                    Click any citation in AI Agent or any result in Semantic Search to inspect its full text and score metrics here.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
