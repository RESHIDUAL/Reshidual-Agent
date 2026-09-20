'use client';

import React from 'react';
import { Stepper, StepStatus } from '@/components/ui/Stepper';
import { HealingStep } from '@/lib/hooks/useHealing';

export function HealingStepper({ steps }: { steps: HealingStep[] }) {
  const mappedSteps = steps.map(s => ({
    label: s.step,
    description: s.detail || (s.status === 'active' ? 'In progress...' : s.status === 'completed' ? 'Completed' : s.status === 'failed' ? 'Failed' : ''),
    status: (s.status === 'active' || s.status === 'completed' || s.status === 'failed' ? s.status : 'pending') as StepStatus,
  }));

  return (
    <div className="bg-surface-container rounded-lg p-6 border border-outline">
      <h3 className="font-medium mb-6 text-lg">Execution Pipeline</h3>
      <Stepper steps={mappedSteps} />
    </div>
  );
}