'use client';

/**
 * Test route that throws an error for E2E testing
 * Only available in development/test environments
 */

import { useEffect, useState } from 'react';

export default function TestErrorPage() {
  const [shouldThrow, setShouldThrow] = useState(false);

  useEffect(() => {
    // Only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      window.location.href = '/';
    }
  }, []);

  if (shouldThrow) {
    throw new Error('Test error for error boundary E2E testing');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">
          Error Boundary Test Page
        </h1>
        <p className="mb-6 text-gray-600">
          This page is used to test error boundaries in E2E tests.
        </p>
        <button
          onClick={() => setShouldThrow(true)}
          className="w-full rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          data-testid="trigger-error-button"
        >
          Trigger Error
        </button>
      </div>
    </div>
  );
}
