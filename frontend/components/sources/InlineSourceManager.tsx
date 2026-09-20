'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FolderGit2, 
  FileText, 
  Globe, 
  Database, 
  X, 
  FolderOpen, 
  RefreshCw, 
  Check, 
  Layers, 
  AlertCircle,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Trash2
} from 'lucide-react';
import { connectorApi } from '@/lib/api/connector';
import { 
  BrowserTab, 
  ScanFolderResponse, 
  SourcesStatusResponse, 
  SourceStatusItem 
} from '@/lib/api/types';
import { motion, AnimatePresence } from 'framer-motion';

interface InlineSourceManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSourcesUpdated?: () => void;
  activeSourceTab?: 'codebase' | 'notes' | 'browser_tab';
}

export function InlineSourceManager({
  isOpen,
  onClose,
  onSourcesUpdated,
  activeSourceTab = 'codebase'
}: InlineSourceManagerProps) {
  const [activeTab, setActiveTab] = useState<'codebase' | 'notes' | 'browser_tab'>(activeSourceTab);

  const [sourcesStatus, setSourcesStatus] = useState<SourcesStatusResponse | null>(null);

  const [codePath, setCodePath] = useState('');
  const [codeScan, setCodeScan] = useState<ScanFolderResponse | null>(null);
  const [isCodeScanning, setIsCodeScanning] = useState(false);
  const [isCodeIndexing, setIsCodeIndexing] = useState(false);
  const [codeIndexStatus, setCodeIndexStatus] = useState('');

  const [notesPath, setNotesPath] = useState('');
  const [notesScan, setNotesScan] = useState<ScanFolderResponse | null>(null);
  const [isNotesScanning, setIsNotesScanning] = useState(false);
  const [isNotesIndexing, setIsNotesIndexing] = useState(false);
  const [notesIndexStatus, setNotesIndexStatus] = useState('');
  const notesFileInputRef = useRef<HTMLInputElement | null>(null);

  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [selectedTabIds, setSelectedTabIds] = useState<string[]>([]);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const [isIndexingTabs, setIsIndexingTabs] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadSourcesStatus = async () => {
    try {
      const data = await connectorApi.getSourcesStatus();
      setSourcesStatus(data);
      if (data.codebase.path && !codePath) setCodePath(data.codebase.path);
      if (data.notes.path && !notesPath) setNotesPath(data.notes.path);
    } catch {
    }
  };

  const loadBrowserTabs = async () => {
    setIsLoadingTabs(true);
    setErrorMsg(null);
    try {
      const liveTabs = await connectorApi.getBrowserTabs();
      setTabs(liveTabs || []);
      setSelectedTabIds((liveTabs || []).map(t => t.id));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to fetch live tabs');
    } finally {
      setIsLoadingTabs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeSourceTab) {
        setActiveTab(activeSourceTab);
      }
      loadSourcesStatus();
      loadBrowserTabs();
    }
  }, [isOpen, activeSourceTab]);

  const scanCodebase = async (path: string) => {
    if (!path.trim()) return;
    setIsCodeScanning(true);
    setErrorMsg(null);
    try {
      const res = await connectorApi.scanFolder(path.trim(), 'codebase');
      setCodeScan(res);
      if (res.path && res.path !== path) {
        setCodePath(res.path);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsCodeScanning(false);
    }
  };

  const scanNotes = async (path: string) => {
    if (!path.trim()) return;
    setIsNotesScanning(true);
    setErrorMsg(null);
    try {
      const res = await connectorApi.scanFolder(path.trim(), 'notes');
      setNotesScan(res);
      if (res.path && res.path !== path) {
        setNotesPath(res.path);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setIsNotesScanning(false);
    }
  };

  const handlePickCodebase = async () => {
    setErrorMsg(null);
    try {
      const picked = await connectorApi.pickFolder();
      if (picked && picked.path && picked.path.trim().length > 0) {
        const p = picked.path.trim();
        setCodePath(p);
        scanCodebase(p);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Folder picker failed');
    }
  };

  const handlePickNotes = async () => {
    setErrorMsg(null);
    try {
      const picked = await connectorApi.pickFile();
      if (picked && picked.path && picked.path.trim().length > 0) {
        const p = picked.path.trim();
        setNotesPath(p);
        scanNotes(p);
        return;
      }
    } catch {
    }
    notesFileInputRef.current?.click();
  };

  const handleNotesFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsNotesIndexing(true);
    setNotesIndexStatus(`Uploading and indexing ${file.name}...`);
    setErrorMsg(null);
    try {
      const res = await connectorApi.uploadDocument(file);
      setNotesIndexStatus(`Indexed ${res.filename} (${res.chunks_created} chunks)`);
      setNotesPath(file.name);
      await loadSourcesStatus();
      if (onSourcesUpdated) onSourcesUpdated();
      setTimeout(() => {
        setIsNotesIndexing(false);
      }, 1500);
    } catch (err) {
      setIsNotesIndexing(false);
      setErrorMsg(err instanceof Error ? err.message : 'Failed to upload document');
    }
  };

  const handleIndexCodebase = async () => {
    if (!codePath.trim()) return;
    setIsCodeIndexing(true);
    setCodeIndexStatus('Starting indexing pipeline...');
    setErrorMsg(null);
    try {
      const res = await connectorApi.ingestScoped({
        path: codePath.trim(),
        source_type: 'codebase'
      });
      const unsub = connectorApi.subscribeIngestProgress(res.job_id, (p) => {
        if (p.status) setCodeIndexStatus(p.status);
        if (p.status === 'Complete' || p.status === 'completed') {
          setIsCodeIndexing(false);
          unsub();
          loadSourcesStatus();
          if (onSourcesUpdated) onSourcesUpdated();
        }
      });
    } catch (err) {
      setIsCodeIndexing(false);
      setErrorMsg(err instanceof Error ? err.message : 'Indexing codebase failed');
    }
  };

  const handleIndexNotes = async () => {
    if (!notesPath.trim()) return;
    setIsNotesIndexing(true);
    setNotesIndexStatus('Starting notes indexing...');
    setErrorMsg(null);
    try {
      const res = await connectorApi.ingestScoped({
        path: notesPath.trim(),
        source_type: 'notes'
      });
      const unsub = connectorApi.subscribeIngestProgress(res.job_id, (p) => {
        if (p.status) setNotesIndexStatus(p.status);
        if (p.status === 'Complete' || p.status === 'completed') {
          setIsNotesIndexing(false);
          unsub();
          loadSourcesStatus();
          if (onSourcesUpdated) onSourcesUpdated();
        }
      });
    } catch (err) {
      setIsNotesIndexing(false);
      setErrorMsg(err instanceof Error ? err.message : 'Indexing notes failed');
    }
  };

  const handleIndexTabs = async () => {
    if (tabs.length === 0) return;
    setIsIndexingTabs(true);
    setErrorMsg(null);
    try {
      await connectorApi.ingestAllTabs(selectedTabIds);
      await loadSourcesStatus();
      if (onSourcesUpdated) onSourcesUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Indexing tabs failed');
    } finally {
      setIsIndexingTabs(false);
    }
  };

  const toggleTabSelection = (tabId: string) => {
    setSelectedTabIds(prev => 
      prev.includes(tabId) ? prev.filter(id => id !== tabId) : [...prev, tabId]
    );
  };

  const handleClearSource = async (sourceType: 'codebase' | 'notes' | 'browser_tab' | 'all') => {
    try {
      await connectorApi.clearSource(sourceType);
      await loadSourcesStatus();
      if (sourceType === 'codebase' || sourceType === 'all') setCodeScan(null);
      if (sourceType === 'notes' || sourceType === 'all') setNotesScan(null);
      if (onSourcesUpdated) onSourcesUpdated();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to clear source index');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-2xl bg-surface-container border border-outline-variant/60 rounded-3xl shadow-elevation-5 overflow-hidden flex flex-col max-h-[85vh] z-10"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 bg-surface">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Database className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-on-surface">
                    Manage Data Sources
                  </h2>
                  <p className="text-xs text-on-surface-variant font-sans">
                    Indexed into Moss in-memory retrieval engine
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 pt-4 border-b border-outline-variant/30 bg-surface/50">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('codebase')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'codebase'
                      ? 'bg-primary text-on-primary shadow-elevation-1'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <FolderGit2 className="w-4 h-4" />
                  <span>Codebase</span>
                  {sourcesStatus?.codebase.status === 'indexed' && (
                    <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
                      {sourcesStatus.codebase.chunks}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'notes'
                      ? 'bg-primary text-on-primary shadow-elevation-1'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Notes & Docs</span>
                  {sourcesStatus?.notes.status === 'indexed' && (
                    <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
                      {sourcesStatus.notes.chunks}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('browser_tab')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === 'browser_tab'
                      ? 'bg-primary text-on-primary shadow-elevation-1'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Browser Tabs</span>
                  {tabs.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-500 text-[10px] font-mono font-bold">
                      {tabs.length} live
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {errorMsg && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl text-xs font-mono flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {activeTab === 'codebase' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface flex items-center justify-between">
                      <span>Codebase Directory</span>
                      {sourcesStatus?.codebase.status === 'indexed' && (
                        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          Indexed ({sourcesStatus.codebase.chunks} chunks)
                        </span>
                      )}
                    </label>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={codePath}
                        onChange={(e) => setCodePath(e.target.value)}
                        placeholder="Path to repository folder..."
                        className="flex-1 bg-surface text-on-surface text-xs font-mono px-3.5 py-2.5 rounded-xl border border-outline-variant/60 outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={handlePickCodebase}
                        className="px-3.5 py-2.5 bg-surface hover:bg-surface-container-high rounded-xl border border-outline-variant/60 text-xs font-semibold text-primary flex items-center gap-1.5 shadow-elevation-1"
                      >
                        <FolderOpen className="w-4 h-4 text-primary" />
                        <span>Browse</span>
                      </button>
                    </div>
                  </div>

                  {isCodeScanning ? (
                    <div className="p-4 bg-surface rounded-2xl border border-outline-variant/40 animate-pulse space-y-2">
                      <div className="h-3 w-40 bg-surface-container-high rounded" />
                      <div className="h-4 w-28 bg-surface-container-high rounded" />
                    </div>
                  ) : codeScan ? (
                    <div className="p-4 bg-surface rounded-2xl border border-outline-variant/40 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-on-surface flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-primary" />
                          <span>Detected {codeScan.file_count} code files</span>
                        </span>
                        <span className="text-on-surface-variant font-semibold">
                          Est. ~{codeScan.estimated_chunks} chunks
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(codeScan.breakdown).map(([lang, count]) => (
                          <span key={lang} className="px-2 py-0.5 rounded-lg bg-surface-container-low text-[11px] font-mono text-on-surface border border-outline-variant/40">
                            {lang}: <strong className="text-primary">{count}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-on-surface-variant font-sans">
                        Tree-sitter AST parsing with zero cloud leak
                      </span>
                      {sourcesStatus?.codebase.status === 'indexed' && (
                        <button
                          type="button"
                          onClick={() => handleClearSource('codebase')}
                          className="text-xs font-mono text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1"
                          title="Flush codebase index chunks"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear Codebase Index</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleIndexCodebase}
                      disabled={isCodeIndexing || !codePath.trim() || isCodeScanning}
                      className="px-5 py-2.5 bg-primary text-on-primary rounded-xl text-xs font-semibold hover:bg-primary/90 transition-all disabled:opacity-40 shadow-elevation-1 flex items-center gap-2"
                    >
                      {isCodeIndexing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{codeIndexStatus || 'Indexing...'}</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-3.5 h-3.5" />
                          <span>Index Codebase</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={notesFileInputRef}
                    onChange={handleNotesFileUpload}
                    className="hidden"
                    accept=".pdf,.docx,.doc,.txt,.md,.markdown,.xlsx,.csv"
                  />

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-on-surface flex items-center justify-between">
                      <span>Choose Document File</span>
                      {sourcesStatus?.notes.status === 'indexed' && (
                        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          Indexed ({sourcesStatus.notes.chunks} chunks)
                        </span>
                      )}
                    </label>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={notesPath}
                        onChange={(e) => {
                          setNotesPath(e.target.value);
                          if (e.target.value.trim()) scanNotes(e.target.value.trim());
                        }}
                        placeholder="Select or paste document file path (.pdf, .docx, .txt, .md, .xlsx)..."
                        className="flex-1 bg-surface text-on-surface text-xs font-mono px-3.5 py-2.5 rounded-xl border border-outline-variant/60 outline-none focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={handlePickNotes}
                        className="px-3.5 py-2.5 bg-surface hover:bg-surface-container-high rounded-xl border border-outline-variant/60 text-xs font-semibold text-amber-500 flex items-center gap-1.5 shadow-elevation-1"
                        title="Choose document file via file dialog"
                      >
                        <FileText className="w-4 h-4 text-amber-500" />
                        <span>Choose File</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => notesFileInputRef.current?.click()}
                        className="px-3.5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl border border-amber-500/30 text-xs font-semibold text-amber-500 flex items-center gap-1.5 shadow-elevation-1"
                        title="Upload file from disk"
                      >
                        <FolderOpen className="w-4 h-4 text-amber-500" />
                        <span>Upload</span>
                      </button>
                    </div>
                  </div>

                  {isNotesScanning ? (
                    <div className="p-4 bg-surface rounded-2xl border border-outline-variant/40 animate-pulse space-y-2">
                      <div className="h-3 w-40 bg-surface-container-high rounded" />
                      <div className="h-4 w-28 bg-surface-container-high rounded" />
                    </div>
                  ) : notesScan ? (
                    <div className="p-4 bg-surface rounded-2xl border border-outline-variant/40 space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-on-surface flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Selected {notesScan.file_count} document(s)</span>
                        </span>
                        <span className="text-on-surface-variant font-semibold">
                          Est. ~{notesScan.estimated_chunks} chunks
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {Object.entries(notesScan.breakdown).map(([fmt, count]) => (
                          <span key={fmt} className="px-2 py-0.5 rounded-lg bg-surface-container-low text-[11px] font-mono text-on-surface border border-outline-variant/40">
                            {fmt}: <strong className="text-amber-500">{count}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-on-surface-variant font-sans">
                        Supports Word (.docx), PDF, Markdown (.md), Text (.txt), and Excel (.xlsx)
                      </span>
                      {sourcesStatus?.notes.status === 'indexed' && (
                        <button
                          type="button"
                          onClick={() => handleClearSource('notes')}
                          className="text-xs font-mono text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1"
                          title="Flush notes index chunks"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear Notes Index</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleIndexNotes}
                      disabled={isNotesIndexing || !notesPath.trim() || isNotesScanning}
                      className="px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-semibold hover:bg-amber-600 transition-all disabled:opacity-40 shadow-elevation-1 flex items-center gap-2"
                    >
                      {isNotesIndexing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>{notesIndexStatus || 'Indexing file...'}</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5" />
                          <span>Index Document File</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'browser_tab' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-semibold text-on-surface flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Live Open Tabs ({tabs.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={loadBrowserTabs}
                      disabled={isLoadingTabs}
                      className="text-primary hover:underline flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTabs ? 'animate-spin' : ''}`} />
                      <span>Scan Live Browsers</span>
                    </button>
                  </div>

                  {isLoadingTabs ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="p-3 bg-surface rounded-xl border border-outline-variant/30 animate-pulse h-12" />
                      ))}
                    </div>
                  ) : tabs.length === 0 ? (
                    <div className="p-6 bg-surface rounded-2xl border border-outline-variant/40 text-center text-xs font-mono text-on-surface-variant space-y-1">
                      <p>No running browser windows with active tabs detected.</p>
                      <p className="text-[11px] text-on-surface-variant/70">
                        Open tabs in Brave, Chrome, Opera, or Edge and click Scan Live Browsers.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {tabs.map((tab) => {
                        const isSelected = selectedTabIds.includes(tab.id);
                        return (
                          <div
                            key={tab.id}
                            onClick={() => toggleTabSelection(tab.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-surface border-primary/50 shadow-sm'
                                : 'bg-surface/50 border-outline-variant/30 opacity-70'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                                isSelected ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant'
                              }`}>
                                {isSelected && <Check className="w-3 h-3" />}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {tab.browser && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      {tab.browser}
                                    </span>
                                  )}
                                  <span className="text-xs font-semibold text-on-surface truncate">
                                    {tab.title}
                                  </span>
                                </div>
                                <span className="text-[10px] text-on-surface-variant font-mono truncate block">
                                  {tab.url}
                                </span>
                              </div>
                            </div>

                            <a
                              href={tab.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-on-surface-variant hover:text-primary rounded-lg"
                              title="Open tab URL"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-on-surface-variant font-sans">
                        {selectedTabIds.length} of {tabs.length} tabs selected for retrieval
                      </span>
                      {sourcesStatus?.browser_tab.status === 'indexed' && (
                        <button
                          type="button"
                          onClick={() => handleClearSource('browser_tab')}
                          className="text-xs font-mono text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1"
                          title="Flush browser tab index chunks"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear Tabs Index</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleIndexTabs}
                      disabled={isIndexingTabs || selectedTabIds.length === 0}
                      className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-all disabled:opacity-40 shadow-elevation-1 flex items-center gap-2"
                    >
                      {isIndexingTabs ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Indexing tabs...</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          <span>Index Tabs into Moss</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-outline-variant/30 bg-surface flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleClearSource('all')}
                className="text-xs font-mono text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1.5"
                title="Flush all cached chunks and start fresh"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset / Clear All Indexes</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-surface-container hover:bg-surface-container-high rounded-xl text-xs font-semibold text-on-surface transition-colors shadow-elevation-1"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
