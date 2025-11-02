"use client";

import Link from 'next/link';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export function AccountPortalLinks() {
  return (
    <div className="flex items-center gap-3">
      <SignedOut>
        <Link
          href="/sign-in"
          className="rounded border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          Sign In
        </Link>
        <Link
          href="/sign-up"
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign Up
        </Link>
      </SignedOut>
      <SignedIn>
        <UserButton 
          afterSignOutUrl="/"
          userProfileMode="modal"
          appearance={{
            variables: {
              colorPrimary: '#2563eb',
            },
          }}
        />
      </SignedIn>
    </div>
  );
}

