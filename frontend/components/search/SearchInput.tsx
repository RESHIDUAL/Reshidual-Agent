'use client';

import React, { useRef, useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { VoiceCapture } from './VoiceCapture';
import { motion } from 'framer-motion';

interface SearchInputProps {
  onSearch: (query: string) => void;
}

export function SearchInput({ onSearch }: SearchInputProps) {
  const [val, setVal] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (val.trim()) {
      onSearch(val.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <motion.div
      className={`relative flex items-center p-2 bg-surface-container-high rounded-[2rem] border-2 transition-colors ${isFocused ? 'border-primary' : 'border-transparent'}`}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="pl-4 pr-2 text-on-surface-variant">
        <Search className="w-6 h-6" />
      </div>

      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything about your codebase..."
        className="flex-1 bg-transparent border-none outline-none text-lg text-on-surface placeholder:text-on-surface-variant/50 py-3"
      />

      <div className="flex items-center gap-2 pr-2">
        <VoiceCapture onTranscription={(text) => {
          setVal(text);
          onSearch(text);
        }} />

        <button
          onClick={handleSubmit}
          disabled={!val.trim()}
          className="p-3 bg-primary text-on-primary rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}