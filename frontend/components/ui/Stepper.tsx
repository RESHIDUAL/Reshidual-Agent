import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export type StepStatus = 'pending' | 'active' | 'completed' | 'failed';

export interface Step {
  label: string;
  description?: string;
  status: StepStatus;
}

export interface StepperProps {
  steps: Step[];
  className?: string;
}

export function Stepper({ steps, className }: StepperProps) {
  return (
    <div className={clsx("flex flex-col", className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const isActive = step.status === 'active';
        const isCompleted = step.status === 'completed';
        const isFailed = step.status === 'failed';
        const isPending = step.status === 'pending';

        return (
          <div key={index} className="flex relative">
            <div className="flex flex-col items-center mr-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={clsx(
                  "w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0",
                  isActive && "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-[0_0_0_4px_rgba(var(--md-sys-color-primary-rgb),0.2)]",
                  isCompleted && "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]",
                  isFailed && "bg-[var(--md-sys-color-error)] text-[var(--md-sys-color-on-error)]",
                  isPending && "bg-[var(--md-sys-color-surface-container-highest)] text-[var(--md-sys-color-outline)]"
                )}
              >
                {isActive && <Loader2 className="w-4 h-4 animate-spin" />}
                {isCompleted && <Check className="w-4 h-4" />}
                {isFailed && <X className="w-4 h-4" />}
                {isPending && <span className="w-2 h-2 rounded-full bg-current opacity-50" />}
              </motion.div>
              {!isLast && (
                <div
                  className={clsx(
                    "w-0.5 h-full min-h-[32px] mt-2 mb-2",
                    isCompleted ? "bg-[var(--md-sys-color-primary)]" : "bg-[var(--md-sys-color-surface-container-highest)] border-dashed border-l-2 border-transparent"
                  )}
                />
              )}
            </div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className={clsx("pb-6", isLast && "pb-0")}
            >
              <div className={clsx(
                "text-sm font-medium",
                isActive && "text-[var(--md-sys-color-primary)] font-bold",
                isCompleted && "text-[var(--md-sys-color-on-surface)]",
                isFailed && "text-[var(--md-sys-color-error)]",
                isPending && "text-[var(--md-sys-color-on-surface-variant)] opacity-70"
              )}>
                {step.label}
              </div>
              {step.description && (
                <div className={clsx(
                  "text-xs mt-1",
                  isFailed ? "text-[var(--md-sys-color-error)]" : "text-[var(--md-sys-color-on-surface-variant)]"
                )}>
                  {step.description}
                </div>
              )}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}