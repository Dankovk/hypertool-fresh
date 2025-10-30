import { ConvexHttpClient } from "convex/browser";
import type { Api } from "../../convex/_generated/api";

// Initialize Convex client
// The CONVEX_URL should be set as an environment variable
const CONVEX_URL = process.env.CONVEX_URL || "";

if (!CONVEX_URL) {
  console.warn("⚠️  CONVEX_URL environment variable is not set");
}

export const convexClient = new ConvexHttpClient<Api>(CONVEX_URL);

