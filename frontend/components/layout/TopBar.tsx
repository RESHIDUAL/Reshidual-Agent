'use client';

import { useEffect, useState, Suspense } from 'react';
import { useTheme } from '@/theme/ThemeProvider';
import { Sun, Moon, Monitor, Cpu, RefreshCw, AlertCircle, Zap, Key } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { connectorApi } from '@/lib/api/connector';
import { BYOMModal } from '@/components/models/BYOMModal';

function TopBarContent() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentMode = searchParams.get('mode');

  const [models, setModels] = useState<string[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('');
  const [isOllamaOnline, setIsOllamaOnline] = useState<boolean>(false);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);

  const [isByomModalOpen, setIsByomModalOpen] = useState<boolean>(false);

  const fetchModels = async () => {
    setIsLoadingModels(true);
    try {
      const data = await connectorApi.getModels();
      const modelList = data.models || [];
      setModels(modelList);
      setIsOllamaOnline(data.ollama_online);
      
      const stored = typeof window !== 'undefined' ? localStorage.getItem('selected_ollama_model') : null;
      let initial = data.current_model || '';
      if (stored && modelList.includes(stored)) {
        initial = stored;
      } else if (!initial && modelList.length > 0) {
        initial = modelList[0];
      }
      
      setCurrentModel(initial);
      if (typeof window !== 'undefined' && initial) {
        localStorage.setItem('selected_ollama_model', initial);
      }
    } catch {
      setIsOllamaOnline(false);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    fetchModels();

    const handleUpdated = () => fetchModels();
    window.addEventListener('models-updated', handleUpdated);
    return () => {
      window.removeEventListener('models-updated', handleUpdated);
    };
  }, []);

  const handleModelChange = (newModel: string) => {
    setCurrentModel(newModel);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected_ollama_model', newModel);
      window.dispatchEvent(new CustomEvent('ollama-model-changed', { detail: newModel }));
    }
  };

  const getPageTitle = () => {
    if (pathname.includes('/settings')) return 'Settings & Preferences';
    if (currentMode === 'search') return 'Semantic Search (Moss Sub-10ms Engine)';
    return 'Reshidual Agent (Local RAG Copilot)';
  };

  const getModelLabel = (m: string) => {
    if (m.startsWith('nvidia/')) {
      const clean = m.replace('nvidia/', '');
      if (clean.includes('llama-3.2-11b')) return '[NVIDIA] Llama 3.2 11B (Fast)';
      if (clean.includes('llama-3.2-3b')) return '[NVIDIA] Llama 3.2 3B (Fast)';
      if (clean.includes('deepseek-coder')) return '[NVIDIA] DeepSeek Coder 6.7B';
      if (clean.includes('gemma-3-12b')) return '[NVIDIA] Gemma 3 12B';
      if (clean.includes('yi-large')) return '[NVIDIA] Yi Large';
      return `[NVIDIA] ${clean}`;
    }
    if (m.startsWith('openrouter/')) {
      const clean = m.replace('openrouter/', '');
      return `[OpenRouter] ${clean}`;
    }
    if (m.startsWith('google/')) {
      const clean = m.replace('google/', '');
      return `[Google] ${clean}`;
    }
    if (m.startsWith('ollama/')) {
      const clean = m.replace('ollama/', '');
      return `[Ollama] ${clean}`;
    }
    if (m.includes('llama3.1') || m.includes('qwen2.5:7b') || m.includes('8b')) {
      return `${m} (Accurate)`;
    }
    if (m.includes('0.6b') || m.includes('1.5b') || m.includes('0.5b')) {
      return `${m} (Fast)`;
    }
    if (m.includes('3b')) {
      return `${m} (Balanced)`;
    }
    return m;
  };

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-surface/90 backdrop-blur-md border-b border-outline-variant/30 z-10 select-none">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-base font-bold text-on-surface tracking-tight">
          {getPageTitle()}
        </h1>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-xs font-mono text-on-surface-variant font-medium">
          <Zap className="w-3.5 h-3.5 text-emerald-500" />
          <span>Moss Zero-DB</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center bg-surface-container-low px-3 py-1.5 rounded-2xl border border-outline-variant/40 space-x-2 text-xs shadow-elevation-1 transition-all duration-200 hover:border-outline-variant">
          <div className="flex items-center gap-1.5 text-on-surface-variant font-medium">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold">Model:</span>
          </div>

          {models.length > 0 ? (
            <select
              value={currentModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="bg-surface text-on-surface font-mono text-xs px-2.5 py-1 rounded-lg border border-outline-variant/60 outline-none cursor-pointer hover:border-primary focus:border-primary transition-colors max-w-[200px] truncate"
            >
              {models.map((m) => (
                <option key={m} value={m}>
                  {getModelLabel(m)}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center text-amber-500 gap-1 font-mono text-xs">
              <AlertCircle className="w-3 h-3" />
              <span>No models</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsByomModalOpen(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-semibold text-[11px] transition-colors"
            title="Bring Your Own Models (Nvidia, OpenRouter, Google)"
          >
            <Key className="w-3 h-3" />
            <span>BYOM</span>
          </button>

          <button
            onClick={fetchModels}
            title="Refresh models"
            className="p-1 text-on-surface-variant hover:text-on-surface rounded-lg transition-colors hover:bg-surface-container"
          >
            <RefreshCw className={`w-3 h-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="h-4 w-px bg-outline-variant/40" />

        <BYOMModal
          isOpen={isByomModalOpen}
          onClose={() => setIsByomModalOpen(false)}
          onKeysSaved={fetchModels}
        />

        <button
          onClick={cycleTheme}
          className="relative w-9 h-9 flex items-center justify-center rounded-2xl bg-surface-container-low border border-outline-variant/30 hover:bg-surface-container transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-elevation-1"
          aria-label="Toggle theme"
          title={`Theme: ${theme}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={theme}
              initial={{ opacity: 0, scale: 0.7, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.7, rotate: 30 }}
              transition={{ duration: 0.15 }}
            >
              <ThemeIcon className="w-4 h-4 text-on-surface-variant" />
            </motion.div>
          </AnimatePresence>
        </button>
      </div>
    </header>
  );
}

export default function TopBar() {
  return (
    <Suspense fallback={<header className="h-16 border-b border-outline-variant/30" />}>
      <TopBarContent />
    </Suspense>
  );
}
