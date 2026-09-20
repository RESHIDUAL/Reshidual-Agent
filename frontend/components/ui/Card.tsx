import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'filled' | 'outlined' | 'elevated';
  interactive?: boolean;
  children: ReactNode;
}

export function Card({
  variant = 'filled',
  interactive = false,
  children,
  className,
  onClick,
  ...props
}: CardProps) {
  const baseClasses = "p-5 rounded-[16px] transition-shadow";

  const variantClasses = {
    filled: "bg-[var(--md-sys-color-surface-container)]",
    outlined: "bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline-variant)]",
    elevated: "bg-[var(--md-sys-color-surface-container-low)] shadow-md"
  };

  const interactiveClasses = interactive ? "cursor-pointer hover:shadow-lg hover:after:bg-[var(--md-sys-color-on-surface)]/8 relative overflow-hidden after:content-[''] after:absolute after:inset-0 after:transition-colors after:pointer-events-none" : "";

  const Component = interactive ? motion.div : 'div';
  const motionProps = interactive ? { whileTap: { scale: 0.98 }, transition: { type: 'spring', stiffness: 400, damping: 25 } } : {};

  return (
    <Component
      className={clsx(baseClasses, variantClasses[variant], interactiveClasses, className)}
      onClick={onClick}
      {...motionProps}
      {...props as any}
    >
      {children}
    </Component>
  );
}