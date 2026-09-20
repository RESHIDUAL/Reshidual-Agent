'use client';

import React from 'react';
import { SearchResult } from '@/lib/api/types';
import { WhyMatched } from './WhyMatched';
import { FileCode, FileText, Globe, Table } from 'lucide-react';
import { motion } from 'framer-motion';
import { itemVariants } from '@/lib/utils/animations';

interface ResultCardProps {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
}

export function ResultCard({ result, isSelected, onClick }: ResultCardProps) {
  const semPercent = result.blended_score > 0 ? (result.semantic_score / result.blended_score) * 100 : 50;
  const sourceType = result.source_type || 'codebase';

  const getSourceIcon = () => {
    if (sourceType === 'document') {
      if (result.file_path.endsWith('.xlsx') || result.file_path.endsWith('.xls') || result.file_path.endsWith('.csv')) {
        return <Table className="w-4 h-4 text-emerald-500" />;
      }
      return <FileText className="w-4 h-4 text-amber-500" />;
    }
    if (sourceType === 'browser_tab') {
      return <Globe className="w-4 h-4 text-sky-500" />;
    }
    return <FileCode className="w-4 h-4 text-primary" />;
  };

  const getSourceBadge = () => {
    if (sourceType === 'document') {
      return (
        <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-semibold">
          Document
        </span>
      );
    }
    if (sourceType === 'browser_tab') {
      return (
        <span className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-semibold">
          Web Tab
        </span>
      );
    }
    return (
      <span className="bg-primary/10 text-primary border border-primary/30 text-[10px] px-2 py-0.5 rounded-full font-mono uppercase font-semibold">
        Codebase
      </span>
    );
  };

  return (
    <motion.div
      variants={itemVariants}
      onClick={onClick}
      className={`cursor-pointer transition-all duration-200 rounded-xl border ${
        isSelected
          ? 'bg-primary-container/30 border-primary shadow-md'
          : 'bg-surface-container border-outline-variant hover:border-primary/50 hover:shadow-sm'
      }`}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {getSourceIcon()}
            <span className="font-mono text-sm font-medium text-on-surface truncate">
              {result.file_path}
            </span>
            {getSourceBadge()}
            <span className="bg-surface-container-high text-on-surface-variant text-[11px] px-2 py-0.5 rounded-full font-mono whitespace-nowrap">
              L{result.start_line ?? 1}-L{result.end_line ?? 1}
            </span>
          </div>

          <div className="bg-surface-container-high px-2.5 py-1 rounded text-xs font-mono font-bold text-on-surface border border-outline-variant/30">
            Score: {result.blended_score.toFixed(3)}
          </div>
        </div>

        {result.symbol_name && (
          <div className="text-xs font-mono text-primary font-medium">
            {result.symbol_type ? `${result.symbol_type}: ` : ''}{result.symbol_name}
          </div>
        )}

        <div className="bg-surface rounded-md p-3 font-mono text-xs text-on-surface overflow-x-auto whitespace-pre-wrap max-h-48 border border-outline-variant/30">
          {result.content || result.content_snippet}
        </div>

        <div className="flex flex-col gap-1.5 mt-1">
          <div className="flex justify-between text-[11px] text-on-surface-variant font-mono">
            <span>Semantic: {result.semantic_score.toFixed(3)}</span>
            <span>Keyword: {result.keyword_score.toFixed(3)}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden flex">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, semPercent))}%` }}
            />
          </div>
        </div>

        {result.why_matched && (
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            <WhyMatched explanation={result.why_matched} />
          </div>
        )}
      </div>
    </motion.div>
  );
}