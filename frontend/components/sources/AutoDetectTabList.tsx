'use client';

import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  ExternalLink, 
  RefreshCw, 
  Layers, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { connectorApi } from '@/lib/api/connector';
import { BrowserTab, SourceStatusItem } from '@/lib/api/types';

interface AutoDetectTabListProps {
  status: SourceStatusItem;
  onIndexed?: () => void;
}

export function AutoDetectTabList({ status, onIndexed }: AutoDetectTabListProps) {
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [indexingProgress, setIndexingProgress] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchTabs = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await connectorApi.getBrowserTabs();
      setTabs(data || []);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to fetch browser tabs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTabs();
  }, []);

  const handleIndexAllTabs = async () => {
    if (tabs.length === 0) return;
    setIsIndexing(true);
    setErrorMessage(null);
    setIndexingProgress(10);

    const timer = setInterval(() => {
      setIndexingProgress((prev) => (prev < 90 ? prev + 25 : prev));
    }, 400);

    try {
      await connectorApi.ingestAllTabs();
      setIndexingProgress(100);
      setTimeout(() => {
        setIsIndexing(false);
        setIndexingProgress(0);
        if (onIndexed) onIndexed();
      }, 500);
    } catch (err) {
      setIsIndexing(false);
      setIndexingProgress(0);
      setErrorMessage(err instanceof Error ? err.message : 'Indexing tabs failed');
    } finally {
      clearInterval(timer);
    }
  };

  const isIndexed = status.status === 'indexed';

  return (
    <div className="flex flex-col bg-surface-container border border-outline-variant rounded-2xl p-5 md:p-6 transition-all shadow-sm hover:shadow-md space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-titleMedium text-on-surface">
              Browser Tabs & Technical Web Pages
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Auto-detects open tabs and documentation pages to index clean text with zero cookies or session leaks
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div
            className={`px-3 py-1 rounded-full text-xs font-mono font-medium border flex items-center gap-1.5 ${
              isIndexed
                ? 'bg-success/10 text-success border-success/30'
                : isIndexing
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 animate-pulse'
                : 'bg-surface-container-high text-on-surface-variant border-outline-variant/50'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isIndexed
                  ? 'bg-success shadow-[0_0_6px_#4ade80]'
                  : isIndexing
                  ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                  : 'bg-outline-variant'
              }`}
            />
            <span>
              {isIndexing
                ? 'Indexing tabs...'
                : isIndexed
                ? `Indexed (${status.chunks} chunks)`
                : 'Not indexed'}
            </span>
          </div>
          {status.last_updated && (
            <span className="text-[10px] text-on-surface-variant font-mono">
              {status.last_updated}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-on-surface flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            <span>Active Tabs Detected ({tabs.length})</span>
          </span>
          <button
            type="button"
            onClick={fetchTabs}
            disabled={isLoading}
            className="text-[11px] text-primary hover:underline flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Tabs</span>
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 animate-pulse flex items-center gap-3"
              >
                <div className="w-5 h-5 rounded-full bg-surface-container-highest" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-3/4 bg-surface-container-highest rounded" />
                  <div className="h-2.5 w-1/2 bg-surface-container-highest rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : tabs.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className="p-3 bg-surface-container-low hover:bg-surface-container rounded-xl border border-outline-variant/30 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-lg bg-surface flex items-center justify-center flex-shrink-0 border border-outline-variant/40">
                    <Globe className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {tab.browser && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex-shrink-0">
                          {tab.browser}
                        </span>
                      )}
                      <h4 className="text-xs font-medium text-on-surface truncate">
                        {tab.title}
                      </h4>
                    </div>
                    <p className="text-[11px] text-on-surface-variant font-mono truncate">
                      {tab.url}
                    </p>
                  </div>
                </div>

                <a
                  href={tab.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-on-surface-variant hover:text-primary p-1 rounded-lg transition-colors flex-shrink-0"
                  title="Open link in browser"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-surface-container-low rounded-xl border border-outline-variant/30 text-center text-xs text-on-surface-variant">
            No active browser tabs detected. Click Refresh Tabs to re-scan.
          </div>
        )}
      </div>

      {isIndexing && (
        <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Fetching and chunking web content...</span>
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px]">
              {indexingProgress}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${indexingProgress}%` }}
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="pt-1 flex items-center justify-between gap-3">
        <span className="text-[11px] text-on-surface-variant">
          Extracts and indexes all {tabs.length} tabs into local Moss index
        </span>

        <button
          type="button"
          onClick={handleIndexAllTabs}
          disabled={isIndexing || tabs.length === 0 || isLoading}
          className={`px-5 py-2.5 rounded-xl text-xs font-medium transition-all shadow-sm flex items-center gap-2 ${
            isIndexed
              ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest hover:text-emerald-500 border border-outline-variant'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isIndexing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Indexing Tabs...</span>
            </>
          ) : isIndexed ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-index Tabs</span>
            </>
          ) : (
            <>
              <Layers className="w-3.5 h-3.5" />
              <span>Index Tabs</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}