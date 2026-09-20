import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export interface GaugeProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  sublabel?: string;
  colorScheme?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

export function Gauge({
  value,
  size = 'md',
  label,
  sublabel,
  colorScheme,
  className
}: GaugeProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  const sizeMap = {
    sm: { width: 120, strokeWidth: 8 },
    md: { width: 160, strokeWidth: 12 },
    lg: { width: 200, strokeWidth: 16 }
  };

  const { width, strokeWidth } = sizeMap[size];
  const center = width / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  const arcLength = (260 / 360) * circumference;
  const offset = circumference - (normalizedValue / 100) * arcLength;

  const rotation = 140;

  let colorClass = "stroke-[var(--md-sys-color-primary)]";
  if (colorScheme) {
    if (colorScheme === 'success') colorClass = "stroke-[var(--md-sys-color-primary)]";
    if (colorScheme === 'warning') colorClass = "stroke-yellow-500";
    if (colorScheme === 'error') colorClass = "stroke-[var(--md-sys-color-error)]";
  } else {
    if (normalizedValue > 80) colorClass = "stroke-[var(--md-sys-color-primary)]";
    else if (normalizedValue > 50) colorClass = "stroke-yellow-500";
    else colorClass = "stroke-[var(--md-sys-color-error)]";
  }

  return (
    <div className={clsx("flex flex-col items-center justify-center relative", className)} style={{ width, height: width }}>
      <svg width={width} height={width} viewBox={`0 0 ${width} ${width}`} className="transform rotate-[140deg]">
        {}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--md-sys-color-surface-container-highest)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        {}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          className={colorClass}
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (normalizedValue / 100) * arcLength }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>

      <div className="absolute flex flex-col items-center justify-center pointer-events-none mt-4">
        <span className={clsx("font-bold text-[var(--md-sys-color-on-surface)]",
          size === 'sm' ? "text-2xl" : size === 'md' ? "text-4xl" : "text-5xl"
        )}>
          {normalizedValue}
        </span>
        {label && <span className="text-sm font-medium text-[var(--md-sys-color-on-surface-variant)]">{label}</span>}
        {sublabel && <span className="text-xs text-[var(--md-sys-color-on-surface-variant)] opacity-80">{sublabel}</span>}
      </div>
    </div>
  );
}