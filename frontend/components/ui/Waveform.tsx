import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

export interface WaveformProps {
  isActive?: boolean;
  audioLevel?: number;
  levels?: number[];
  color?: string;
  barCount?: number;
  className?: string;
}

export function Waveform({ isActive = true, audioLevel = 0, levels, color, barCount = 24, className }: WaveformProps) {
  const bars = Array.from({ length: barCount });
  const effectiveLevel = levels && levels.length > 0 ? levels[0] : audioLevel;

  return (
    <div className={clsx("flex items-center justify-center gap-[2px] h-12 w-full", className)}>
      {bars.map((_, i) => {

        const randomFactor = isActive ? Math.random() * 0.5 + 0.5 : 0;
        const normalizedLevel = isActive ? Math.max(0.1, effectiveLevel * randomFactor) : 0.1;

        const position = i / barCount;
        const curve = Math.sin(position * Math.PI);
        const finalScaleY = isActive ? Math.max(0.1, normalizedLevel * curve * 2) : 0.1;

        return (
          <motion.div
            key={i}
            className={clsx(
              "w-1 rounded-full",
              isActive ? "bg-[var(--md-sys-color-primary)]" : "bg-[var(--md-sys-color-outline-variant)]"
            )}
            initial={{ scaleY: 0.1 }}
            animate={{ scaleY: finalScaleY }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              mass: 0.5
            }}
            style={{
              height: '100%',
              transformOrigin: 'center'
            }}
          />
        );
      })}
    </div>
  );
}