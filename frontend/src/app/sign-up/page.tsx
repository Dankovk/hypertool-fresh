"use client";

import { useEffect } from 'react';
import { getClerkSignUpUrl } from '@/lib/clerkUrls';

export default function SignUpRedirectPage() {
  useEffect(() => {
    // Redirect to Clerk Account Portal sign-up page
    // Uses CLERK_FRONTEND_API_URL from environment variables
    
    
    const accountPortalUrl = getClerkSignUpUrl('/editor');
    window.location.href = accountPortalUrl;
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center text-text">
        <div>Redirecting to sign up...</div>
      </div>
    </div>
  );
}
