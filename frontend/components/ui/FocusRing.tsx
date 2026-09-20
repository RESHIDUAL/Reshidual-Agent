import React, { ReactNode } from 'react';
import clsx from 'clsx';

export interface FocusRingProps {
  children: ReactNode;
  className?: string;
}

export function FocusRing({ children, className }: FocusRingProps) {
  return (
    <div className={clsx("focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--md-sys-color-primary)] focus-within:ring-offset-2 rounded-sm", className)}>
      {children}
    </div>
  );
}