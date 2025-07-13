'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { RoomList } from '~/components/chat/RoomList';
import { ChatRoom } from '~/components/chat/ChatRoom';
import { RecentChatsSidebar } from '~/components/chat/RecentChatsSidebar';
import { ConnectionStatus } from '~/components/debug/ConnectionStatus';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { user, loading } = useAuth();
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen">
      {currentRoomId ? (
        <div className="flex h-screen">
          <RecentChatsSidebar 
            currentRoomId={currentRoomId}
            onJoinRoom={setCurrentRoomId}
            onReturnToLobby={() => setCurrentRoomId(null)}
          />
          <div className="flex-1">
            <ChatRoom 
              roomId={currentRoomId} 
              onLeaveRoom={() => setCurrentRoomId(null)} 
            />
          </div>
        </div>
      ) : (
        <RoomList onJoinRoom={setCurrentRoomId} />
      )}
      
      <ConnectionStatus />
    </div>
  );
}
