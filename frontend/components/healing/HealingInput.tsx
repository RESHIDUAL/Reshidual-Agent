'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { VoiceCapture } from '@/components/search/VoiceCapture';
import { Wrench } from 'lucide-react';

interface HealingInputProps {
  onStart: (issue: string) => void;
  disabled: boolean;
}

export function HealingInput({ onStart, disabled }: HealingInputProps) {
  const [val, setVal] = useState('');

  return (
    <Card className="p-4 flex flex-col gap-4">
      <div className="relative">
        <textarea
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Describe the bug or issue to self-heal..."
          className="w-full min-h-[100px] p-4 bg-surface-container rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-y text-on-surface pr-16"
          disabled={disabled}
        />
        <div className="absolute top-2 right-2">
          <VoiceCapture onTranscription={(t) => setVal(prev => prev + (prev ? ' ' : '') + t)} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button
          onClick={() => onStart(val)}
          disabled={disabled || !val.trim()}
          className="gap-2"
        >
          <Wrench className="w-4 h-4" />
          Start Healing
        </Button>
      </div>
    </Card>
  );
}