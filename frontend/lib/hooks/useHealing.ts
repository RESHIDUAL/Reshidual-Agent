import { useState, useCallback, useRef } from 'react';
import { connectorApi } from '../api/connector';
import { HealStep, HealResult, HealAttempt } from '../api/types';

export type HealingStep = HealStep;
export type FailedAttempt = HealAttempt;

export function useHealing() {
  const [steps, setSteps] = useState<HealStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [currentOutput, setCurrentOutput] = useState<string>('');
  const [result, setResult] = useState<HealResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cleanupSseRef = useRef<(() => void) | null>(null);

  const startHealing = useCallback(async (issue: string, sessionId?: string) => {
    setIsRunning(true);
    setSteps([]);
    setCurrentStep('');
    setCurrentOutput('');
    setResult(null);
    setError(null);

    const activeSession = sessionId || crypto.randomUUID();

    cleanupSseRef.current = connectorApi.subscribeHealProgress(activeSession, (step: HealStep) => {
      setSteps(prev => {
        const existing = prev.findIndex(s => s.step === step.step);
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = step;
          return next;
        }
        return [...prev, step];
      });
      if (step.status === 'active' || step.status === 'failed') {
        setCurrentStep(step.step);
      }
      if (step.detail) {
        setCurrentOutput(step.detail);
      }
    });

    try {
      const finalResult = await connectorApi.executeHeal(issue, activeSession);
      setResult(finalResult);
      if (finalResult.steps && finalResult.steps.length > 0) {
        setSteps(finalResult.steps);
      }
      if (finalResult.final_diff) {
        setCurrentOutput('Healing complete! Review the proposed diff.');
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Healing failed'));
    } finally {
      setIsRunning(false);
      if (cleanupSseRef.current) {
        cleanupSseRef.current();
        cleanupSseRef.current = null;
      }
    }
  }, []);

  const acceptResult = useCallback(() => {
    setResult(null);
    setSteps([]);
    setCurrentOutput('');
  }, []);

  const rejectResult = useCallback(() => {
    setResult(null);
    setSteps([]);
    setCurrentOutput('');
  }, []);

  const reset = useCallback(() => {
    setSteps([]);
    setCurrentStep('');
    setCurrentOutput('');
    setResult(null);
    setError(null);
    setIsRunning(false);
    if (cleanupSseRef.current) {
      cleanupSseRef.current();
      cleanupSseRef.current = null;
    }
  }, []);

  const failedAttempts: HealAttempt[] = result?.attempts?.filter(a => !a.success) || [];
  const finalDiff = result?.final_diff || '';

  return {
    steps,
    currentStep,
    currentOutput,
    result,
    isRunning,
    isHealing: isRunning,
    failedAttempts,
    finalDiff,
    error,
    startHealing,
    acceptResult,
    rejectResult,
    acceptDiff: acceptResult,
    rejectDiff: rejectResult,
    reset
  };
}