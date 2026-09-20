'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { clsx } from 'clsx';
import { Mic, Activity, ChevronDown } from 'lucide-react';

interface LiveKitConfigProps {
  port?: number;
  micDevice?: string;
  onPortChange?: (port: number) => void;
  onChangePort?: (port: number) => void;
  onMicDeviceChange?: (device: string) => void;
}

export function LiveKitConfig({
  port = 7880,
  micDevice = 'default',
  onPortChange,
  onChangePort,
  onMicDeviceChange
}: LiveKitConfigProps) {
  const triggerPortChange = (p: number) => {
    if (onPortChange) onPortChange(p);
    if (onChangePort) onChangePort(p);
  };
  const [devices, setDevices] = useState<{deviceId: string, label: string}[]>([]);
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    async function fetchDevices() {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices.filter(d => d.kind === 'audioinput');
        setDevices(audioInputs);
      } catch (e) {
        console.error('Failed to get media devices', e);
        setDevices([{ deviceId: 'default', label: 'Default Microphone (Permission Denied)' }]);
      }
    }
    fetchDevices();
  }, []);

  return (
    <Card className="p-6 flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-outline-variant/50 pb-4">
        <div>
          <h3 className="text-base font-semibold text-on-surface">LiveKit Backend</h3>
          <p className="text-xs text-on-surface-variant">Configure voice agent connection</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full border border-outline-variant/40">
          <div className={clsx("w-2.5 h-2.5 rounded-full animate-pulse", isConnected ? "bg-emerald-500" : "bg-red-500")} />
          <span className="text-xs font-mono font-medium text-on-surface">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> WebSocket Port
          </label>
          <input
            type="number"
            value={port}
            onChange={(e) => triggerPortChange(Number(e.target.value))}
            className="w-full px-4 py-3 bg-surface-container border border-outline-variant/60 rounded-xl text-sm font-mono text-on-surface focus:border-primary focus:outline-none transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-on-surface flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" /> Microphone Input
          </label>
          <div className="relative">
            <select
              value={micDevice}
              onChange={(e) => onMicDeviceChange && onMicDeviceChange(e.target.value)}
              className="w-full px-4 py-3 pr-10 bg-surface-container border border-outline-variant/60 rounded-xl text-sm font-sans text-on-surface focus:border-primary focus:outline-none transition-colors appearance-none cursor-pointer"
            >
              <option value="default" className="bg-surface-container text-on-surface">System Default</option>
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId} className="bg-surface-container text-on-surface">
                  {d.label || `Microphone (${d.deviceId.slice(0,5)}...)`}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-on-surface-variant absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>
    </Card>
  );
}