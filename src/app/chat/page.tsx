'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '~/contexts/AuthContext';
import { ChannelSidebar } from '~/components/chat/ChannelSidebar';
import { Sparkles } from 'lucide-react';
import { api } from '~/trpc/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { useToast } from '~/hooks/use-toast';

export default function ChatPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [currentDMUserId, setCurrentDMUserId] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');
  
  // Load rooms from database
  const { data: rooms, refetch: refetchRooms } = api.post.getRooms.useQuery();
  
  // Create room mutation
  const createRoomMutation = api.post.createRoom.useMutation({
    onSuccess: async (newRoom) => {
      // First auto-join the created channel
      if (user?.uid) {
        await joinRoomMutation.mutateAsync({
          roomId: newRoom.id,
          userId: user.uid,
          userName: user.displayName || undefined,
          userEmail: user.email || undefined
        });
      }
      
      // Refetch rooms to update the lists
      await refetchRooms();
      
      // Clear form and close dialog
      setShowCreateDialog(false);
      setNewChannelName('');
      setNewChannelDescription('');
      setNewChannelTopic('');
      
      toast({
        title: "Channel created",
        description: `Successfully created #${newRoom.name}`,
      });
      
      // Navigate to the new channel after everything is updated
      setTimeout(() => {
        router.push(`/r/${newRoom.name}`);
      }, 100);
    },
    onError: (error) => {
      toast({
        title: "Error creating channel",
        description: error.message || "Failed to create channel",
        variant: "destructive",
      });
    }
  });
  
  // Join room mutation for auto-join after creation
  const joinRoomMutation = api.post.joinRoom.useMutation();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth');
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
  };

  const handleCreateChannel = (prefillName?: string) => {
    if (prefillName) {
      setNewChannelName(prefillName);
    }
    setShowCreateDialog(true);
  };

  const handleSubmitCreateChannel = async () => {
    if (!newChannelName.trim() || !user?.uid) return;
    
    // The mutation will handle joining and navigation
    await createRoomMutation.mutateAsync({
      name: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
      description: newChannelDescription.trim() || undefined,
      topic: newChannelTopic.trim() || undefined,
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <ChannelSidebar
        currentChannelId={null}
        onSelectChannel={handleSelectChannel}
        onSelectDM={handleSelectDM}
        onCreateChannel={handleCreateChannel}
      />
      
      {currentDMUserId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="p-4 gradient-bg rounded-2xl inline-block">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Direct Messages</h2>
            <p className="text-muted-foreground">DM functionality coming soon!</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md">
            <div className="p-4 gradient-bg rounded-2xl inline-block">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Welcome to ever.chat</h1>
            <p className="text-muted-foreground text-lg">
              Select a channel from the sidebar to start chatting
            </p>
            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                Join topic-based conversations in small, focused rooms of up to 30 people
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Create Channel Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a new channel</DialogTitle>
            <DialogDescription>
              Create a public channel for topic-based conversations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Channel name</Label>
              <Input
                id="channel-name"
                placeholder="e.g. design, random, help"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSubmitCreateChannel();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Channel names must be lowercase without spaces
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-topic">Topic (optional)</Label>
              <Input
                id="channel-topic"
                placeholder="e.g. Design & UX, Random chat, Tech support"
                value={newChannelTopic}
                onChange={(e) => setNewChannelTopic(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-description">Description (optional)</Label>
              <Textarea
                id="channel-description"
                placeholder="What's this channel about?"
                value={newChannelDescription}
                onChange={(e) => setNewChannelDescription(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => void handleSubmitCreateChannel()}
              disabled={!newChannelName.trim() || createRoomMutation.isPending}
              className="gradient-bg text-white"
            >
              {createRoomMutation.isPending ? 'Creating...' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}