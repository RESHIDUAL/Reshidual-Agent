'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    router.replace('/search');
  }, [router]);

  if (!mounted) return null;

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="animate-pulse-soft text-on-surface-variant">
        Initializing Workspace...
      </div>
    </div>
  );
}