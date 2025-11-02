"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const EDITOR_URL = "/editor";

export default function HomePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || hasRedirectedRef.current) {
      return;
    }

    if (isSignedIn) {
      // User is authenticated - redirect to editor
      hasRedirectedRef.current = true;
      router.replace(EDITOR_URL);
      return;
    }

    // User is not authenticated - redirect to local sign-in page
    // which will redirect to Clerk Account Portal
    hasRedirectedRef.current = true;
    router.push("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center text-text">
        <div>Loading...</div>
      </div>
    </div>
  );
}
