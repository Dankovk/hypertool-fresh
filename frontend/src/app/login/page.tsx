"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    // Redirect authenticated users to editor
    if (!isLoading && isAuthenticated) {
      router.push("/editor");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-text">Loading...</div>
        </div>
      </div>
    );
  }

  // Login page for unauthenticated users
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="max-w-2xl text-center">
        <h1 className="mb-4 text-4xl font-bold text-text">Fresh Breeze</h1>
        <p className="mb-8 text-lg text-text/80">
          AI-powered code editor with live preview
        </p>
        <SignedOut>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/sign-in"
              className="rounded bg-primary px-6 py-3 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="rounded border border-border px-6 py-3 text-text transition-colors hover:bg-accent"
            >
              Sign Up
            </Link>
          </div>
        </SignedOut>
        <SignedIn>
          <div className="flex flex-col items-center gap-4">
            <UserButton afterSignOutUrl="/" />
            <button
              onClick={() => router.push('/editor')}
              className="rounded bg-primary px-6 py-3 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to Editor
            </button>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}

