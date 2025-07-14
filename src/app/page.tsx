'use client';

import { useState, useEffect, useCallback } from 'react';
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

  // Add to recent chats when joining a room
  const handleJoinRoom = useCallback((roomId: string) => {
    setCurrentRoomId(roomId);
    // Add to recent chats in localStorage
    if (typeof window !== 'undefined') {
      const existingChats = JSON.parse(localStorage.getItem('recentChats') || '[]');
      const chatIndex = existingChats.findIndex((chat: { roomId: string }) => chat.roomId === roomId);
      const chatData = {
        roomId,
        roomName: '', // Room name will be updated by sidebar fetch
        lastMessageTime: new Date().toISOString(),
        lastMessage: ''
      };
      if (chatIndex >= 0) {
        existingChats[chatIndex] = { ...existingChats[chatIndex], ...chatData };
      } else {
        existingChats.unshift(chatData);
      }
      const recentChats = existingChats.slice(0, 10);
      localStorage.setItem('recentChats', JSON.stringify(recentChats));
    }
  }, []);

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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - always visible */}
      <div className="flex-shrink-0 h-screen overflow-y-auto">
        <RecentChatsSidebar 
          currentRoomId={currentRoomId}
          onJoinRoom={handleJoinRoom}
          onReturnToLobby={() => setCurrentRoomId(null)}
        />
      </div>
      {/* Main content */}
      <div className="flex-1 min-w-0 h-screen overflow-y-auto">
        {currentRoomId ? (
          <ChatRoom 
            key={currentRoomId}
            roomId={currentRoomId} 
            onLeaveRoom={() => setCurrentRoomId(null)} 
          />
        ) : (
          <RoomList onJoinRoom={handleJoinRoom} />
        )}
      </div>
      <ConnectionStatus />
    </div>
  );
}
