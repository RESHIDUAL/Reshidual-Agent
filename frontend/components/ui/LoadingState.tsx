import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface LoadingStateProps {
  type?: 'skeleton' | 'spinner' | 'dots' | 'pulse';
  className?: string;
  lines?: number;
  text?: string;
}

export function LoadingState({ type = 'spinner', className, lines = 3, text }: LoadingStateProps) {
  if (type === 'skeleton') {
    return (
      <div className={clsx("flex flex-col gap-2 w-full", className)}>
        {Array.from({ length: lines }).map((_, i) => (
          <motion.div
            key={i}
            className="h-4 bg-[var(--md-sys-color-surface-container-highest)] rounded"
            style={{ width: i === lines - 1 ? '70%' : '100%' }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    );
  }

  if (type === 'dots') {
    return (
      <div className={clsx("flex flex-col items-center gap-2", className)}>
        <div className="flex gap-1 items-center justify-center">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-[var(--md-sys-color-primary)]"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
        {text && <span className="text-xs text-on-surface-variant font-medium">{text}</span>}
      </div>
    );
  }

  if (type === 'pulse') {
    return (
      <div className={clsx("flex flex-col items-center gap-2", className)}>
        <div className="relative flex items-center justify-center w-8 h-8">
          <motion.div
            className="absolute w-full h-full rounded-full bg-[var(--md-sys-color-primary)] opacity-20"
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="w-1/2 h-1/2 rounded-full bg-[var(--md-sys-color-primary)]" />
        </div>
        {text && <span className="text-xs text-on-surface-variant font-medium">{text}</span>}
      </div>
    );
  }

  return (
    <div className={clsx("flex flex-col items-center justify-center gap-2", className)}>
      <Loader2 className="w-6 h-6 animate-spin text-[var(--md-sys-color-primary)]" />
      {text && <span className="text-xs text-on-surface-variant font-medium">{text}</span>}
    </div>
  );
}