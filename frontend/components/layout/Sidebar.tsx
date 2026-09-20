'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { 
  Bot, 
  Search, 
  Settings, 
  Cpu, 
  Sparkles,
  Zap,
  Key
} from 'lucide-react';
import { motion } from 'framer-motion';
import { BYOMModal } from '@/components/models/BYOMModal';

function NvidiaLogo({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M8.9 7.2c-.3.2-.5.5-.5.8 0 .4.2.7.5.9 2.2 1.4 3.7 3.7 3.7 6.4 0 .9-.2 1.7-.5 2.5l2.2 1.7c.8-1.2 1.2-2.7 1.2-4.2 0-3.8-2.3-7.1-5.6-8.9-.4-.3-.8-.1-1 .3zm-3.5 2.4c-.3.2-.4.6-.3.9.1.3.4.5.7.5 1.7.3 3.1 1.4 3.7 2.9.3.6.4 1.3.4 2 0 1.2-.5 2.3-1.3 3.1l1.8 1.8c1.3-1.3 2.1-3 2.1-4.9 0-1.3-.3-2.5-.9-3.6-1.1-2.1-3-3.6-5.3-4.1-.3 0-.6.1-.9.5zM3.4 12c0-.5.2-.9.5-1.1.3-.3.7-.3 1 0 1.1 1 1.8 2.4 1.8 3.9 0 1-.3 1.9-.9 2.7l1.7 1.7c1-1.2 1.6-2.7 1.6-4.4 0-2.3-1.1-4.4-2.8-5.7-.3-.3-.8-.3-1.1 0-.3.3-.4.7-.4 1.1v1.8H3.4zm17.2-4.8c-2.3-2.3-5.5-3.7-8.9-3.7-4.2 0-7.9 2.1-10.1 5.3-.2.3-.2.7 0 1 .2.3.6.4 1 .2 2-2.8 5.3-4.6 9.1-4.6 3 0 5.8 1.2 7.8 3.2 2 2 3.2 4.8 3.2 7.8s-1.2 5.8-3.2 7.8l1.7 1.7c2.4-2.4 3.9-5.8 3.9-9.5 0-3.6-1.5-7-3.9-9.4z" />
    </svg>
  );
}

function OpenAILogo({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 2a4 4 0 0 1 3.8 2.7l.2.8v3.5a1 1 0 0 0 .5.9l3 1.7a4 4 0 0 1 1.9 4.3 4 4 0 0 1-2.9 3.1l-.8.1h-4a1 1 0 0 0-1 .5l-1.7 3a4 4 0 0 1-4.3 1.9 4 4 0 0 1-3.1-2.9l-.1-.8v-3.5a1 1 0 0 0-.5-.9l-3-1.7a4 4 0 0 1-1.9-4.3 4 4 0 0 1 2.9-3.1l.8-.1h4a1 1 0 0 0 1-.5l1.7-3A4 4 0 0 1 12 2z" />
      <path d="M9.5 9.5l5 5" />
    </svg>
  );
}

function GeminiLogo({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 24c0-6.627-5.373-12-12-12 6.627 0 12-5.373 12-12 0 6.627 5.373 12 12 12-6.627 0-12 5.373-12 12z" />
    </svg>
  );
}

function ClaudeLogo({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13.7 2.4l-4.5 19.2h3.6l4.5-19.2h-3.6zm-7.9 7.2L2 21.6h3.4l1.3-4.5h4.6l.7 4.5h3.4L11 9.6H5.8zm2.1 4.5l1.4-4.8 1.4 4.8H7.9z" />
    </svg>
  );
}

interface SidebarNavProps {
  onOpenByom: () => void;
}

