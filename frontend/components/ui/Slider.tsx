import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import clsx from 'clsx';

export interface SliderProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  leftLabel?: string;
  rightLabel?: string;
  className?: string;
}

export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  showValue,
  leftLabel,
  rightLabel,
  className
}: SliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updateValue(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updateValue(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const updateValue = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    let newValue = min + percent * (max - min);

    newValue = Math.round(newValue / step) * step;
    onChange(newValue);
  };

  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className={clsx("flex flex-col gap-2 w-full", className)}>
      {label && <span className="text-sm font-medium text-[var(--md-sys-color-on-surface)]">{label}</span>}

      <div
        className="relative h-6 flex items-center cursor-pointer select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div ref={trackRef} className="absolute w-full h-1 bg-[var(--md-sys-color-surface-container-highest)] rounded-full">
          <div
            className="absolute h-full bg-[var(--md-sys-color-primary)] rounded-full"
            style={{ width: `${percent}%` }}
          />
        </div>

        <motion.div
          className="absolute w-5 h-5 bg-[var(--md-sys-color-primary)] rounded-full shadow-md z-10 -ml-2.5 flex items-center justify-center"
          style={{ left: `${percent}%` }}
          animate={{ scale: isDragging ? 1.2 : 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          {showValue && isDragging && (
            <div className="absolute -top-8 bg-[var(--md-sys-color-inverse-surface)] text-[var(--md-sys-color-inverse-on-surface)] text-xs px-2 py-1 rounded">
              {value.toFixed(2)}
            </div>
          )}
        </motion.div>
      </div>

      {(leftLabel || rightLabel) && (
        <div className="flex justify-between text-xs text-[var(--md-sys-color-on-surface-variant)]">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      )}
    </div>
  );
}