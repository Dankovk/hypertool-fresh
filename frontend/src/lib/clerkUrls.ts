/**
 * Get the Account Portal base URL from environment variables
 * Account Portal uses accounts.dev domain (not clerk.accounts.dev)
 * 
 * Uses NEXT_PUBLIC_CLERK_FRONTEND_API_URL or CLERK_FRONTEND_API_URL
 * Note: For client-side access, use NEXT_PUBLIC_ prefix in your .env.local
 */
function getAccountPortalBaseUrl(): string {
  // Use explicit Account Portal URL if provided
  if (process.env.NEXT_PUBLIC_CLERK_ACCOUNT_PORTAL_URL) {
    return process.env.NEXT_PUBLIC_CLERK_ACCOUNT_PORTAL_URL;
  }

  // Derive from CLERK_FRONTEND_API_URL (e.g., https://secure-wasp-61.clerk.accounts.dev)
  // Try NEXT_PUBLIC_ prefix first (for client-side), then without prefix
  const frontendApiUrl = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL || 
                         (typeof window === 'undefined' ? process.env.CLERK_FRONTEND_API_URL : undefined);
  
  if (frontendApiUrl) {
    // Convert clerk.accounts.dev to accounts.dev for Account Portal
    // Account Portal URLs use accounts.dev, not clerk.accounts.dev
    const accountPortalUrl = frontendApiUrl.replace('.clerk.accounts.dev', '.accounts.dev');
    return accountPortalUrl;
  }

  // Fallback (shouldn't happen if env vars are set)
  return "https://secure-wasp-61.accounts.dev";
}

/**
 * Get Clerk Account Portal sign-in URL
 * Account Portal pages are hosted on Clerk's servers
 */
export function getClerkSignInUrl(redirectUrl?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || 
                  `${getAccountPortalBaseUrl()}/sign-in`;
  
  if (redirectUrl) {
    return `${baseUrl}?redirect_url=http://localhost:3030/billing`;
  }
  
  return baseUrl;
}

/**
 * Get Clerk Account Portal sign-up URL
 * Account Portal pages are hosted on Clerk's servers
 */
export function getClerkSignUpUrl(redirectUrl?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || 
                  `${getAccountPortalBaseUrl()}/sign-up`;
  
  if (redirectUrl) {
    return `${baseUrl}?redirect_url=http://localhost:3030/billing`;
  }
  
  return baseUrl;
}

/**
 * Get Clerk Account Portal user profile URL
 */
export function getClerkUserProfileUrl(): string {
  return process.env.NEXT_PUBLIC_CLERK_USER_PROFILE_URL ||
         `${getAccountPortalBaseUrl()}/user`;
}

