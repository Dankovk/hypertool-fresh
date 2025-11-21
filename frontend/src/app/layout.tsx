import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ConvexClientProviderWrapper } from '@/components/ConvexClientProviderWrapper';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AccountPortalLinks } from '@/components/AccountPortalLinks';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Fresh Breeze',
  description: 'AI-powered code editor with live preview',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <div className="flex min-h-screen flex-col bg-background text-text">
            <main className="flex-1">
              <ConvexClientProviderWrapper>
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
              </ConvexClientProviderWrapper>
            </main>
          </div>
          <div className="fixed bottom-4 right-4 z-50">
            <AccountPortalLinks />
          </div>
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}