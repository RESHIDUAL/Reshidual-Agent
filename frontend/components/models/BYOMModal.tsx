'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Cpu, 
  ExternalLink,
  Save,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { connectorApi } from '@/lib/api/connector';

interface BYOMModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeysSaved?: () => void;
}

export function BYOMModal({ isOpen, onClose, onKeysSaved }: BYOMModalProps) {
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  
  const [existingKeys, setExistingKeys] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchKeys();
      setSavedSuccess(false);
      setStatusMessage('');
    }
  }, [isOpen]);

  const fetchKeys = async () => {
    try {
      const res = await connectorApi.getModelKeys();
      if (res && res.keys) {
        setExistingKeys(res.keys);
      }
    } catch {
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage('');

    try {
      const payload: { nvidia?: string; openrouter?: string; google?: string } = {};
      if (nvidiaKey.trim()) payload.nvidia = nvidiaKey.trim();
      if (openrouterKey.trim()) payload.openrouter = openrouterKey.trim();
      if (googleKey.trim()) payload.google = googleKey.trim();

      const res = await connectorApi.updateModelKeys(payload);
      setSavedSuccess(true);
      setStatusMessage('API keys updated successfully. Available models refreshed.');
      setNvidiaKey('');
      setOpenrouterKey('');
      setGoogleKey('');
      await fetchKeys();
      
      if (onKeysSaved) {
        onKeysSaved();
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('models-updated'));
      }
      setTimeout(() => {
        setSavedSuccess(false);
      }, 3000);
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Failed to save keys');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-surface border border-outline-variant/60 rounded-3xl shadow-elevation-4 overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          <div className="px-6 py-5 border-b border-outline-variant/30 flex items-center justify-between bg-surface-container-low">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-elevation-1">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-on-surface tracking-tight">
                  Bring Your Own Models (BYOM)
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Configure external API keys for high-speed inference or cloud failover
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 font-sans">
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-display font-bold text-sm text-on-surface">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span>NVIDIA NIM (Fast Cloud Inference)</span>
                </div>
                {existingKeys.nvidia ? (
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Configured ({existingKeys.nvidia})</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                    Not set
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant">
                Supported models: Llama 3.2 11B Vision, Llama 3.2 3B, DeepSeek Coder 6.7B, Gemma 3 12B
              </p>
              <div className="relative">
                <input
                  type="password"
                  placeholder={existingKeys.nvidia ? 'Update NVIDIA API Key...' : 'Paste nvapi-... key'}
                  value={nvidiaKey}
                  onChange={(e) => setNvidiaKey(e.target.value)}
                  className="w-full bg-surface text-on-surface text-xs font-mono px-3.5 py-2.5 rounded-xl border border-outline-variant/60 focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-display font-bold text-sm text-on-surface">
                  <Cpu className="w-4 h-4 text-primary" />
                  <span>OpenRouter (Claude, GPT, Open Models)</span>
                </div>
                {existingKeys.openrouter ? (
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Configured ({existingKeys.openrouter})</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                    Not set
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant">
                Supported models: Claude 3.5 Sonnet, Llama 3.1 70B, GPT-4o-mini
              </p>
              <div className="relative">
                <input
                  type="password"
                  placeholder={existingKeys.openrouter ? 'Update OpenRouter API Key...' : 'Paste sk-or-v1-... key'}
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  className="w-full bg-surface text-on-surface text-xs font-mono px-3.5 py-2.5 rounded-xl border border-outline-variant/60 focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-display font-bold text-sm text-on-surface">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span>Google AI Studio (Gemini)</span>
                </div>
                {existingKeys.google ? (
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Configured ({existingKeys.google})</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-mono text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                    Not set
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant">
                Supported models: Gemini 1.5 Flash, Gemini 1.5 Pro, Gemini 2.0 Flash
              </p>
              <div className="relative">
                <input
                  type="password"
                  placeholder={existingKeys.google ? 'Update Google AI API Key...' : 'Paste AIzaSy... key'}
                  value={googleKey}
                  onChange={(e) => setGoogleKey(e.target.value)}
                  className="w-full bg-surface text-on-surface text-xs font-mono px-3.5 py-2.5 rounded-xl border border-outline-variant/60 focus:border-primary outline-none transition-colors"
                />
              </div>
            </div>

            {statusMessage && (
              <div className={`p-3 rounded-xl text-xs font-mono flex items-center gap-2 ${
                savedSuccess ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
              }`}>
                {savedSuccess ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                <span>{statusMessage}</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between">
              <p className="text-[11px] text-on-surface-variant/80 font-mono">
                Keys are stored locally in backend/data/api_keys.json
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container transition-colors"
                >
                  Close
                </button>

                <button
                  type="submit"
                  disabled={isSaving || (!nvidiaKey && !openrouterKey && !googleKey)}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-40 transition-all shadow-elevation-1"
                >
                  {isSaving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Keys</span>
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
