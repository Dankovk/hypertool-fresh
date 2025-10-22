"use client";
import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen items-center justify-center bg-background p-4">
          <div className="max-w-md rounded-2xl border border-border bg-surface p-6 shadow-brand">
            <h2 className="mb-2 text-xl font-semibold text-accent">Something went wrong</h2>
            <p className="mb-4 text-sm text-text-secondary">
              An error occurred while rendering this component. Please refresh the page to try again.
            </p>
            {this.state.error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-text-secondary hover:text-text">
                  Error details
                </summary>
                <pre className="mt-2 overflow-auto rounded bg-black/20 p-2 text-xs text-text-secondary">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              className="rounded-lg bg-accent px-4 py-2 text-sm text-background transition hover:bg-accent-2"
              onClick={() => {
                  if (window && typeof window !== "undefined") {
                      window.location.reload()
                  }
              }}
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
