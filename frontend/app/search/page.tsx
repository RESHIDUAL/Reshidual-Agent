'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Wrench, 
  RotateCcw, 
  Cpu, 
  CheckCircle2, 
  Globe, 
  FileText, 
  Terminal, 
  FolderGit2, 
  AlertTriangle, 
  Maximize2, 
  Minimize2, 
  Search, 
  Bot,
  Plus,
  Zap,
  FolderOpen,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { clsx } from 'clsx';
import { connectorApi } from '@/lib/api/connector';
import { SearchResult, ChatMessage, FileAction, SourcesStatusResponse } from '@/lib/api/types';
import { VoiceCapture } from '@/components/search/VoiceCapture';
import { SemanticSearchRaw } from '@/components/search/SemanticSearchRaw';
import { InlineSourceManager } from '@/components/sources/InlineSourceManager';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

type SourceType = 'all' | 'codebase' | 'notes' | 'browser_tab';
type AppMode = 'agent' | 'search';

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  results?: SearchResult[];
  fileAction?: FileAction | null;
  timing?: { total_ms: number; semantic_ms: number; keyword_ms: number };
  model?: string;
  timestamp: string;
  confidence_level?: 'high' | 'low';
  top_score?: number;
}

const SUGGESTED_PROMPTS: Record<SourceType, string[]> = {
  all: [
    'Which framework are we using for indexing in this project?',
    'Explain how MossEngine performs zero-leak retrieval',
    'Summarize the active browser tabs currently detected',
    'Show how document_parser.py extracts text from Excel and PDF'
  ],
  codebase: [
    'Where is MossEngine initialized in the backend?',
    'Explain how tree_sitter_parser.py chunks source code',
    'Show the database schema for chunks and audit log',
    'How does local_runner execute patches safely?'
  ],
  notes: [
    'Summarize our project requirements and architecture',
    'What are the mandatory stack requirements in PRD.md?',
    'Show text extracted from documentation notes',
    'List all file formats supported by DocumentParser'
  ],
  browser_tab: [
    'What tabs are currently open in the browser?',
    'Show the exact URL for the Moss Developer Portal tab',
    'Summarize technical discussions from the Claude tabs',
    'Index all active tabs into the Moss retrieval engine'
  ]
};

const SOURCE_TABS: { id: SourceType; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All Sources', icon: Layers },
  { id: 'codebase', label: 'Codebase', icon: FolderGit2 },
  { id: 'notes', label: 'Notes', icon: FileText },
  { id: 'browser_tab', label: 'Browser Tabs', icon: Globe }
];

function SearchPageContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get('mode');
  const [activeMode, setActiveMode] = useState<AppMode>(modeParam === 'search' ? 'search' : 'agent');

  useEffect(() => {
    if (modeParam === 'search') {
      setActiveMode('search');
    } else if (modeParam === 'agent') {
      setActiveMode('agent');
    }
  }, [modeParam]);

  const handleModeSwitch = (mode: AppMode) => {
    setActiveMode(mode);
    const url = `/search?mode=${mode}`;
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', url);
    }
  };

  const [threads, setThreads] = useState<Record<SourceType, AgentMessage[]>>({
    all: [],
    codebase: [],
    notes: [],
    browser_tab: []
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sourceType, setSourceType] = useState<SourceType>('all');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});
  const [expandedChunks, setExpandedChunks] = useState<Record<string, boolean>>({});
  const [baseSessionId] = useState(() => `session_${Date.now()}`);
  const [isSourceManagerOpen, setIsSourceManagerOpen] = useState(false);
  const [activeSourceManagerTab, setActiveSourceManagerTab] = useState<'codebase' | 'notes' | 'browser_tab'>('codebase');
  const [sourcesStatus, setSourcesStatus] = useState<SourcesStatusResponse | null>(null);

  const openSourceTab = (tab: 'codebase' | 'notes' | 'browser_tab') => {
    setActiveSourceManagerTab(tab);
    setIsSourceManagerOpen(true);
  };

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await connectorApi.getSourcesStatus();
      setSourcesStatus(data);
    } catch {
    }
  };

  useEffect(() => {
    fetchStatus();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('selected_ollama_model');
      if (stored) setSelectedModel(stored);

      const handler = (e: Event) => {
        const customEvt = e as CustomEvent<string>;
        if (customEvt.detail) setSelectedModel(customEvt.detail);
      };
      window.addEventListener('ollama-model-changed', handler);
      return () => window.removeEventListener('ollama-model-changed', handler);
    }
  }, []);

  const [isQuickReindexing, setIsQuickReindexing] = useState(false);

  const handleQuickClear = async (type: string) => {
    try {
      await connectorApi.clearSource(type);
      await fetchStatus();
    } catch (err) {
      console.error('Failed to clear source', err);
    }
  };

  const handleQuickReindexCodebase = async () => {
    const p = sourcesStatus?.codebase.path;
    if (!p) {
      openSourceTab('codebase');
      return;
    }
    setIsQuickReindexing(true);
    try {
      await connectorApi.clearSource('codebase');
      const res = await connectorApi.ingestScoped({ path: p, source_type: 'codebase' });
      const unsub = connectorApi.subscribeIngestProgress(res.job_id, (prog) => {
        if (prog.status === 'Complete' || prog.status === 'completed') {
          setIsQuickReindexing(false);
          unsub();
          fetchStatus();
        }
      });
    } catch (err) {
      setIsQuickReindexing(false);
      console.error('Reindex error', err);
    }
  };

  const handleQuickReindexNotes = async () => {
    const p = sourcesStatus?.notes.path;
    if (!p) {
      openSourceTab('notes');
      return;
    }
    setIsQuickReindexing(true);
    try {
      await connectorApi.clearSource('notes');
      if (p.endsWith('.pdf') || p.endsWith('.docx') || p.endsWith('.doc')) {
        await connectorApi.ingestFile(p);
        setIsQuickReindexing(false);
        await fetchStatus();
        return;
      }
      const res = await connectorApi.ingestScoped({ path: p, source_type: 'notes' });
      const unsub = connectorApi.subscribeIngestProgress(res.job_id, (prog) => {
        if (prog.status === 'Complete' || prog.status === 'completed') {
          setIsQuickReindexing(false);
          unsub();
          fetchStatus();
        }
      });
    } catch (err) {
      setIsQuickReindexing(false);
      console.error('Reindex error', err);
    }
  };

  const handleQuickReindexTabs = async () => {
    setIsQuickReindexing(true);
    try {
      const liveTabs = await connectorApi.getBrowserTabs();
      if (!liveTabs || liveTabs.length === 0) {
        setIsQuickReindexing(false);
        openSourceTab('browser_tab');
        return;
      }
      await connectorApi.clearSource('browser_tab');
      await connectorApi.ingestAllTabs(liveTabs.map((t) => t.id));
      await fetchStatus();
    } catch (err) {
      console.error('Reindex tabs error', err);
    } finally {
      setIsQuickReindexing(false);
    }
  };

  const [isRefreshingTabs, setIsRefreshingTabs] = useState(false);

  const handleRefreshLiveTabs = async () => {
    setIsRefreshingTabs(true);
    try {
      await connectorApi.getBrowserTabs();
      await fetchStatus();
    } catch (err) {
      console.error('Failed to refresh browser tabs', err);
    } finally {
      setIsRefreshingTabs(false);
    }
  };

  const currentMessages = threads[sourceType] || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isLoading]);

  const saveThreadMessages = (type: SourceType, newMessages: AgentMessage[]) => {
    setThreads((prev) => ({ ...prev, [type]: newMessages }));
  };

  const handleClearCurrentThread = () => {
    saveThreadMessages(sourceType, []);
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || inputText;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: AgentMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...currentMessages, userMessage];
    saveThreadMessages(sourceType, updatedMessages);
    setInputText('');
    setIsLoading(true);

    const chatHistory: ChatMessage[] = currentMessages.map((m) => ({
      role: m.role,
      content: m.content
    }));

    const scopedSessionId = `${baseSessionId}_${sourceType}`;
    const storedThreshold = typeof window !== 'undefined' ? localStorage.getItem('confidence_threshold') : null;
    const thresholdVal = storedThreshold ? parseFloat(storedThreshold) : 0.6;

    try {
      const res = await connectorApi.query(
        textToSend.trim(),
        0.5,
        scopedSessionId,
        selectedModel || undefined,
        sourceType,
        chatHistory,
        false,
        thresholdVal,
        true
      );

      const assistantMessage: AgentMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: res.answer || 'Local query completed with zero matches.',
        results: res.results || [],
        fileAction: res.file_action || null,
        timing: res.timing,
        model: selectedModel || 'llama3.1:8b',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence_level: res.confidence_level,
        top_score: res.top_score
      };

      saveThreadMessages(sourceType, [...updatedMessages, assistantMessage]);
    } catch (err) {
      const errorMessage: AgentMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: `Error running agent query: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        confidence_level: 'low'
      };
      saveThreadMessages(sourceType, [...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleApplyChange = async (msgId: string, action: FileAction) => {
    if (!action.file_path || !action.content) return;
    try {
      await connectorApi.applyFileChange(action.file_path, action.content);
      setAppliedActions((prev) => ({ ...prev, [msgId]: true }));
    } catch (err) {
      alert(`Failed to apply change: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSources = (id: string) => {
    setExpandedSources((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleChunkExpand = (chunkKey: string, chunk?: SearchResult) => {
    setExpandedChunks((prev) => ({ ...prev, [chunkKey]: !prev[chunkKey] }));
    if (chunk && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('inspect-chunk', { detail: chunk }));
    }
  };

  const getSourceIcon = (type?: string) => {
    if (type === 'notes' || type === 'document') return <FileText className="w-4 h-4 text-amber-500" />;
    if (type === 'browser_tab') return <Globe className="w-4 h-4 text-emerald-500" />;
    return <FolderGit2 className="w-4 h-4 text-primary" />;
  };

  const getScoreBadgeClass = (score: number) => {
    if (score >= 0.8) {
      return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    }
    if (score >= 0.6) {
      return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    }
    return 'bg-rose-500/15 text-rose-500 border-rose-500/30';
  };

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface select-none overflow-hidden">
      <div className="flex-shrink-0 px-6 md:px-10 py-3 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between gap-4 flex-wrap z-10">
        <div className="flex items-center gap-2 p-1.5 bg-surface rounded-2xl border border-outline-variant/40 shadow-elevation-1">
          <button
            type="button"
            onClick={() => handleModeSwitch('agent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeMode === 'agent'
                ? 'bg-primary text-on-primary shadow-elevation-1'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>AI Agent</span>
            <span className="text-[10px] opacity-75 font-mono">(RAG)</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeSwitch('search')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeMode === 'search'
                ? 'bg-primary text-on-primary shadow-elevation-1'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Semantic Search</span>
            <span className="text-[10px] opacity-75 font-mono">(Raw Retrieval)</span>
          </button>
        </div>

        {/* Right: Sources selector pills + Refresh Tabs */}
        {activeMode === 'agent' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-2xl border border-outline-variant/40 shadow-elevation-1">
              {SOURCE_TABS.map((tab) => {
                const Icon = tab.icon;
                const isTabActive = sourceType === tab.id;
                const tabCount = tab.id === 'browser_tab' ? (sourcesStatus?.browser_tab.tabs_count || 0) : (threads[tab.id]?.length || 0);

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSourceType(tab.id)}
                    className={`relative flex items-center gap-2 px-3.5 py-1.8 rounded-xl text-xs font-semibold transition-all duration-200 ${
                      isTabActive
                        ? 'bg-primary text-on-primary shadow-elevation-1'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isTabActive ? 'text-on-primary' : 'text-on-surface-variant'}`} />
                    <span>{tab.label}</span>
                    {tabCount > 0 && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                        isTabActive ? 'bg-on-primary/25 text-on-primary' : 'bg-surface-container-highest text-on-surface-variant'
                      }`}>
                        {tabCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleRefreshLiveTabs}
              disabled={isRefreshingTabs}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 hover:border-emerald-500/50 text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 transition-all shadow-elevation-1"
              title="Scan and detect new open browser tabs"
            >
              <RefreshCw className={clsx("w-3.5 h-3.5", isRefreshingTabs && "animate-spin")} />
              <span className="hidden sm:inline">Refresh Tabs</span>
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeMode === 'search' ? (
            <motion.div
              key="mode-search"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="h-full w-full"
            >
              <SemanticSearchRaw />
            </motion.div>
          ) : (
            <motion.div
              key="mode-agent"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="flex flex-col h-full w-full overflow-hidden"
            >

              <div className="flex-shrink-0 px-6 md:px-10 py-2.5 bg-surface-container-low/80 border-b border-outline-variant/30 flex items-center justify-between gap-3 flex-wrap text-xs">
                {sourceType === 'codebase' && (
                  <div className="flex items-center justify-between gap-3 w-full flex-wrap">
                    <div className="flex items-center gap-2 overflow-hidden max-w-xl">
                      <FolderGit2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-semibold text-on-surface shrink-0">Working Codebase:</span>
                      <span className="font-mono text-[11px] bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/50 text-on-surface truncate" title={sourcesStatus?.codebase.path}>
                        {sourcesStatus?.codebase.path || 'No repository selected'}
                      </span>
                      {sourcesStatus?.codebase.status === 'indexed' && sourcesStatus.codebase.chunks > 0 ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shrink-0">
                          {sourcesStatus.codebase.chunks} chunks
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium shrink-0">
                          Not indexed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {currentMessages.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearCurrentThread}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 border border-outline-variant/40 hover:border-rose-500/30 rounded-xl text-xs font-mono font-semibold transition-all shadow-elevation-1"
                          title="Clear active thread"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear Thread</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openSourceTab('codebase')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 hover:border-primary/50 text-on-surface font-semibold text-xs transition-all shadow-elevation-1"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-primary" />
                        <span>Select Folder</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickReindexCodebase}
                        disabled={isQuickReindexing || !sourcesStatus?.codebase.path}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 font-semibold text-xs transition-all disabled:opacity-40 shadow-elevation-1"
                        title="Reindex this codebase (flushes previous index)"
                      >
                        <RefreshCw className={clsx("w-3.5 h-3.5", isQuickReindexing && "animate-spin")} />
                        <span>Reindex</span>
                      </button>
                      {sourcesStatus?.codebase.chunks ? (
                        <button
                          type="button"
                          onClick={() => handleQuickClear('codebase')}
                          className="p-1.5 rounded-xl text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 border border-outline-variant/40 transition-colors"
                          title="Clear codebase index"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}

                {sourceType === 'notes' && (
                  <div className="flex items-center justify-between gap-3 w-full flex-wrap">
                    <div className="flex items-center gap-2 overflow-hidden max-w-xl">
                      <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="font-semibold text-on-surface shrink-0">Working Document / Notes:</span>
                      <span className="font-mono text-[11px] bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/50 text-on-surface truncate" title={sourcesStatus?.notes.path}>
                        {sourcesStatus?.notes.path ? sourcesStatus.notes.path.split(/[/\\\\]/).pop() : 'No document selected'}
                      </span>
                      {sourcesStatus?.notes.status === 'indexed' && sourcesStatus.notes.chunks > 0 ? (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shrink-0">
                          {sourcesStatus.notes.chunks} chunks
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium shrink-0">
                          Not indexed
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {currentMessages.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearCurrentThread}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 border border-outline-variant/40 hover:border-rose-500/30 rounded-xl text-xs font-mono font-semibold transition-all shadow-elevation-1"
                          title="Clear active thread"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear Thread</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openSourceTab('notes')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 hover:border-amber-500/50 text-on-surface font-semibold text-xs transition-all shadow-elevation-1"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                        <span>Select File</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickReindexNotes}
                        disabled={isQuickReindexing || !sourcesStatus?.notes.path}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-black hover:bg-amber-400 font-semibold text-xs transition-all disabled:opacity-40 shadow-elevation-1"
                        title="Reindex this document (flushes previous index)"
                      >
                        <RefreshCw className={clsx("w-3.5 h-3.5", isQuickReindexing && "animate-spin")} />
                        <span>Reindex</span>
                      </button>
                      {sourcesStatus?.notes.chunks ? (
                        <button
                          type="button"
                          onClick={() => handleQuickClear('notes')}
                          className="p-1.5 rounded-xl text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 border border-outline-variant/40 transition-colors"
                          title="Clear document index"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}

                {sourceType === 'browser_tab' && (
                  <div className="flex items-center justify-between gap-3 w-full flex-wrap">
                    <div className="flex items-center gap-2 overflow-hidden max-w-xl">
                      <Globe className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="font-semibold text-on-surface shrink-0">Live Browser Tabs:</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold shrink-0">
                        {sourcesStatus?.browser_tab.chunks || 0} chunks ({sourcesStatus?.browser_tab.tabs_count || 0} tabs)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentMessages.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearCurrentThread}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 border border-outline-variant/40 hover:border-rose-500/30 rounded-xl text-xs font-mono font-semibold transition-all shadow-elevation-1"
                          title="Clear active thread"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear Thread</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openSourceTab('browser_tab')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/60 hover:border-emerald-500/50 text-on-surface font-semibold text-xs transition-all shadow-elevation-1"
                      >
                        <Globe className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Select Tabs</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickReindexTabs}
                        disabled={isQuickReindexing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 font-semibold text-xs transition-all disabled:opacity-40 shadow-elevation-1"
                        title="Reindex live tabs into Moss"
                      >
                        <RefreshCw className={clsx("w-3.5 h-3.5", isQuickReindexing && "animate-spin")} />
                        <span>Reindex Live Tabs</span>
                      </button>
                      {sourcesStatus?.browser_tab.chunks ? (
                        <button
                          type="button"
                          onClick={() => handleQuickClear('browser_tab')}
                          className="p-1.5 rounded-xl text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 border border-outline-variant/40 transition-colors"
                          title="Clear tabs index"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}

                {sourceType === 'all' && (
                  <div className="flex items-center justify-between gap-3 w-full flex-wrap">
                    <div className="flex items-center gap-2 text-on-surface-variant font-mono text-xs">
                      <Layers className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-semibold text-on-surface">Unified Scope:</span>
                      <span>Codebase ({sourcesStatus?.codebase.chunks || 0}) • Notes ({sourcesStatus?.notes.chunks || 0}) • Tabs ({sourcesStatus?.browser_tab.chunks || 0})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {currentMessages.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearCurrentThread}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 border border-outline-variant/40 hover:border-rose-500/30 rounded-xl text-xs font-mono font-semibold transition-all shadow-elevation-1"
                          title="Clear active thread"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Clear Thread</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsSourceManagerOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-semibold text-xs transition-all shadow-elevation-1"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Manage All Sources</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickClear('all')}
                        className="p-1.5 rounded-xl text-on-surface-variant hover:text-rose-500 hover:bg-rose-500/10 border border-outline-variant/40 transition-colors"
                        title="Clear all indexes"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto px-6 md:px-10 py-6 max-w-4xl w-full mx-auto min-h-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={sourceType}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="w-full"
                  >
                    {currentMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-8 space-y-6">
                        <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-elevation-2">
                          <Sparkles className="w-8 h-8 text-primary" />
                        </div>

                        <div className="space-y-2">
                          <h2 className="font-display font-bold text-2xl md:text-3xl text-on-surface tracking-tight">
                            Reshidual Agent
                          </h2>
                          <p className="text-sm text-on-surface-variant leading-relaxed font-sans max-w-lg mx-auto">
                            {sourceType === 'all' && 'Local-first conversational engineering copilot querying Codebase, Notes, and Browser Tabs via Moss.'}
                            {sourceType === 'codebase' && 'Scoped to your repository. Generates contextual code edits with disk modification.'}
                            {sourceType === 'notes' && 'Scoped to documentation, PDFs, and notes indexed in the local Moss index.'}
                            {sourceType === 'browser_tab' && 'Scoped to live open tabs detected across running browsers (Brave, Chrome, Opera, Edge).'}
                          </p>
                        </div>

                        <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                          <button
                            type="button"
                            onClick={() => openSourceTab('codebase')}
                            className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/40 hover:border-primary/50 hover:bg-surface-container transition-all group flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <FolderGit2 className="w-5 h-5 text-primary" />
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                                {sourcesStatus?.codebase.chunks || 0} chunks
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors">
                                Codebase Source
                              </div>
                              <div className="text-[11px] text-on-surface-variant line-clamp-1">
                                {sourcesStatus?.codebase.path ? sourcesStatus.codebase.path.split(/[\\/]/).pop() : 'Pick repository folder'}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => openSourceTab('notes')}
                            className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/40 hover:border-amber-500/50 hover:bg-surface-container transition-all group flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <FileText className="w-5 h-5 text-amber-500" />
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold">
                                {sourcesStatus?.notes.chunks || 0} chunks
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-xs text-on-surface group-hover:text-amber-500 transition-colors">
                                Notes & Docs
                              </div>
                              <div className="text-[11px] text-on-surface-variant line-clamp-1">
                                {sourcesStatus?.notes.path ? sourcesStatus.notes.path.split(/[\\/]/).pop() : 'Attach notes & docs'}
                              </div>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => openSourceTab('browser_tab')}
                            className="p-3.5 rounded-2xl bg-surface-container-low border border-outline-variant/40 hover:border-emerald-500/50 hover:bg-surface-container transition-all group flex flex-col justify-between"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <Globe className="w-5 h-5 text-emerald-500" />
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold">
                                {sourcesStatus?.browser_tab.chunks || 0} chunks
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-xs text-on-surface group-hover:text-emerald-500 transition-colors">
                                Live Browser Tabs
                              </div>
                              <div className="text-[11px] text-on-surface-variant">
                                Auto-detect & index tabs
                              </div>
                            </div>
                          </button>
                        </div>

                        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          {SUGGESTED_PROMPTS[sourceType].map((prompt) => (
                            <button
                              key={prompt}
                              type="button"
                              onClick={() => handleSend(prompt)}
                              className="p-4 text-left rounded-2xl bg-surface-container-low border border-outline-variant/40 hover:border-primary/50 hover:bg-surface-container hover:shadow-elevation-1 transition-all duration-200 text-xs md:text-sm text-on-surface font-semibold leading-relaxed group"
                            >
                              <span className="group-hover:text-primary transition-colors">{prompt}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6 pb-6">
                        {currentMessages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                            className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            {msg.role === 'assistant' && (
                              <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-elevation-1">
                                <Sparkles className="w-4 h-4 text-primary" />
                              </div>
                            )}

                            <div
                              className={`flex flex-col gap-2.5 max-w-[85%] sm:max-w-[80%] ${
                                msg.role === 'user'
                                  ? 'bg-primary text-on-primary rounded-3xl rounded-tr-sm px-5 py-3.5 shadow-elevation-2 text-sm md:text-base leading-relaxed'
                                  : 'bg-surface-container-low border border-outline-variant/40 text-on-surface rounded-3xl rounded-tl-sm p-5 md:p-6 shadow-elevation-1 space-y-3'
                              }`}
                            >
                              {msg.role === 'assistant' && (
                                <div className="flex items-center justify-between gap-2 pb-3 border-b border-outline-variant/30 text-xs text-on-surface-variant font-mono">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-on-surface">Reshidual Agent</span>
                                    {msg.model && (
                                      <span className="px-2.5 py-0.5 rounded-lg bg-surface-container border border-outline-variant/40 text-[11px] font-bold text-on-surface-variant">
                                        {msg.model}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    {msg.timing && (
                                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                        {msg.timing.total_ms}ms
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleCopy(msg.content, msg.id)}
                                      className="p-1 hover:text-on-surface rounded-lg transition-colors hover:bg-surface-container"
                                      title="Copy response"
                                    >
                                      {copiedId === msg.id ? (
                                        <Check className="w-4 h-4 text-emerald-500" />
                                      ) : (
                                        <Copy className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {msg.role === 'assistant' && msg.confidence_level === 'low' && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-mono font-bold w-fit">
                                  <AlertTriangle className="w-4 h-4" />
                                  <span>Low confidence match {msg.top_score !== undefined ? `(score: ${msg.top_score.toFixed(3)})` : ''}</span>
                                </div>
                              )}

                              <div className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans">
                                {msg.content}
                              </div>

                              {msg.fileAction && msg.fileAction.action === 'modify' && msg.fileAction.content && (
                                <div className="mt-3 p-4 bg-surface rounded-2xl border border-primary/30 space-y-3 shadow-elevation-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-xs font-mono text-primary font-bold">
                                      <Wrench className="w-4 h-4" />
                                      <span>Proposed File Modification</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-on-surface-variant truncate px-2.5 py-0.5 rounded-lg bg-surface-container border border-outline-variant/40">
                                      {msg.fileAction.file_path}
                                    </span>
                                  </div>

                                  <div className="bg-surface-container-lowest p-3.5 rounded-xl font-mono text-xs md:text-sm text-on-surface overflow-x-auto max-h-60 border border-outline-variant/30 whitespace-pre-wrap leading-relaxed">
                                    {msg.fileAction.content}
                                  </div>

                                  <div className="flex justify-end pt-1">
                                    <button
                                      type="button"
                                      disabled={appliedActions[msg.id]}
                                      onClick={() => handleApplyChange(msg.id, msg.fileAction!)}
                                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-elevation-1 ${
                                        appliedActions[msg.id]
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                          : 'bg-primary text-on-primary hover:bg-primary/90'
                                      }`}
                                    >
                                      {appliedActions[msg.id] ? (
                                        <>
                                          <CheckCircle2 className="w-4 h-4" />
                                          <span>Applied to Disk</span>
                                        </>
                                      ) : (
                                        <>
                                          <Wrench className="w-4 h-4" />
                                          <span>Apply Change to Disk</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {msg.results && msg.results.length > 0 && (
                                <div className="pt-2">
                                  <button
                                    type="button"
                                    onClick={() => toggleSources(msg.id)}
                                    className="text-xs font-mono font-bold text-primary hover:underline flex items-center gap-2 transition-colors"
                                  >
                                    <Layers className="w-4 h-4" />
                                    <span>Retrieved {msg.results.length} chunks via Moss</span>
                                    {expandedSources[msg.id] ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>

                                  <AnimatePresence>
                                    {expandedSources[msg.id] && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.22 }}
                                        className="mt-3 space-y-3 overflow-hidden"
                                      >
                                        {msg.results.map((chunk, idx) => {
                                          const chunkKey = `${msg.id}_${chunk.chunk_id || idx}`;
                                          const isExpanded = expandedChunks[chunkKey];

                                          return (
                                            <div
                                              key={chunkKey}
                                              onClick={() => toggleChunkExpand(chunkKey, chunk)}
                                              className="p-4 rounded-2xl bg-surface border border-outline-variant/40 space-y-2.5 text-xs font-mono shadow-elevation-1 hover:border-primary/50 transition-colors cursor-pointer"
                                            >
                                              <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 truncate">
                                                  {getSourceIcon(chunk.source_type)}
                                                  <span className="font-bold text-on-surface truncate text-xs">
                                                    {chunk.file_path}
                                                  </span>
                                                  <span className="text-[11px] text-on-surface-variant bg-surface-container border border-outline-variant/30 px-2 py-0.5 rounded-lg font-bold">
                                                    L{chunk.start_line}-L{chunk.end_line}
                                                  </span>
                                                </div>

                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getScoreBadgeClass(chunk.blended_score)}`}>
                                                    Score: {chunk.blended_score.toFixed(3)}
                                                  </span>
                                                  <div className="p-1 text-on-surface-variant">
                                                    {isExpanded ? (
                                                      <Minimize2 className="w-3.5 h-3.5" />
                                                    ) : (
                                                      <Maximize2 className="w-3.5 h-3.5" />
                                                    )}
                                                  </div>
                                                </div>
                                              </div>

                                              <div className={`p-3 bg-surface-container-low rounded-xl text-xs font-mono text-on-surface-variant overflow-x-auto whitespace-pre-wrap leading-relaxed transition-all ${
                                                isExpanded ? 'max-h-96' : 'max-h-24'
                                              }`}>
                                                {chunk.content}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}

                        {isLoading && (
                          <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-4 justify-start"
                          >
                            <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0 shadow-elevation-1">
                              <Sparkles className="w-4 h-4 text-primary animate-spin" />
                            </div>
                            <div className="p-5 bg-surface-container-low border border-outline-variant/40 rounded-3xl rounded-tl-sm space-y-3 min-w-[260px] shadow-elevation-1 animate-pulse">
                              <div className="flex items-center gap-2 text-xs font-mono text-primary font-bold">
                                <Terminal className="w-4 h-4" />
                                <span>Querying Moss local index...</span>
                              </div>
                              <div className="h-3 w-4/5 bg-surface-container-high rounded-full" />
                              <div className="h-3 w-1/2 bg-surface-container-high rounded-full" />
                            </div>
                          </motion.div>
                        )}

                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex-shrink-0 p-4 md:p-6 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/30 z-20">
                <div className="max-w-4xl mx-auto w-full space-y-2.5">
                  <div className="bg-surface-container/95 backdrop-blur-xl border border-outline-variant/60 rounded-3xl shadow-elevation-3 p-3.5 space-y-2.5 transition-all duration-200 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
                    <div className="flex items-end gap-2.5">
                      <textarea
                        ref={textareaRef}
                        value={inputText}
                        onChange={(e) => {
                          setInputText(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                        }}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        placeholder={`Message Reshidual Agent (${sourceType === 'all' ? 'All Sources' : sourceType.replace('_', ' ')})... (Enter to send)`}
                        className="flex-1 bg-transparent border-none outline-none text-sm md:text-base text-on-surface placeholder:text-on-surface-variant/50 resize-none py-2 px-3 max-h-36 font-sans"
                      />

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <VoiceCapture
                          onTranscription={(text) => {
                            setInputText(text);
                            handleSend(text);
                          }}
                        />

                        <button
                          type="button"
                          onClick={() => handleSend()}
                          disabled={!inputText.trim() || isLoading}
                          className="p-3 bg-primary text-on-primary rounded-2xl hover:bg-primary/90 transition-all disabled:opacity-40 shadow-elevation-1"
                          title="Send message"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-3 pt-1 text-xs text-on-surface-variant/80 font-mono">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-3.5 h-3.5 text-primary" />
                        <span>Model: <strong className="text-on-surface">{selectedModel || 'llama3.2:11b'}</strong></span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>Scope: <strong className="text-primary capitalize">{sourceType.replace('_', ' ')}</strong></span>
                        <span>•</span>
                        <span>Shift+Enter for newline</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <InlineSourceManager
        isOpen={isSourceManagerOpen}
        activeSourceTab={activeSourceManagerTab}
        onClose={() => {
          setIsSourceManagerOpen(false);
          fetchStatus();
        }}
        onSourcesUpdated={fetchStatus}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm font-mono text-on-surface-variant">Loading workspace...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}