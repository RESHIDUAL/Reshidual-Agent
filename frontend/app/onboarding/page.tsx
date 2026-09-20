'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getHealth, updateSettings } from '@/lib/api/connector';
import { useTheme } from '@/lib/hooks/useTheme';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, ArrowRight, Cloud, ShieldCheck, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { containerVariants, itemVariants } from '@/lib/utils/animations';
import { HealthStatus } from '@/lib/api/types';

export default function OnboardingPage() {
  const router = useRouter();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);

  const [mossProjectId, setMossProjectId] = useState('');
  const [mossProjectKey, setMossProjectKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useTheme();

  useEffect(() => {
    async function checkHealth() {
      try {
        const h = await getHealth();
        setHealth(h);
      } catch (err) {
        
      } finally {
        setHealthLoading(false);
      }
    }
    checkHealth();
  }, []);

  const handleContinue = async () => {
    setIsSubmitting(true);
    try {
      if (mossProjectId.trim() && mossProjectKey.trim()) {
        await updateSettings({
          moss_project_id: mossProjectId.trim(),
          moss_project_key: mossProjectKey.trim()
        });
      }
      router.push('/sources');
    } catch {
      router.push('/sources');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 text-on-surface">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-2xl w-full space-y-6"
      >
        <motion.div variants={itemVariants} className="text-center space-y-2">
          <h1 className="text-4xl font-display text-primary font-semibold">
            Welcome to Reshidual Agent
          </h1>
          <p className="text-sm text-on-surface-variant">
            Local-first AI development environment powered by Moss hybrid search and local LLMs
          </p>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6 border-primary/40 bg-surface-container/60">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-cyan-500/20 text-cyan-400">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-medium">Moss Semantic Search Integration</h2>
                  <p className="text-xs text-on-surface-variant">Official Moss SDK (usemoss.dev)</p>
                </div>
              </div>
              <a
                href="https://usemoss.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Get API Keys <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="bg-surface-container-high rounded-lg p-3.5 mb-4 text-xs space-y-2 border border-outline-variant">
              <div className="flex items-center gap-2 text-primary font-semibold">
                <ShieldCheck className="w-4 h-4 text-success" />
                <span>Transparent Network Boundary</span>
              </div>
              <ul className="space-y-1.5 text-on-surface-variant">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-mono text-[11px]">&rarr; What goes to cloud:</span>
                  <span>Redacted AST code chunks sync to Moss Cloud (<code className="font-mono text-cyan-300">api.usemoss.dev</code>) for vector indexing.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success font-mono text-[11px]">&bull; What stays 100% local:</span>
                  <span>All search queries run locally in-memory via embedded Rust core. LLM inference, self-healing, and raw secrets never leave your device.</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">
                  Moss Project ID
                </label>
                <input
                  type="text"
                  value={mossProjectId}
                  onChange={(e) => setMossProjectId(e.target.value)}
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
                    type={showKey ? "text" : "password"}
                    value={mossProjectKey}
                    onChange={(e) => setMossProjectKey(e.target.value)}
                    placeholder="e.g., key_live_..."
                    className="w-full bg-surface-container border border-outline rounded-md px-3 py-2 pr-10 text-sm font-mono text-on-surface focus:outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-2.5 text-on-surface-variant hover:text-on-surface"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-3">Local Services Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <HealthCheckItem
                name="Ollama"
                loading={healthLoading}
                status={Boolean(health?.ollama)}
                detail={health?.models?.length ? `${health.models.length} models` : (health?.ollama ? 'Connected' : 'Not running')}
              />
              <HealthCheckItem
                name="Moss Engine"
                loading={healthLoading}
                status={Boolean(health?.moss)}
                detail={health?.moss_configured ? 'Configured' : 'Ready'}
              />
              <HealthCheckItem
                name="Docker"
                loading={healthLoading}
                status={Boolean(health?.docker)}
                detail={health?.docker ? 'Running' : 'Optional'}
              />
              <HealthCheckItem
                name="LiveKit"
                loading={healthLoading}
                status={Boolean(health?.livekit)}
                detail={health?.livekit ? 'Connected' : 'Local Audio'}
              />
            </div>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="flex justify-end pt-2">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={isSubmitting}
            className="w-full sm:w-auto gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <span>Configure Sources</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}

function HealthCheckItem({ name, loading, status, detail }: { name: string, loading: boolean, status: boolean, detail: string }) {
  return (
    <div className="flex flex-col p-3 rounded-lg bg-surface-container border border-outline-variant">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-xs">{name}</span>
        {loading ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : status ? (
          <CheckCircle className="w-4 h-4 text-success" />
        ) : (
          <XCircle className="w-4 h-4 text-error" />
        )}
      </div>
      <span className="text-[11px] text-on-surface-variant truncate" title={detail}>{detail}</span>
    </div>
  );
}