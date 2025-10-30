import "./globals.css";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ConvexClientProvider } from "@/lib/convex";
import type { ReactNode } from "react";

export const metadata = {
  title: "Studio | Fresh Breeze",
  description: "AI chat + live preview",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-text">
        <ConvexClientProvider>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </ConvexClientProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

