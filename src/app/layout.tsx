import "./globals.css";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { ReactNode } from "react";

export const metadata = {
  title: "Studio | Fresh Breeze",
  description: "AI chat + live preview",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-text">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

