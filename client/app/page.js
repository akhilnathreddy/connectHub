import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex min-h-screen w-full max-w-4xl flex-col items-center justify-center px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to <span className="text-indigo-600 dark:text-indigo-400">ConnectHub</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            Connect with friends, share your thoughts, and build your community
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/login"
            className="flex h-14 w-full items-center justify-center rounded-lg bg-indigo-600 px-8 text-base font-semibold text-white transition-colors hover:bg-indigo-700 sm:w-auto"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="flex h-14 w-full items-center justify-center rounded-lg border-2 border-indigo-600 px-8 text-base font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-900/20 sm:w-auto"
          >
            Sign Up
          </Link>
        </div>
      </main>
    </div>
  );
}
