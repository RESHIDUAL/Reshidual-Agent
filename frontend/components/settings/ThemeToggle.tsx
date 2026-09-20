'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { clsx } from 'clsx';

type ThemeOption = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options: { id: ThemeOption; icon: React.ReactNode; label: string }[] = [
    { id: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
    { id: 'system', icon: <Monitor className="w-4 h-4" />, label: 'System' },
    { id: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
  ];

  return (
    <div className="flex items-center bg-md-sys-color-surface-container rounded-full p-1 w-fit relative">
      {options.map((option) => {
        const isActive = theme === option.id;
        return (
          <button
            key={option.id}
            onClick={() => setTheme(option.id)}
            className={clsx(
              "relative z-10 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-md3-label-large transition-colors",
              isActive ? "text-md-sys-color-on-primary" : "text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface hover:bg-md-sys-color-surface-container-highest"
            )}
            aria-label={`Switch to ${option.label} theme`}
          >
            {isActive && (
              <motion.div
                layoutId="theme-indicator"
                className="absolute inset-0 bg-md-sys-color-primary rounded-full z-[-1]"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {option.icon}
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}