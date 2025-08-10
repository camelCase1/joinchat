'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '~/contexts/AuthContext';
import { ChannelSidebar } from '~/components/chat/ChannelSidebar';
import { ModernChatRoom } from '~/components/chat/ModernChatRoom';
import { Button } from '~/components/ui/button';
import { Sparkles } from 'lucide-react';
import { api } from '~/trpc/react';

export default function ChannelPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const channelName = params.channel as string;
  const [currentChannelId, setCurrentChannelId] = useState<string>('');
  const [currentDMUserId, setCurrentDMUserId] = useState<string | null>(null);
  
  // Load rooms from database
  const { data: rooms } = api.post.getRooms.useQuery();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);
  
  // Find channel by name and set current channel
  useEffect(() => {
    if (rooms && channelName) {
      const room = rooms.find(r => r.name === channelName);
      if (room) {
        setCurrentChannelId(room.id);
      } else {
        // Channel not found, redirect to general or first available channel
        const generalRoom = rooms.find(r => r.name === 'general');
        if (generalRoom) {
          router.replace(`/r/${generalRoom.name}`);
        } else if (rooms[0]) {
          router.replace(`/r/${rooms[0].name}`);
        }
      }
    }
  }, [rooms, channelName, router]);

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
    setCurrentDMUserId(null);
    
    // Find the channel name from rooms data and navigate to it
    if (rooms) {
      const selectedRoom = rooms.find(r => r.id === channelId);
      if (selectedRoom) {
        router.push(`/r/${selectedRoom.name}`);
      }
    }
  };

  const handleSelectDM = (userId: string) => {
    setCurrentDMUserId(userId);
    setCurrentChannelId('');
    // TODO: Implement DM routing when DM feature is added
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
          channelName={channelName}
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