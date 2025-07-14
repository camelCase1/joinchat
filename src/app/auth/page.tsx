'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '~/contexts/AuthContext';
import { LoginForm } from '~/components/auth/LoginForm';
import { SignupForm } from '~/components/auth/SignupForm';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [guestLoading, setGuestLoading] = useState(false);
  const { user, loading, guestLogin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || guestLoading) {
    return (
      <div className="min-h-screen auth-container flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return null; // Will redirect
  }

  async function handleGuestLogin() {
    setGuestLoading(true);
    try {
      await guestLogin();
      router.push('/');
    } finally {
      setGuestLoading(false);
    }
  }

  return (
    <div className="min-h-screen auth-container flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-800 mb-2 text-shadow">
              Join.Chat
            </h1>
            <p className="text-gray-600 text-lg">Connect through meaningful conversations</p>
          </div>
        </div>
        {isLogin ? (
          <LoginForm onToggleMode={() => setIsLogin(false)} />
        ) : (
          <SignupForm onToggleMode={() => setIsLogin(true)} />
        )}
        <div className="mt-6 flex flex-col items-center">
          <button
            onClick={handleGuestLogin}
            className="btn btn-secondary w-full h-12 text-lg font-semibold mt-2"
            disabled={guestLoading}
          >
            {guestLoading ? 'Logging in as Guest...' : 'Login as Guest'}
          </button>
          <span className="text-xs text-gray-500 mt-2">Read-only access</span>
        </div>
      </div>
    </div>
  );
}