function SidebarNav({ onOpenByom }: SidebarNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentMode = searchParams.get('mode');

  const navItems = [
    { label: 'AI Agent', icon: Bot, path: '/search?mode=agent', id: 'agent' },
    { label: 'Semantic Search', icon: Search, path: '/search?mode=search', id: 'search' },
    { label: 'Settings', icon: Settings, path: '/settings', id: 'settings' },
  ];

  return (
    <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
      <div className="space-y-1.5">
        {navItems.map((item) => {
          let isActive = false;
          if (item.id === 'search') {
            isActive = (pathname === '/search' || pathname === '/') && currentMode === 'search';
          } else if (item.id === 'agent') {
            isActive = (pathname === '/search' || pathname === '/') && currentMode !== 'search';
          } else {
            isActive = pathname.startsWith(item.path);
          }

          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.path}
              className={`relative flex items-center px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'text-primary bg-primary/10 shadow-elevation-1 font-semibold pl-4'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeNavIndicator"
                  className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-primary rounded-r-full"
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                />
              )}
              <Icon className={`w-4 h-4 mr-3 transition-colors ${isActive ? 'text-primary' : 'text-on-surface-variant'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="pt-2 border-t border-outline-variant/30 space-y-2">
        <div className="flex items-center justify-between px-2">
          <span className="text-[11px] font-mono text-on-surface-variant font-bold uppercase tracking-wider">
            BYOM Models
          </span>
          <button
            type="button"
            onClick={onOpenByom}
            className="text-[10px] font-mono font-bold text-primary hover:underline"
          >
            Manage
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenByom}
          className="w-full p-3 rounded-2xl bg-surface-container border border-outline-variant/40 hover:border-primary/50 text-left transition-all group shadow-elevation-1 space-y-2.5"
          title="Configure API keys for Nvidia NIM, OpenAI, Google Gemini, OpenRouter"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs text-on-surface group-hover:text-primary transition-colors">
              <Key className="w-3.5 h-3.5 text-primary" />
              <span>Bring Your Own</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
          </div>

          <div className="grid grid-cols-2 gap-1.5 pt-0.5">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-surface text-[11px] font-semibold text-emerald-500 border border-emerald-500/20">
              <NvidiaLogo className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span className="truncate">NVIDIA</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-surface text-[11px] font-semibold text-cyan-500 border border-cyan-500/20">
              <GeminiLogo className="w-3.5 h-3.5 text-cyan-500 flex-shrink-0" />
              <span className="truncate">Gemini</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-surface text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <OpenAILogo className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="truncate">ChatGPT</span>
            </div>

            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-surface text-[11px] font-semibold text-amber-500 border border-amber-500/20">
              <ClaudeLogo className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span className="truncate">Claude</span>
            </div>
          </div>
        </button>
      </div>
    </nav>
  );
}

export default function Sidebar() {
  const [isByomModalOpen, setIsByomModalOpen] = useState(false);

  return (
    <aside className="w-[230px] h-screen sticky top-0 flex flex-col bg-surface-container-low border-r border-outline-variant/40 flex-shrink-0 z-20 select-none">
      <div className="h-16 flex items-center justify-between px-5 border-b border-outline-variant/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shadow-elevation-1">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="font-display font-bold text-base tracking-tight text-on-surface">
            Reshidual
          </span>
        </div>
      </div>

      <Suspense fallback={<div className="flex-1" />}>
        <SidebarNav onOpenByom={() => setIsByomModalOpen(true)} />
      </Suspense>

      <div className="p-3.5 mt-auto border-t border-outline-variant/30 space-y-2.5">
        <div className="px-3 py-2.5 bg-surface rounded-2xl border border-outline-variant/30 space-y-1 shadow-elevation-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-1.5 font-bold text-on-surface">
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              <span>Moss Engine</span>
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Sub-10ms
            </span>
          </div>
          <p className="text-[11px] text-on-surface-variant font-sans leading-tight">
            Local-first retrieval without a cloud vector database.
          </p>
        </div>

        <div className="flex items-center justify-between px-3 py-2 bg-surface-container/70 rounded-xl text-xs font-mono text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-primary" />
            <span>Ollama Core</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            <span className="text-[11px] font-semibold text-on-surface">On-Device</span>
          </div>
        </div>
      </div>

      <BYOMModal
        isOpen={isByomModalOpen}
        onClose={() => setIsByomModalOpen(false)}
      />
    </aside>
  );
}
