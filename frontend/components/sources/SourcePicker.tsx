'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderGit2, 
  FileText, 
  FolderOpen, 
  ChevronDown, 
  ChevronRight, 
  Check, 
  RefreshCw, 
  SlidersHorizontal,
  Layers,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { connectorApi } from '@/lib/api/connector';
import { ScanFolderResponse, SourceStatusItem } from '@/lib/api/types';

interface SourcePickerProps {
  sourceType: 'codebase' | 'notes';
  title: string;
  description: string;
  status: SourceStatusItem;
  onIndexed?: () => void;
  accentColor?: string;
}

export function SourcePicker({
  sourceType,
  title,
  description,
  status,
  onIndexed,
  accentColor = 'primary'
}: SourcePickerProps) {
  const isCode = sourceType === 'codebase';
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedPath, setSelectedPath] = useState<string>(status.path || '');
  const [scanResult, setScanResult] = useState<ScanFolderResponse | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isIndexing, setIsIndexing] = useState<boolean>(false);
  const [indexingStatus, setIndexingStatus] = useState<string>('');
  const [chunksCreated, setChunksCreated] = useState<number>(0);
  const [activeExcludes, setActiveExcludes] = useState<string[]>([]);
  const [isExcludesOpen, setIsExcludesOpen] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (status.path && !selectedPath) {
      setSelectedPath(status.path);
    }
  }, [status.path, selectedPath]);

  const triggerScan = async (path: string, excludesToUse?: string[]) => {
    if (!path.trim()) return;
    setIsScanning(true);
    setErrorMessage(null);
    try {
      const res = await connectorApi.scanFolder(path.trim(), sourceType, excludesToUse || activeExcludes);
      setScanResult(res);
      if (res.path && res.path !== path) {
        setSelectedPath(res.path);
      }
      if (activeExcludes.length === 0 && res.default_excludes) {
        setActiveExcludes(res.default_excludes);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Folder scan failed');
      setScanResult(null);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (selectedPath) {
      triggerScan(selectedPath, activeExcludes);
    }
  }, [selectedPath]);

  const handlePickDirectory = async () => {
    setErrorMessage(null);
    try {
      const picked = await connectorApi.pickFolder();
      if (picked && picked.path && picked.path.trim().length > 0) {
        setSelectedPath(picked.path.trim());
        return;
      }
    } catch {
    }
    if (typeof window !== 'undefined' && 'showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        if (dirHandle && dirHandle.name) {
          const detectedPath = dirHandle.name;
          setSelectedPath(detectedPath);
          return;
        }
      } catch (e: any) {
        if (e.name === 'AbortError') return;
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleNativeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const firstFile = files[0];
      const relPath = (firstFile as any).webkitRelativePath || firstFile.name;
      const rootFolder = relPath.split('/')[0] || relPath.split('\\')[0];
      setSelectedPath(rootFolder);
    }
  };

  const toggleExclude = (subfolder: string) => {
    const next = activeExcludes.includes(subfolder)
      ? activeExcludes.filter((x) => x !== subfolder)
      : [...activeExcludes, subfolder];
    setActiveExcludes(next);
    if (selectedPath) {
      triggerScan(selectedPath, next);
    }
  };

  const handleStartIndexing = async () => {
    if (!selectedPath.trim()) return;
    setIsIndexing(true);
    setErrorMessage(null);
    setIndexingStatus('Starting pipeline...');
    setChunksCreated(0);

    try {
      const res = await connectorApi.ingestScoped({
        path: selectedPath.trim(),
        source_type: sourceType,
        excludes: activeExcludes,
        included_extensions: []
      });

      const unsub = connectorApi.subscribeIngestProgress(res.job_id, (p) => {
        if (p.chunks_created) setChunksCreated(p.chunks_created);
        if (p.status) setIndexingStatus(p.status);
        if (p.status === 'Complete' || p.status === 'completed') {
          setIsIndexing(false);
          unsub();
          if (onIndexed) onIndexed();
        }
      });
    } catch (err) {
      setIsIndexing(false);
      setErrorMessage(err instanceof Error ? err.message : 'Indexing failed');
    }
  };

  const isIndexed = status.status === 'indexed';

  return (
    <div className="flex flex-col bg-surface-container border border-outline-variant rounded-2xl p-5 md:p-6 transition-all shadow-sm hover:shadow-md space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-3 rounded-xl ${
              isCode
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            }`}
          >
            {isCode ? <FolderGit2 className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="font-display font-semibold text-titleMedium text-on-surface">
              {title}
            </h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div
            className={`px-3 py-1 rounded-full text-xs font-mono font-medium border flex items-center gap-1.5 ${
              isIndexed
                ? 'bg-success/10 text-success border-success/30'
                : isIndexing
                ? 'bg-primary/10 text-primary border-primary/30 animate-pulse'
                : 'bg-surface-container-high text-on-surface-variant border-outline-variant/50'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isIndexed
                  ? 'bg-success shadow-[0_0_6px_#4ade80]'
                  : isIndexing
                  ? 'bg-primary shadow-[0_0_6px_#3b82f6]'
                  : 'bg-outline-variant'
              }`}
            />
            <span>
              {isIndexing
                ? 'Indexing...'
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

      <div className="space-y-2">
        <label className="text-xs font-medium text-on-surface-variant flex items-center justify-between">
          <span>Folder Location</span>
          {selectedPath && (
            <button
              type="button"
              onClick={() => triggerScan(selectedPath, activeExcludes)}
              className="text-[11px] text-primary hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isScanning ? 'animate-spin' : ''}`} />
              <span>Rescan</span>
            </button>
          )}
        </label>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            placeholder={
              isCode
                ? 'Select or enter codebase directory path...'
                : 'Select or enter notes directory path (.md, .txt, .pdf)...'
            }
            className="flex-1 bg-surface text-on-surface text-xs font-mono px-3.5 py-2.5 rounded-xl border border-outline-variant outline-none focus:border-primary transition-colors"
          />

          <button
            type="button"
            onClick={handlePickDirectory}
            className="px-3.5 py-2.5 bg-surface-container-high text-on-surface hover:text-primary rounded-xl border border-outline-variant text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-sm hover:border-primary/40"
          >
            <FolderOpen className="w-4 h-4 text-primary" />
            <span>Browse</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            {...({ webkitdirectory: '', directory: '' } as any)}
            multiple
            onChange={handleNativeInput}
            className="hidden"
          />
        </div>
      </div>

      {isScanning ? (
        <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-2.5 animate-pulse">
          <div className="h-3 w-40 bg-surface-container-highest rounded-full" />
          <div className="flex gap-2">
            <div className="h-6 w-24 bg-surface-container-highest rounded-lg" />
            <div className="h-6 w-28 bg-surface-container-highest rounded-lg" />
            <div className="h-6 w-20 bg-surface-container-highest rounded-lg" />
          </div>
        </div>
      ) : scanResult ? (
        <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/40 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-on-surface flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Detected {scanResult.file_count} candidate files</span>
            </span>
            <span className="text-on-surface-variant font-mono text-[11px]">
              Est. ~{scanResult.estimated_chunks} chunks
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(scanResult.breakdown).map(([category, count]) => (
              <span
                key={category}
                className="px-2.5 py-1 rounded-lg bg-surface text-on-surface border border-outline-variant/40 text-[11px] font-mono"
              >
                {category}: <strong className="text-primary">{count}</strong>
              </span>
            ))}
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setIsExcludesOpen(!isExcludesOpen)}
              className="text-xs font-medium text-on-surface-variant hover:text-on-surface flex items-center gap-1.5 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
              <span>Smart Exclude Filters ({activeExcludes.length} active)</span>
              {isExcludesOpen ? (
                <ChevronDown className="w-3.5 h-3.5 ml-auto" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              )}
            </button>

            {isExcludesOpen && (
              <div className="mt-2.5 pt-2.5 border-t border-outline-variant/30 space-y-2">
                <p className="text-[11px] text-on-surface-variant leading-normal">
                  Checked subfolders and patterns are automatically skipped during indexing:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(
                    new Set([...scanResult.default_excludes, ...scanResult.detected_subfolders])
                  ).map((folder) => {
                    const isExcluded = activeExcludes.includes(folder);
                    return (
                      <button
                        key={folder}
                        type="button"
                        onClick={() => toggleExclude(folder)}
                        className={`px-2 py-1 rounded-md text-[11px] font-mono border transition-all flex items-center gap-1 ${
                          isExcluded
                            ? 'bg-surface-container-highest text-on-surface-variant border-outline-variant line-through opacity-75'
                            : 'bg-primary/10 text-primary border-primary/30 font-semibold'
                        }`}
                      >
                        {!isExcluded && <Check className="w-3 h-3 text-primary" />}
                        <span>{folder}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {isIndexing && (
        <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-primary flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>{indexingStatus || 'Processing files...'}</span>
            </span>
            <span className="font-mono text-primary text-[11px]">
              {chunksCreated} chunks indexed
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-pulse w-full" />
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
          Indexed through Moss local-first engine with zero leak
        </span>

        <button
          type="button"
          onClick={handleStartIndexing}
          disabled={isIndexing || !selectedPath.trim() || isScanning}
          className={`px-5 py-2.5 rounded-xl text-xs font-medium transition-all shadow-sm flex items-center gap-2 ${
            isIndexed
              ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest hover:text-primary border border-outline-variant'
              : 'bg-primary text-on-primary hover:bg-primary/90'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isIndexing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Indexing...</span>
            </>
          ) : isIndexed ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-index {isCode ? 'Codebase' : 'Notes'}</span>
            </>
          ) : (
            <>
              <Layers className="w-3.5 h-3.5" />
              <span>Index {isCode ? 'Codebase' : 'Notes'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}