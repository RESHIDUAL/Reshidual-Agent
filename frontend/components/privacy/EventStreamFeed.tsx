'use client';

import React, { useRef, useEffect, useState } from 'react';
import { LedgerEvent } from '@/lib/api/types';
import { ShieldAlert, Pause, Play, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatTimestamp } from '@/lib/utils/formatters';

interface EventStreamFeedProps {
  events: LedgerEvent[];
  isConnected: boolean;
  onEventClick?: (id: string, type: string) => void;
}

export function EventStreamFeed({ events, isConnected, onEventClick }: EventStreamFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  const getBadgeColor = (type: string) => {
    if (type === 'moss_sync') return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-semibold';
    if (type === 'unexpected_connection') return 'bg-error/20 text-error border-error/50 font-bold animate-pulse';
    if (type.startsWith('engine_')) return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
    if (type.startsWith('ingest_')) return 'bg-purple-500/20 text-purple-500 border-purple-500/30';
    if (type === 'query_executed') return 'bg-success/20 text-success border-success/30';
    if (type.startsWith('heal_')) return 'bg-amber-500/20 text-amber-500 border-amber-500/30';
    if (type === 'integrity_check') return 'bg-teal-500/20 text-teal-500 border-teal-500/30';
    if (type === 'network_activity') return 'bg-error/20 text-error border-error/50 font-bold';
    if (type === 'secret_detected') return 'bg-orange-500/20 text-orange-500 border-orange-500/30 cursor-pointer hover:bg-orange-500/30';
    return 'bg-surface-variant text-on-surface-variant border-outline';
  };

  return (
    <div className="flex flex-col h-full bg-surface-container rounded-lg border border-outline overflow-hidden">
      <div className="p-3 border-b border-outline bg-surface-container-high flex justify-between items-center text-sm">
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-success" />
          ) : (
            <WifiOff className="w-4 h-4 text-error" />
          )}
          <span className={isConnected ? 'text-success' : 'text-error font-medium'}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className="flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface"
        >
          {autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {autoScroll ? 'Pause' : 'Resume'}
        </button>
      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        <AnimatePresence initial={false}>
          {events.map((event, idx) => (
            <motion.div
              key={event.id || `${event.timestamp}-${idx}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 text-sm cursor-pointer hover:bg-surface-container-high p-1.5 rounded transition-colors"
              onClick={() => onEventClick && onEventClick(event.id || `${event.timestamp}`, event.event_type)}
            >
              <div className="text-xs text-on-surface-variant font-mono whitespace-nowrap mt-1">
                {formatTimestamp(event.timestamp)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded border text-xs font-mono ${getBadgeColor(event.event_type)}`}>
                    {event.event_type}
                  </span>
                  {event.event_type === 'secret_detected' && (
                    <ShieldAlert className="w-4 h-4 text-orange-500 animate-pulse" />
                  )}
                  {event.event_type === 'moss_sync' && (
                    <span className="text-[11px] text-cyan-400 font-medium">
                      Cloud Sync: {event.payload?.documents_count || 0} docs &rarr; {event.payload?.destination_host || 'api.usemoss.dev'}
                    </span>
                  )}
                  {event.event_type === 'unexpected_connection' && (
                    <span className="text-[11px] text-error font-bold">
                      UNEXPECTED OUTBOUND: {event.payload?.remote_ip}:{event.payload?.remote_port}
                    </span>
                  )}
                </div>
                <div className="text-on-surface truncate cursor-pointer hover:whitespace-normal hover:bg-surface-variant/50 p-1 rounded font-mono text-xs">
                  {JSON.stringify(event.payload)}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}