'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function WhyMatched({ explanation }: { explanation: string }) {
  const [expanded, setExpanded] = useState(false);

  const highlightText = (text: string) => {
    return text.split(/(`[^`]+`|'[^']+')/g).map((part, i) => {
      if (part.startsWith('`') || part.startsWith("'")) {
        return <span key={i} className="text-primary font-medium">{part.replace(/[`']/g, '')}</span>;
      }
      return part;
    });
  };

  return (
    <div className="border border-outline-variant rounded-lg overflow-hidden bg-surface-container-low">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2 text-xs font-medium text-on-surface-variant hover:bg-surface-variant/50 transition-colors"
      >
        <div className="flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Why this matched?</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-1 text-sm text-on-surface border-t border-outline-variant/50">
              {highlightText(explanation)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}