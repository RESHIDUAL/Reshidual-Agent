'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/settings/ThemeToggle';
import { OllamaModelPicker } from '@/components/settings/OllamaModelPicker';
import { LiveKitConfig } from '@/components/settings/LiveKitConfig';
import { AlphaDefault } from '@/components/settings/AlphaDefault';
import { getSettings, updateSettings, getModels } from '@/lib/api/connector';
import { SettingsConfig } from '@/lib/api/types';
import { Save, Info, Cloud, CheckCircle, AlertCircle, Eye, EyeOff, ExternalLink, ShieldCheck, Key, Sparkles } from 'lucide-react';
import { BYOMModal } from '@/components/models/BYOMModal';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsConfig | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showMossKey, setShowMossKey] = useState(false);
  const [isByomOpen, setIsByomOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const s = await getSettings();
      setSettings(s);
      try {
        const m = await getModels();
        if (m && m.models) {
          setAvailableModels(m.models);
        }
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateSettings(settings);
      setHasChanges(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (key: keyof SettingsConfig, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
    setHasChanges(true);
  };

  if (!settings) return null;

  const mossConfigured = Boolean(
    (settings.moss_project_id || settings.mossProjectId) &&
    (settings.moss_project_key || settings.mossProjectKey)
  );

  return (
    <div className="flex flex-col h-full bg-surface text-on-surface p-6 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-6 pb-20">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-medium">Settings</h1>
            <p className="text-sm text-on-surface-variant">Configure local engines, models, and privacy parameters</p>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving} className="gap-2">
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {}
        <Card className="p-6 border-cyan-500/30 bg-surface-container/80">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-cyan-500/20 text-cyan-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-medium">Moss Hybrid Search Engine</h2>
                <p className="text-xs text-on-surface-variant">Official Moss SDK (usemoss.dev)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                mossConfigured
                  ? 'bg-success/20 text-success border border-success/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {mossConfigured ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    Ready & Configured
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5" />
                    Credentials Required
                  </>
                )}
              </span>
              <a
                href="https://usemoss.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 ml-2"
              >
                Dashboard <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="bg-surface-container-high rounded-md p-3 mb-4 text-xs text-on-surface-variant border border-outline-variant flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p>
              <strong className="text-on-surface">Network Reality:</strong> Code chunks (post AST-chunking and local secret redaction) sync to Moss Cloud (<code className="font-mono text-cyan-400">api.usemoss.dev</code>). Once indexed, all search queries run <strong>100% locally in-memory</strong> via <code className="font-mono">inferedge-moss-core</code> with 0 network calls.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Moss Project ID
              </label>
              <input
                type="text"
                value={settings.moss_project_id || settings.mossProjectId || ''}
                onChange={(e) => {
                  updateField('moss_project_id', e.target.value);
                  updateField('mossProjectId', e.target.value);
                }}
                placeholder="e.g., prj_moss_01..."
                className="w-full bg-surface-container border border-outline rounded-md px-3 py-2 text-sm font-mono text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-on-surface-variant mb-1">
                Moss Project Key
              </label>
              <div className="relative">
                <input
                  type={showMossKey ? "text" : "password"}
                  value={settings.moss_project_key || settings.mossProjectKey || ''}
                  onChange={(e) => {
                    updateField('moss_project_key', e.target.value);
                    updateField('mossProjectKey', e.target.value);
                  }}
                  placeholder="e.g., key_live_..."
                  className="w-full bg-surface-container border border-outline rounded-md px-3 py-2 pr-10 text-sm font-mono text-on-surface focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowMossKey(!showMossKey)}
                  className="absolute right-2 top-2.5 text-on-surface-variant hover:text-on-surface"
                >
                  {showMossKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-primary/30 bg-surface-container/80">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-full bg-primary/20 text-primary">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-medium">Bring Your Own Models (BYOM)</h2>
                <p className="text-xs text-on-surface-variant">Configure NVIDIA NIM, OpenRouter, Google AI Studio, and local Ollama</p>
              </div>
            </div>
            <Button onClick={() => setIsByomOpen(true)} className="gap-2 bg-primary text-on-primary">
              <Key className="w-4 h-4" />
              Manage API Keys & Models
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-surface-container-high border border-outline-variant/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-on-surface">NVIDIA NIM</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold">Fast Cloud</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">Llama 3.2 11B Vision, Llama 3.2 3B, DeepSeek Coder 6.7B</p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-high border border-outline-variant/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-on-surface">OpenRouter</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">Multi-Provider</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">Claude 3.5 Sonnet, Llama 3.1 70B, GPT-4o-mini</p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-container-high border border-outline-variant/50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-xs text-on-surface">Google Gemini</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-bold">AI Studio</span>
              </div>
              <p className="text-[11px] text-on-surface-variant">Gemini 1.5 Flash, Gemini 1.5 Pro, Gemini 2.0 Flash</p>
            </div>
          </div>
        </Card>

        <BYOMModal
          isOpen={isByomOpen}
          onClose={() => setIsByomOpen(false)}
        />

        <Card className="p-6">
          <h2 className="text-xl font-medium mb-4">Appearance</h2>
          <div className="max-w-md">
            <ThemeToggle />
          </div>
        </Card>

        {}
        <Card className="p-6">
          <h2 className="text-xl font-medium mb-4">AI Model Selection (Local & Cloud)</h2>
          <OllamaModelPicker
            models={availableModels}
            currentModel={settings.ollamaModel || settings.ollama_model || 'nvidia/meta/llama-3.2-11b-vision-instruct'}
            onChange={(m) => {
              updateField('ollamaModel', m);
              updateField('ollama_model', m);
            }}
          />
        </Card>

        {}
        <Card className="p-6">
          <h2 className="text-xl font-medium mb-4">Voice & Audio (Self-Hosted)</h2>
          <LiveKitConfig
            port={settings.livekitPort ?? settings.livekit_port ?? 7880}
            onChangePort={(p) => updateField('livekitPort', p)}
          />
        </Card>

        {}
        <Card className="p-6">
          <h2 className="text-xl font-medium mb-4">Search & Redaction Defaults</h2>
          <AlphaDefault
            value={settings.defaultAlpha ?? settings.alpha_default ?? 0.5}
            onChange={(a) => updateField('defaultAlpha', a)}
          />
          <div className="mt-6">
            <label className="block text-sm font-medium text-on-surface-variant mb-2">Local Secret Redaction Sensitivity</label>
            <div className="flex gap-2">
              {['Low', 'Medium', 'High'].map(level => (
                <Button
                  key={level}
                  variant={(settings.redactionSensitivity || settings.redaction_sensitivity) === level.toLowerCase() ? 'filled' : 'outlined'}
                  onClick={() => {
                    updateField('redactionSensitivity', level.toLowerCase());
                    updateField('redaction_sensitivity', level.toLowerCase());
                  }}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-on-surface-variant">RAG Retrieval Confidence Cutoff</label>
              <span className="font-mono text-xs text-primary font-semibold">
                {(settings.confidenceThreshold ?? settings.confidence_threshold ?? 0.6).toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.3"
              max="0.9"
              step="0.05"
              value={settings.confidenceThreshold ?? settings.confidence_threshold ?? 0.6}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                updateField('confidenceThreshold', val);
                updateField('confidence_threshold', val);
                if (typeof window !== 'undefined') {
                  localStorage.setItem('confidence_threshold', val.toString());
                }
              }}
              className="w-full accent-primary cursor-pointer"
            />
            <p className="text-xs text-on-surface-variant mt-1">
              Matches with top chunk score below this cutoff will display a Low confidence match indicator.
            </p>
          </div>
        </Card>

        {}
        <Card className="p-6">
          <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            System Info
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-on-surface-variant">Data Directory</span>
              <p className="font-mono text-on-surface bg-surface-container p-2 rounded truncate">
                {settings.dataDirectory || '~/.reshidual'}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-on-surface-variant">Index Statistics</span>
              <div className="bg-surface-container p-2 rounded space-y-1">
                <p>Engine: <span className="font-medium text-cyan-400">Moss SDK v1.12.0</span></p>
                <p>Retrieval Mode: <span className="font-medium">Local In-Memory Rust Core</span></p>
              </div>
            </div>
            <div className="space-y-1 md:col-span-2 mt-4 text-on-surface-variant">
              Version: 1.0.0-beta.1 (Local First AI Edition)
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}