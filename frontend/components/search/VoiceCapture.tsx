'use client';

import React from 'react';
import { Mic, Square, Check, Sparkles } from 'lucide-react';
import { useVoiceAssistant } from '@/lib/hooks/useVoiceAssistant';
import { Waveform } from '@/components/ui/Waveform';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceCaptureProps {
  onTranscription: (text: string) => void;
}

export function VoiceCapture({ onTranscription }: VoiceCaptureProps) {
  const {
    isActive,
    state,
    queryText,
    audioLevel,
    startAssistant,
    stopAssistant,
    manualSubmit
  } = useVoiceAssistant({ onTranscription });

  return (
    <div className="relative flex items-center">
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute bottom-full right-0 mb-3 flex items-center gap-3 bg-surface-container-high/95 backdrop-blur-xl border border-primary/40 text-on-surface px-4 py-2.5 rounded-2xl shadow-elevation-4 z-50 whitespace-nowrap min-w-[300px] max-w-md"
          >
            {state === 'waiting_hotword' && (
              <div className="flex items-center gap-2.5 text-xs">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                </span>
                <span className="text-on-surface font-medium">Say <strong className="text-cyan-400 font-mono">&quot;hello&quot;</strong> to start voice query</span>
              </div>
            )}

            {state === 'recording_query' && (
              <div className="flex items-center justify-between gap-3 w-full">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error"></span>
                  </span>
                  <div className="overflow-hidden truncate">
                    <span className="text-xs text-on-surface-variant font-medium mr-1.5">Listening:</span>
                    <span className="text-xs font-mono text-on-surface font-semibold">
                      {queryText ? `&quot;${queryText}&quot;` : 'Speak now...'}
                    </span>
                  </div>
                </div>

                <div className="w-14 h-4 shrink-0">
                  <Waveform isActive={true} audioLevel={audioLevel} barCount={10} />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                    Say &quot;now start&quot;
                  </span>
                  {queryText && (
                    <button
                      type="button"
                      onClick={manualSubmit}
                      className="p-1 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors"
                      title="Send captured query"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {state === 'submitting' && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <Sparkles className="w-4 h-4 animate-spin text-emerald-400" />
                <span className="font-semibold">Executing: &quot;{queryText}&quot;</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={isActive ? stopAssistant : startAssistant}
        className={`p-3 rounded-2xl transition-all flex items-center justify-center relative
          ${isActive
            ? state === 'recording_query'
              ? 'bg-error text-on-error shadow-[0_0_20px_rgba(239,68,68,0.5)] ring-2 ring-error/50 animate-pulse'
              : 'bg-primary text-on-primary shadow-[0_0_20px_rgba(56,189,248,0.4)] ring-2 ring-primary/40'
            : 'bg-surface-container border border-outline-variant/60 text-on-surface hover:bg-surface-container-high hover:border-primary/40 hover:text-primary'}
        `}
        title={isActive ? 'Stop Voice Assistant' : 'Voice Assistant: Say "hello", speak query, say "now start"'}
      >
        {isActive ? (
          <Square className="w-5 h-5 fill-current" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
    </div>
  );
}