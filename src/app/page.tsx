'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '~/contexts/AuthContext';
import { ChannelSidebar } from '~/components/chat/ChannelSidebar';
import { ModernChatRoom } from '~/components/chat/ModernChatRoom';
import { Button } from '~/components/ui/button';
import { Sparkles } from 'lucide-react';
import { api } from '~/trpc/react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [currentChannelId, setCurrentChannelId] = useState<string>('');
  const [currentChannelName, setCurrentChannelName] = useState<string>('');
  const [currentDMUserId, setCurrentDMUserId] = useState<string | null>(null);
  
  // Load rooms from database
  const { data: rooms } = api.post.getRooms.useQuery();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);
  
  // Set default channel to general when rooms load
  useEffect(() => {
    if (rooms && rooms.length > 0 && !currentChannelId) {
      const generalRoom = rooms.find(r => r.name === 'general');
      if (generalRoom) {
        setCurrentChannelId(generalRoom.id);
        setCurrentChannelName(generalRoom.name);
      } else if (rooms[0]) {
        // Fallback to first room if no general room
        setCurrentChannelId(rooms[0].id);
        setCurrentChannelName(rooms[0].name);
      }
    }
  }, [rooms, currentChannelId]);

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

  const handleSelectChannel = (channelId: string) => {
    setCurrentChannelId(channelId);
    setCurrentDMUserId(null);
    
    // Find the channel name from rooms data
    if (rooms) {
      const selectedRoom = rooms.find(r => r.id === channelId);
      if (selectedRoom) {
        setCurrentChannelName(selectedRoom.name);
      }
    }
  };

  const handleSelectDM = (userId: string) => {
    setCurrentDMUserId(userId);
    setCurrentChannelId('');
  };

  return (
    <div className="flex h-screen bg-background">
      <ChannelSidebar
        currentChannelId={currentChannelId}
        onSelectChannel={handleSelectChannel}
        onSelectDM={handleSelectDM}
      />
      
      {currentChannelId && (
        <ModernChatRoom
          channelId={currentChannelId}
          channelName={currentChannelName}
        />
      )}
      
      {currentDMUserId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="p-4 gradient-bg rounded-2xl inline-block">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Direct Messages</h2>
            <p className="text-muted-foreground">DM functionality coming soon!</p>
          </div>
        </div>
      )}
      
      {!currentChannelId && !currentDMUserId && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="p-4 gradient-bg rounded-2xl inline-block">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Welcome to ever.chat</h2>
            <p className="text-muted-foreground">Select a channel to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}