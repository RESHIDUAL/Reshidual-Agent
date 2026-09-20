'use client';

import React from 'react';
import { Slider } from '@/components/ui/Slider';

interface AlphaBlendSliderProps {
  value: number;
  onChange: (val: number) => void;
}

export function AlphaBlendSlider({ value, onChange }: AlphaBlendSliderProps) {
  return (
    <div className="px-4 py-2 flex items-center gap-4 w-full">
      <span className="text-sm font-medium text-on-surface-variant w-16 text-right">Keyword</span>
      <div className="flex-1">
        <Slider
          value={value}
          min={0}
          max={1}
          step={0.01}
          onChange={onChange}
        />
      </div>
      <span className="text-sm font-medium text-primary w-16">Semantic</span>
      <div className="bg-surface-container-high px-2 py-1 rounded text-xs font-mono text-on-surface-variant">
        α = {value.toFixed(2)}
      </div>
    </div>
  );
}