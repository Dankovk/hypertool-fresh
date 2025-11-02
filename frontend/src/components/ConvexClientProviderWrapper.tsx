'use client';

import dynamic from 'next/dynamic';
import { ReactNode, Suspense } from 'react';

// Dynamically import ConvexClientProvider with SSR disabled to prevent server-side useAccessToken calls
import { ConvexClientProvider } from '@/components/ConvexClientProvider';
export function ConvexClientProviderWrapper({ children }: { children: ReactNode }) {
  return (
    
      <ConvexClientProvider>{children}</ConvexClientProvider>
    
  );
}

