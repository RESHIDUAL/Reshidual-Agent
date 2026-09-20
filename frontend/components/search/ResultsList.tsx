'use client';

import React from 'react';
import { SearchResult } from '@/lib/api/types';
import { ResultCard } from './ResultCard';
import { motion } from 'framer-motion';
import { containerVariants } from '@/lib/utils/animations';

interface ResultsListProps {
  results: SearchResult[];
  onSelectResult: (id: string) => void;
  selectedId: string | null;
}

export function ResultsList({ results, onSelectResult, selectedId }: ResultsListProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4 text-sm text-on-surface-variant px-2">
        <span>Found {results.length} matches</span>
        <span>Rendered in 12ms</span> {}
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4 pb-4"
      >
        {results.map((result, idx) => {
          const resultId = result.chunk_id || result.id || `res-${idx}`;
          return (
            <ResultCard
              key={resultId}
              result={result}
              isSelected={selectedId === resultId}
              onClick={() => onSelectResult(resultId)}
            />
          );
        })}
      </motion.div>
    </div>
  );
}