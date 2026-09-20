import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Button, ButtonProps } from './Button';

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ButtonProps & { label: string };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={clsx("flex flex-col items-center justify-center p-8 text-center", className)}
    >
      <div className="text-[var(--md-sys-color-outline)] mb-4">
        {React.cloneElement(icon as React.ReactElement, { size: 48, strokeWidth: 1.5 })}
      </div>
      <h3 className="text-xl font-medium text-[var(--md-sys-color-on-surface)] mb-2">
        {title}
      </h3>
      <p className="text-sm text-[var(--md-sys-color-on-surface-variant)] max-w-sm mb-6">
        {description}
      </p>
      {action && (
        <Button {...action}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}