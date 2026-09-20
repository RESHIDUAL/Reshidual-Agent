'use client';

import React from 'react';
import { Slider } from '@/components/ui/Slider';

interface AlphaDefaultProps {
  value: number;
  onChange: (val: number) => void;
}

export function AlphaDefault({ value, onChange }: AlphaDefaultProps) {

  const sliderValue = Math.round(value * 100);

  const handleSliderChange = (newVal: number) => {
    onChange(newVal / 100);
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-md3-title-medium text-md-sys-color-on-surface">Default Search Balance (Alpha)</h4>
        <p className="text-md3-body-medium text-md-sys-color-on-surface-variant mt-1">
          Set the default balance between keyword and semantic search.
          Current: <span className="font-mono text-md-sys-color-primary font-bold">{value.toFixed(2)}</span>
        </p>
      </div>

      <div className="px-2 pt-6">
        <Slider
          value={sliderValue}
          min={0}
          max={100}
          step={1}
          onChange={handleSliderChange}
          leftLabel="Keyword (0.0)"
          rightLabel="Semantic (1.0)"
        />
      </div>
    </div>
  );
}