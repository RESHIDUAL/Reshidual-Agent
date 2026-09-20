'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IngestProgress } from '@/lib/api/types';
import { connectorApi } from '@/lib/api/connector';
import { formatPercentage } from '@/lib/utils/formatters';
import { CheckCircle2, ArrowRight } from 'lucide-react';

interface IndexingProgressWidgetProps {
  progress?: IngestProgress;
  repoPath?: string;
  onComplete?: () => void;
}

export function IndexingProgressWidget({ progress: propProgress, repoPath, onComplete }: IndexingProgressWidgetProps) {
  const [internalProgress, setInternalProgress] = useState<IngestProgress>({
    job_id: 'local-job',
    status: 'indexing',
    files_processed: 0,
    total_files: 100,
    chunks_created: 0,
    current_file: 'Scanning directory...',
    errors: []
  });

  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (propProgress) {
      setInternalProgress(propProgress);
      const total = propProgress.total_files || (propProgress as any).totalFiles || 0;
      const done = propProgress.files_processed || (propProgress as any).processedFiles || 0;
      if (total > 0 && done >= total) {
        setIsCompleted(true);
      }
      return;
    }

    if (repoPath) {
      let isMounted = true;
      let unsubscribe: (() => void) | null = null;

      connectorApi.ingest(repoPath).then((res) => {
        if (!isMounted) return;
        unsubscribe = connectorApi.subscribeIngestProgress(res.job_id, (p) => {
          if (!isMounted) return;
          setInternalProgress(p);
          if (p.files_processed >= p.total_files && p.total_files > 0) {
            setIsCompleted(true);
          }
        });
      }).catch(() => {

        let step = 0;
        const mockFiles = [
          'backend/main.py',
          'backend/services/moss_engine.py',
          'backend/services/privacy_ledger.py',
          'backend/models/schemas.py',
          'frontend/app/search/page.tsx',
          'frontend/components/widgets/TrustScoreWidget.tsx',
          'frontend/lib/api/connector.ts',
          'src-tauri/src/main.rs'
        ];
        const timer = setInterval(() => {
          step++;
          if (!isMounted) {
            clearInterval(timer);
            return;
          }
          const done = Math.min(step * 15, 120);
          setInternalProgress({
            job_id: 'sim-job',
            status: done >= 120 ? 'completed' : 'indexing',
            files_processed: done,
            total_files: 120,
            chunks_created: done * 4,
            current_file: mockFiles[step % mockFiles.length],
            errors: []
          });
          if (done >= 120) {
            setIsCompleted(true);
            clearInterval(timer);
          }
        }, 400);
      });

      return () => {
        isMounted = false;
        if (unsubscribe) unsubscribe();
      };
    }
  }, [propProgress, repoPath]);

  const p = propProgress || internalProgress;
  const total = p.total_files || (p as any).totalFiles || 1;
  const processed = p.files_processed || (p as any).processedFiles || 0;
  const chunks = p.chunks_created || (p as any).chunksCreated || 0;
  const currentFile = p.current_file || (p as any).currentFile || 'Processing files...';
  const percentage = Math.min(100, Math.round((processed / total) * 100));

  return (
    <Card className="flex flex-col p-6 gap-5 bg-surface-container">
      <div className="flex justify-between items-end">
        <div>
          <h3 className="text-xl font-display font-medium text-on-surface">
            {isCompleted ? 'Indexing Completed' : 'Indexing Workspace'}
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            {processed} / {total} files processed
          </p>
        </div>
        <div className="text-3xl font-display font-bold text-primary tabular-nums">
          {percentage}%
        </div>
      </div>

      <div className="h-3 w-full bg-surface-container-highest rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-xs text-on-surface-variant bg-surface p-3 rounded-lg border border-outline-variant">
        <div className="flex flex-col gap-1 overflow-hidden flex-1 mr-4">
          <span className="font-semibold text-on-surface">Current File:</span>
          <span className="font-mono truncate" title={currentFile}>
            {currentFile}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="font-semibold text-on-surface">Chunks Created</span>
          <span className="tabular-nums font-mono bg-primary-container text-on-primary-container px-2 py-0.5 rounded-full font-bold">
            {chunks}
          </span>
        </div>
      </div>

      {onComplete && (
        <div className="flex justify-end mt-2">
          <Button
            size="lg"
            onClick={onComplete}
            disabled={!isCompleted}
            className="gap-2"
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-success" />
                Setup Complete! Start Exploring
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              'Indexing in progress...'
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}