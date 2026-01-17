import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-blue-100 p-3">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        <h1 className="mb-2 text-6xl font-bold text-gray-900">404</h1>

        <h2 className="mb-2 text-2xl font-semibold text-gray-800">
          Page Not Found
        </h2>

        <p className="mb-6 text-gray-600">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. It may have been moved or deleted.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Go Home
          </Link>
          <Link
            href="/courses"
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Browse Courses
          </Link>
        </div>
      </div>
    </div>
  );
}
