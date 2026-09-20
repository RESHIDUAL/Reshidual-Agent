'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Cpu } from 'lucide-react';
import { clsx } from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';

const DEFAULT_MODELS = [
  'nvidia/meta/llama-3.2-11b-vision-instruct',
  'nvidia/meta/llama-3.2-3b-instruct',
  'qwen3:0.6b',
  'llama3.1:8b',
  'qwen2.5-coder:7b'
];

interface OllamaModelPickerProps {
  models?: string[];
  currentModel?: string;
  onChange: (model: string) => void;
  isLoading?: boolean;
}

export function OllamaModelPicker({
  models = DEFAULT_MODELS,
  currentModel = 'nvidia/meta/llama-3.2-11b-vision-instruct',
  onChange,
  isLoading = false
}: OllamaModelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const displayModels = models && models.length > 0 ? models : DEFAULT_MODELS;

  return (
    <div className="relative w-full max-w-md" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={clsx(
          "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-sm font-mono text-left",
          isOpen
            ? "border-primary bg-surface-container ring-2 ring-primary/20"
            : "border-outline-variant/60 bg-surface-container hover:border-primary/50 text-on-surface",
          isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-2.5 truncate">
          <Cpu className="w-4 h-4 text-primary shrink-0" />
          <span className="text-on-surface truncate font-medium">
            {currentModel || 'Select a model'}
          </span>
        </div>
        <ChevronDown className={clsx("w-4 h-4 text-on-surface-variant transition-transform shrink-0 ml-2", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 py-1.5 bg-surface-container border border-outline-variant/70 rounded-xl shadow-elevation-3 max-h-72 overflow-y-auto divide-y divide-outline-variant/20 backdrop-blur-xl"
          >
            {displayModels.length === 0 ? (
              <div className="px-4 py-3 text-xs text-on-surface-variant">
                No models available
              </div>
            ) : (
              displayModels.map((model) => {
                const isSelected = model === currentModel;
                const isNvidia = model.startsWith('nvidia/');
                const isGemini = model.startsWith('google/') || model.includes('gemini');
                const isOpenRouter = model.startsWith('openrouter/');
                const isOllama = !isNvidia && !isGemini && !isOpenRouter;

                return (
                  <button
                    key={model}
                    type="button"
                    onClick={() => {
                      onChange(model);
                      setIsOpen(false);
                    }}
                    className={clsx(
                      "w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors",
                      isSelected
                        ? "bg-primary/15 text-primary font-medium"
                        : "text-on-surface hover:bg-surface-container-high"
                    )}
                  >
                    <div className="flex items-center gap-2 font-mono text-xs truncate">
                      <span className="truncate">{model}</span>
                      {isNvidia && (
                        <span className="px-1.5 py-0.5 text-[9px] font-sans font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded">
                          NVIDIA NIM
                        </span>
                      )}
                      {isGemini && (
                        <span className="px-1.5 py-0.5 text-[9px] font-sans font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded">
                          Gemini
                        </span>
                      )}
                      {isOpenRouter && (
                        <span className="px-1.5 py-0.5 text-[9px] font-sans font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded">
                          OpenRouter
                        </span>
                      )}
                      {isOllama && (
                        <span className="px-1.5 py-0.5 text-[9px] font-sans font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded">
                          Local Ollama
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}