'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log critical global error
    logger.error('Critical global error occurred', error, {
      digest: error.digest,
      route: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      type: 'global-error',
    });
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
          <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-lg">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-red-100 p-3">
                <svg
                  className="h-8 w-8 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            <h1 className="mb-2 text-center text-2xl font-bold text-gray-900">
              Critical Error
            </h1>

            <p className="mb-6 text-center text-gray-600">
              A critical error occurred. Our team has been notified. Please try refreshing the page.
            </p>

            {process.env.NODE_ENV === 'development' && (
              <details className="mb-4 rounded-md bg-red-50 p-4">
                <summary className="cursor-pointer text-sm font-medium text-red-900">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 space-y-2">
                  <p className="text-xs text-red-800">
                    <strong>Error:</strong> {error.message}
                  </p>
                  {error.digest && (
                    <p className="text-xs text-red-800">
                      <strong>Digest:</strong> {error.digest}
                    </p>
                  )}
                  {error.stack && (
                    <pre className="mt-2 overflow-auto text-xs text-red-700">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try again
              </button>
              <a
                href="/"
                className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Go home
              </a>
            </div>

            {error.digest && (
              <p className="mt-4 text-center text-xs text-gray-500">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
