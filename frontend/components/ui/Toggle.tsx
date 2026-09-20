import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Check } from 'lucide-react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ checked, onChange, label, disabled, className }: ToggleProps) {
  return (
    <label className={clsx("flex items-center gap-3", disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer", className)}>
      {label && <span className="text-sm font-medium text-[var(--md-sys-color-on-surface)]">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={clsx(
          "relative w-12 h-7 rounded-full transition-colors flex items-center px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2",
          checked ? "bg-[var(--md-sys-color-primary)]" : "bg-[var(--md-sys-color-surface-container-highest)]"
        )}
      >
        <motion.div
          initial={false}
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={clsx(
            "w-5 h-5 rounded-full flex items-center justify-center shadow-sm",
            checked ? "bg-[var(--md-sys-color-on-primary)]" : "bg-[var(--md-sys-color-outline)]"
          )}
        >
          {checked && <Check className="w-3 h-3 text-[var(--md-sys-color-primary)]" />}
        </motion.div>
      </button>
    </label>
  );
}