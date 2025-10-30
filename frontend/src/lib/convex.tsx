"use client";

import { ConvexProvider, useConvex, useQuery, useMutation } from "convex/react";
import { ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import type { Api } from "../../convex/_generated/api";

// Initialize Convex client
// In production, this should come from environment variable
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";

if (!CONVEX_URL) {
  console.warn("⚠️  NEXT_PUBLIC_CONVEX_URL environment variable is not set");
}

const convex = new ConvexReactClient<Api>(CONVEX_URL);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

export { useConvex, useQuery, useMutation };

