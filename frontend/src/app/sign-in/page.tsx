"use client";

import { useEffect } from 'react';
import { getClerkSignInUrl } from '@/lib/clerkUrls';

export default function SignInRedirectPage() {
  useEffect(() => {
    // Redirect to Clerk Account Portal sign-in page
    // Uses CLERK_FRONTEND_API_URL from environment variables
    const editorRedirect = typeof window !== 'undefined'
      ? `${window.location.origin}/editor`
      : 'http://localhost:3030/editor';
    
    const accountPortalUrl = getClerkSignInUrl(editorRedirect);
    window.location.href = accountPortalUrl;
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center text-text">
        <div>Redirecting to sign in...</div>
      </div>
    </div>
  );
}
