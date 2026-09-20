import React, { ReactNode } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children' | 'size'> {
  variant?: 'filled' | 'outlined' | 'text' | 'tonal' | 'elevated';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  variant = 'filled',
  size = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = "relative inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--md-sys-color-primary)] focus-visible:ring-offset-2 overflow-hidden";

  const sizeClasses = {
    sm: "h-[32px] px-3 text-sm",
    md: "h-[40px] px-4 text-sm",
    lg: "h-[48px] px-6 text-base"
  };

  const roundedClasses = (variant === 'filled' || variant === 'tonal') ? "rounded-[20px]" : "rounded-[20px]";

  const variantClasses = {
    filled: "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:after:bg-white/8 active:after:bg-white/12",
    outlined: "border border-[var(--md-sys-color-outline-variant)] text-[var(--md-sys-color-primary)] hover:after:bg-[var(--md-sys-color-primary)]/8 active:after:bg-[var(--md-sys-color-primary)]/12",
    text: "text-[var(--md-sys-color-primary)] hover:after:bg-[var(--md-sys-color-primary)]/8 active:after:bg-[var(--md-sys-color-primary)]/12",
    tonal: "bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:after:bg-[var(--md-sys-color-on-secondary-container)]/8 active:after:bg-[var(--md-sys-color-on-secondary-container)]/12",
    elevated: "bg-[var(--md-sys-color-surface-container-low)] shadow text-[var(--md-sys-color-primary)] hover:after:bg-[var(--md-sys-color-primary)]/8 active:after:bg-[var(--md-sys-color-primary)]/12"
  };

  const stateLayerClasses = "after:content-[''] after:absolute after:inset-0 after:transition-colors after:pointer-events-none";

  const disabledClasses = "opacity-[0.38] pointer-events-none";

  return (
    <motion.button
      whileTap={!disabled && !loading ? { scale: 0.96 } : {}}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={clsx(
        baseClasses,
        sizeClasses[size],
        roundedClasses,
        variantClasses[variant],
        stateLayerClasses,
        (disabled || loading) && disabledClasses,
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!loading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </motion.button>
  );
}