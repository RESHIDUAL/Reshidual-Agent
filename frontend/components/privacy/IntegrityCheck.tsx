'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { verifyIntegrity } from '@/lib/api/connector';
import { Shield, CheckCircle2, XCircle } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

type Status = 'unchecked' | 'checking' | 'passed' | 'failed';

export function IntegrityCheck() {
  const [status, setStatus] = useState<Status>('unchecked');
  const [chainLength, setChainLength] = useState<number>(0);
  const [lastHash, setLastHash] = useState<string>('');

  const handleVerify = async () => {
    setStatus('checking');
    try {
      const res = await verifyIntegrity();
      if (res.valid) {
        setStatus('passed');
        setChainLength(res.chain_length ?? (res as any).chainLength ?? 0);
        setLastHash(res.last_hash || (res as any).lastHash || '');
      } else {
        setStatus('failed');
      }
    } catch (e) {
      console.error(e);
      setStatus('failed');
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6 border-b border-md-sys-color-outline-variant pb-4">
        <div className="p-2 bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container rounded-md3-sm">
          <Shield className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-md3-title-large text-md-sys-color-on-surface">Hash-Chain Integrity</h3>
          <p className="text-md3-body-medium text-md-sys-color-on-surface-variant">Cryptographic verification of privacy logs</p>
        </div>
      </div>

      <div className="min-h-[120px] flex flex-col items-center justify-center bg-md-sys-color-surface-container rounded-md3-md p-6 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {status === 'unchecked' && (
            <motion.div
              key="unchecked"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-4"
            >
              <Button onClick={handleVerify} variant="filled">
                Verify Integrity
              </Button>
            </motion.div>
          )}

          {status === 'checking' && (
            <motion.div
              key="checking"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <LoadingState text="Verifying hash chain..." />
            </motion.div>
          )}

          {status === 'passed' && (
            <motion.div
              key="passed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
              <h4 className="text-md3-title-medium text-green-600 dark:text-green-400">Chain Verified </h4>
              <div className="text-md3-body-small text-md-sys-color-on-surface-variant font-mono bg-md-sys-color-surface-container-highest px-3 py-2 rounded-md3-xs">
                Length: {chainLength} blocks<br/>
                Last: {lastHash.substring(0, 16)}...
              </div>
              <Button onClick={handleVerify} variant="text" size="sm" className="mt-2">
                Re-check
              </Button>
            </motion.div>
          )}

          {status === 'failed' && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center gap-3 text-center"
            >
              <XCircle className="w-12 h-12 text-md-sys-color-error mb-2" />
              <h4 className="text-md3-title-medium text-md-sys-color-error">Chain Broken!</h4>
              <p className="text-md3-body-small text-md-sys-color-on-surface-variant">The integrity of the ledger has been compromised.</p>
              <Button onClick={handleVerify} variant="tonal" size="sm" className="mt-2 text-md-sys-color-error">
                Retry Verification
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}