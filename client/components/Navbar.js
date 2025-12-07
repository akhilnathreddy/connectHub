'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { clearAuth, getUser } from '../lib/auth';
import { getImageUrl } from '../lib/api';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const handleLogout = () => {
    clearAuth();
    router.push('/');
  };

  if (!user) {
    return null;
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6">
            <Link href="/feed" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              ConnectHub
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/feed"
                className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Feed
              </Link>
              <Link
                href={`/profile/${user.id}`}
                className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Profile
              </Link>
              <Link
                href="/friends"
                className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                Friends
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {user.avatar ? (
                <img
                  src={getImageUrl(user.avatar)}
                  alt={user.name || user.email}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="hidden sm:block text-gray-700 dark:text-gray-300 text-sm">
                {user.name || user.email}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

