import { useState, useCallback, useEffect, useRef } from 'react';
import { connectorApi } from '../api/connector';
import { SearchResults } from '../api/types';

export function useQuery() {
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [alpha, setAlpha] = useState(0.5);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [sourceType, setSourceType] = useState<string>('all');
  const [lastQuery, setLastQuery] = useState('');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const executeSearch = useCallback(async (
    text: string,
    searchAlpha: number,
    modelToUse?: string,
    sourceToUse?: string
  ) => {
    if (!text.trim()) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastQuery(text);

    try {
      const res = await connectorApi.query(
        text,
        searchAlpha,
        undefined,
        modelToUse || (selectedModel || undefined),
        sourceToUse || (sourceType || undefined)
      );
      setResults(res);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Search failed'));
    } finally {
      setIsLoading(false);
    }
  }, [selectedModel, sourceType]);

  const search = useCallback((text: string, overrideAlpha?: number, overrideModel?: string, overrideSource?: string) => {
    executeSearch(
      text,
      overrideAlpha ?? alpha,
      overrideModel ?? selectedModel,
      overrideSource ?? sourceType
    );
  }, [alpha, selectedModel, sourceType, executeSearch]);

  const clearResults = useCallback(() => {
    setResults(null);
    setLastQuery('');
    setError(null);
  }, []);

  useEffect(() => {
    if (lastQuery) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        executeSearch(lastQuery, alpha, selectedModel, sourceType);
      }, 300);
    }

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [alpha, selectedModel, sourceType, lastQuery, executeSearch]);

  return {
    results,
    isLoading,
    error,
    alpha,
    selectedModel,
    sourceType,
    search,
    setAlpha,
    setSelectedModel,
    setSourceType,
    clearResults
  };
}