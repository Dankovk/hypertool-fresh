import "./globals.css";
import { Toaster } from "sonner";
import type { ReactNode } from "react";

export const metadata = {
  title: "Studio | Fresh Breeze",
  description: "AI chat + live preview",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

