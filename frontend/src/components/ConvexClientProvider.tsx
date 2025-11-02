'use client';

import { ReactNode, useCallback, useEffect } from 'react';
import { ConvexReactClient } from 'convex/react';
import { ConvexProviderWithAuth } from 'convex/react';
import { useAuth } from '@clerk/nextjs';

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useClerkConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}

function useClerkConvexAuth() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const fetchAccessToken = useCallback(async () => {
    if (!isLoaded) {
      console.log('[Convex Auth] Clerk not loaded yet');
      return null;
    }

    if (!isSignedIn) {
      console.log('[Convex Auth] User not signed in');
      return null;
    }

    try {
      console.log('[Convex Auth] Attempting to fetch token with "convex" template...');
      const tokenFromTemplate = await getToken({ template: 'convex' });
      if (tokenFromTemplate) {
        console.log('[Convex Auth] ✅ Successfully fetched token with "convex" template');
        return tokenFromTemplate;
      }
      console.warn('[Convex Auth] Token with "convex" template returned null');
    } catch (error) {
      console.warn('[Convex Auth] Failed to fetch Clerk token using "convex" template, falling back to default token.', error);
    }

    try {
      console.log('[Convex Auth] Attempting to fetch default token...');
      const fallbackToken = await getToken();
      if (fallbackToken) {
        console.log('[Convex Auth] ✅ Successfully fetched default token');
        return fallbackToken;
      }
      console.warn('[Convex Auth] Default token returned null');
      return null;
    } catch (error) {
      console.error('[Convex Auth] ❌ Failed to fetch Clerk token for Convex auth.', error);
      return null;
    }
  }, [getToken, isLoaded, isSignedIn]);

  const authState = {
    isLoading: !isLoaded,
    isAuthenticated: !!isSignedIn,
    fetchAccessToken,
  };

  // Debug logging
  useEffect(() => {
    if (isLoaded) {
      console.log('[Convex Auth] State updated:', {
        isLoaded,
        isSignedIn,
        isAuthenticated: authState.isAuthenticated,
        isLoading: authState.isLoading,
      });
    }
  }, [isLoaded, isSignedIn, authState.isAuthenticated, authState.isLoading]);

  return authState;
}