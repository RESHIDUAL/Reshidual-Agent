'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Layers, 
  FolderGit2, 
  FileText, 
  Globe, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Sliders, 
  Zap, 
  ShieldCheck, 
  Plus,
  Code2,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react';
import { connectorApi } from '@/lib/api/connector';
import { SearchResult, TimingInfo, SourcesStatusResponse } from '@/lib/api/types';
import { InlineSourceManager } from '@/components/sources/InlineSourceManager';
import { motion, AnimatePresence } from 'framer-motion';

type SourceType = 'all' | 'codebase' | 'notes' | 'browser_tab';

interface SemanticSearchRawProps {
  initialQuery?: string;
  onSelectResult?: (result: SearchResult) => void;
}

const SOURCE_OPTIONS: { id: SourceType; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All Sources', icon: Layers },
  { id: 'codebase', label: 'Codebase', icon: FolderGit2 },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'browser_tab', label: 'Browser Tabs', icon: Globe }
];

const SEARCH_PRESETS = [
  'MossEngine',
  'BrowserTabDetector',
  'tree_sitter_parser',
  'DocumentParser',
  'docker_sandbox',
  'sub-10ms retrieval'
];

export function SemanticSearchRaw({ initialQuery = '', onSelectResult }: SemanticSearchRawProps) {
  const [queryText, setQueryText] = useState(initialQuery);
  const [alpha, setAlpha] = useState(0.5);
  const [sourceType, setSourceType] = useState<SourceType>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [timing, setTiming] = useState<TimingInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedChunkId, setExpandedChunkId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSourceManagerOpen, setIsSourceManagerOpen] = useState(false);
  const [sourcesStatus, setSourcesStatus] = useState<SourcesStatusResponse | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await connectorApi.getSourcesStatus();
      setSourcesStatus(data);
    } catch {
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const executeSearch = async (textToSearch: string, currentAlpha: number, currentSource: SourceType) => {
    if (!textToSearch.trim()) {
      setResults([]);
      setTiming(null);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const res = await connectorApi.query(
        textToSearch.trim(),
        currentAlpha,
        'semantic_search_session',
        undefined,
        currentSource,
        [],
        false,
        0.0,
        false
      );

      setResults(res.results || []);
      setTiming(res.timing);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch(queryText, alpha, sourceType);
    }
  };

  const handleAlphaChange = (newAlpha: number) => {
    setAlpha(newAlpha);
    if (queryText.trim() && hasSearched) {
      executeSearch(queryText, newAlpha, sourceType);
    }
  };

  const handleSourceChange = (newSource: SourceType) => {
    setSourceType(newSource);
    if (queryText.trim() && hasSearched) {
      executeSearch(queryText, alpha, newSource);
    }
  };

  const handlePresetClick = (preset: string) => {
    setQueryText(preset);
    executeSearch(preset, alpha, sourceType);
  };

  const handleResultClick = (result: SearchResult) => {
    const chunkId = result.chunk_id || '';
    setExpandedChunkId(prev => (prev === chunkId ? null : chunkId));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inspect-chunk', { detail: result }));
    }
    if (onSelectResult) onSelectResult(result);
  };

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getSourceBadge = (source?: string) => {
    if (source === 'notes' || source === 'document') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
          <FileText className="w-3.5 h-3.5" />
          <span>Notes</span>
        </span>
      );
    }
    if (source === 'browser_tab') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
          <Globe className="w-3.5 h-3.5" />
          <span>Web Tab</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/25">
        <FolderGit2 className="w-3.5 h-3.5" />
        <span>Codebase</span>
      </span>
    );
  };

  const getScorePill = (score: number) => {
    let colorClass = 'bg-rose-500/10 text-rose-500 border-rose-500/30';
    if (score >= 0.8) {
      colorClass = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]';
    } else if (score >= 0.6) {
      colorClass = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }

    return (
      <div className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold border flex items-center gap-1.5 ${colorClass}`}>
        <span className="text-[10px] uppercase tracking-wider opacity-75">Score</span>
        <span>{score.toFixed(3)}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface select-none">
      <div className="flex-shrink-0 px-6 md:px-10 py-6 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 space-y-4 z-10">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider font-mono">
                Active Sources:
              </span>

              <button
                type="button"
                onClick={() => setIsSourceManagerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-xs font-mono transition-all text-on-surface hover:border-primary/50 shadow-elevation-1"
                title="Manage and index Codebase, Notes, or Browser Tabs"
              >
                <FolderGit2 className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold">Code</span>
                <span className="text-[11px] opacity-75">({sourcesStatus?.codebase.chunks || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSourceManagerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-xs font-mono transition-all text-on-surface hover:border-primary/50 shadow-elevation-1"
                title="Manage and index Codebase, Notes, or Browser Tabs"
              >
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-semibold">Notes</span>
                <span className="text-[11px] opacity-75">({sourcesStatus?.notes.chunks || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSourceManagerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-xs font-mono transition-all text-on-surface hover:border-primary/50 shadow-elevation-1"
                title="Manage and index Codebase, Notes, or Browser Tabs"
              >
                <Globe className="w-3.5 h-3.5 text-emerald-500" />
                <span className="font-semibold">Tabs</span>
                <span className="text-[11px] opacity-75">({sourcesStatus?.browser_tab.chunks || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSourceManagerOpen(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-xs font-semibold transition-all shadow-elevation-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add / Index Data</span>
              </button>
            </div>
          </div>

          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-on-surface-variant/60 absolute left-4 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search code, functions, notes, or browser tabs in Moss..."
              className="w-full bg-surface-container text-on-surface placeholder:text-on-surface-variant/50 text-base font-sans pl-12 pr-28 py-3.5 rounded-2xl border border-outline-variant/50 outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 transition-all shadow-elevation-1"
            />
            <div className="absolute right-3 flex items-center gap-2">
              {queryText && (
                <button
                  type="button"
                  onClick={() => {
                    setQueryText('');
                    setResults([]);
                    setTiming(null);
                    setHasSearched(false);
                    inputRef.current?.focus();
                  }}
                  className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                  title="Clear input"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => executeSearch(queryText, alpha, sourceType)}
                disabled={!queryText.trim() || isLoading}
                className="px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-40 shadow-elevation-1"
              >
                Search
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap pt-1">
            <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-2xl border border-outline-variant/40 shadow-elevation-1">
              {SOURCE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isActive = sourceType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSourceChange(opt.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-primary text-on-primary shadow-elevation-1'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-3 bg-surface-container px-4 py-2 rounded-2xl border border-outline-variant/40 shadow-elevation-1 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <span className="font-semibold">Keyword</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={alpha}
                onChange={(e) => handleAlphaChange(parseFloat(e.target.value))}
                className="w-28 md:w-36 accent-primary cursor-pointer h-2 rounded-lg bg-surface-container-high"
                title={`Alpha: ${alpha.toFixed(2)}`}
              />
              <div className="flex items-center gap-2">
                <span className="font-semibold text-primary">Semantic</span>
                <span className="px-2 py-0.5 rounded-lg bg-surface border border-outline-variant/40 text-xs font-bold text-on-surface">
                  α = {alpha.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-xs font-mono text-on-surface-variant font-medium">Quick presets:</span>
            {SEARCH_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className="px-3 py-1 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 text-xs font-mono text-on-surface-variant hover:text-primary transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {timing && hasSearched && (
        <div className="flex-shrink-0 bg-surface-container-low border-b border-outline-variant/30 px-6 md:px-10 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap text-xs font-mono">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <Zap className="w-4 h-4" />
                <span>Moss Retrieval: {timing.semantic_ms}ms</span>
              </div>
              <div className="h-3.5 w-px bg-outline-variant/40" />
              <span className="text-on-surface-variant font-medium">Keyword: {timing.keyword_ms}ms</span>
              <div className="h-3.5 w-px bg-outline-variant/40" />
              <span className="text-on-surface font-bold">Total: {timing.total_ms}ms</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full bg-surface border border-outline-variant/40 font-bold text-on-surface text-xs">
                {results.length} ranked chunks
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6 max-w-4xl w-full mx-auto">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="p-5 bg-surface-container-low rounded-3xl border border-outline-variant/30 space-y-3 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-60 bg-surface-container-high rounded-full" />
                  <div className="h-6 w-20 bg-surface-container-high rounded-full" />
                </div>
                <div className="h-3.5 w-full bg-surface-container-high rounded" />
                <div className="h-3.5 w-4/5 bg-surface-container-high rounded" />
              </div>
            ))}
          </div>
        ) : errorMessage ? (
          <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-3xl text-rose-500 text-sm font-mono">
            {errorMessage}
          </div>
        ) : !hasSearched ? (
          <div className="flex flex-col items-center justify-center text-center py-20 space-y-5 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-elevation-2">
              <Code2 className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-bold text-lg text-on-surface">
                Raw Semantic Search Mode
              </h3>
              <p className="text-sm text-on-surface-variant font-sans leading-relaxed">
                Direct in-memory retrieval powered by Moss without heavy cloud infrastructure or traditional vector databases.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-3.5 py-2 rounded-2xl border border-emerald-500/20 shadow-elevation-1">
              <Zap className="w-4 h-4" />
              <span>Sub-10ms in-memory retrieval engine</span>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20 text-sm text-on-surface-variant font-mono space-y-2">
            <p>No matching chunks found in local Moss index for "{queryText}".</p>
            <p className="text-xs text-on-surface-variant/70">
              Try adjusting the Alpha slider toward Keyword (0.0) or add more data sources.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pb-20">
            {results.map((result, idx) => {
              const chunkId = result.chunk_id || `chunk_${idx}`;
              const isExpanded = expandedChunkId === chunkId;

              return (
                <motion.div
                  key={chunkId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(idx * 0.03, 0.3) }}
                  onClick={() => handleResultClick(result)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-elevation-1 hover:shadow-elevation-2 ${
                    isExpanded
                      ? 'bg-surface-container border-primary/60 ring-2 ring-primary/20'
                      : 'bg-surface-container-low border-outline-variant/40 hover:border-outline-variant'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
                      {getSourceBadge(result.source_type)}
                      <span className="font-mono text-sm font-bold text-on-surface truncate">
                        {result.file_path}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-surface border border-outline-variant/40 text-xs font-mono text-on-surface-variant font-medium">
                        L{result.start_line}-L{result.end_line}
                      </span>
                      {result.symbol_name && (
                        <span className="px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-xs font-mono font-medium truncate">
                          {result.symbol_type ? `${result.symbol_type}: ` : ''}{result.symbol_name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getScorePill(result.blended_score)}
                      <button
                        type="button"
                        onClick={(e) => handleCopy(result.content, chunkId, e)}
                        className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                        title="Copy chunk content"
                      >
                        {copiedId === chunkId ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <div className="p-1 text-on-surface-variant">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className={`p-3.5 bg-surface rounded-2xl border border-outline-variant/30 text-xs md:text-sm font-mono text-on-surface-variant overflow-x-auto whitespace-pre-wrap leading-relaxed transition-all ${
                      isExpanded ? 'max-h-none text-on-surface' : 'max-h-28'
                    }`}>
                      {result.content}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs font-mono text-on-surface-variant/80 pt-2 border-t border-outline-variant/20">
                    <div className="flex items-center gap-4">
                      <span>Semantic: <strong className="text-primary">{result.semantic_score.toFixed(3)}</strong></span>
                      <span>Keyword: <strong className="text-on-surface">{result.keyword_score.toFixed(3)}</strong></span>
                    </div>

                    {result.why_matched && (
                      <span className="text-[11px] text-on-surface-variant/70 truncate max-w-sm">
                        {result.why_matched}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <InlineSourceManager
        isOpen={isSourceManagerOpen}
        onClose={() => {
          setIsSourceManagerOpen(false);
          fetchStatus();
        }}
        onSourcesUpdated={fetchStatus}
      />
    </div>
  );
}
