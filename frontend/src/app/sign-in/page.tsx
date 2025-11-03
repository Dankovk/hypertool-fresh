"use client";

import { useEffect } from 'react';
import { getClerkSignInUrl } from '@/lib/clerkUrls';

export default function SignInRedirectPage() {
  useEffect(() => {
    // Redirect to Clerk Account Portal sign-in page
    // Uses CLERK_FRONTEND_API_URL from environment variables
    const editorRedirect = typeof window !== 'undefined'
      ? `${window.location.origin}/editor`
      : `${process.env.NEXT_PUBLIC_SITE_URL}/editor`;
    
    const accountPortalUrl = getClerkSignInUrl(editorRedirect);
    window.location.href = accountPortalUrl;
  }, [process.env.NEXT_PUBLIC_SITE_URL]);

  return null;
}
