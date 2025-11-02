"use client";

import { useEffect } from "react";

export function ExternalRedirect({ url }: { url: string }) {
  useEffect(() => {
    window.location.href = url;
  }, [url]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center text-text">
        <div>Redirecting...</div>
      </div>
    </div>
  );
}

