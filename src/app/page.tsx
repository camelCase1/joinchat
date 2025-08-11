'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '~/contexts/AuthContext';
import { Sparkles } from 'lucide-react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);
  
  // Redirect to chat page when user is authenticated
  useEffect(() => {
    if (!loading && user) {
      router.replace('/chat');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="p-3 gradient-bg rounded-2xl animate-pulse-soft">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
          <p className="text-muted-foreground">Loading ever.chat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <div className="p-3 gradient-bg rounded-2xl animate-pulse-soft">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <p className="text-muted-foreground">Redirecting to chat...</p>
      </div>
    </div>
  );
}