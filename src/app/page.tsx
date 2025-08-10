'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '~/contexts/AuthContext';
import { Sparkles } from 'lucide-react';
import { api } from '~/trpc/react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Load rooms from database
  const { data: rooms } = api.post.getRooms.useQuery();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);
  
  // Redirect to default channel when rooms load
  useEffect(() => {
    if (rooms && rooms.length > 0 && user) {
      const generalRoom = rooms.find(r => r.name === 'general');
      if (generalRoom) {
        router.replace(`/r/${generalRoom.name}`);
      } else if (rooms[0]) {
        // Fallback to first room if no general room
        router.replace(`/r/${rooms[0].name}`);
      }
    }
  }, [rooms, user, router]);

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