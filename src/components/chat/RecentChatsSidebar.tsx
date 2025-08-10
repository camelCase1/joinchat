'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { api } from '~/trpc/react';
import toast from 'react-hot-toast';
import { Button } from '~/components/ui/button';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { useSocket } from '~/hooks/useSocket';
import { Hash, LogOut, Settings, X, MessageSquare, ArrowLeft } from 'lucide-react';
import { cn } from '~/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';

interface RecentChat {
  roomId: string;
  roomName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  participantCount: number;
  unreadCount: number;
}

interface RecentChatsSidebarProps {
  currentRoomId?: string | null;
  onJoinRoom: (roomId: string) => void;
  onReturnToLobby: () => void;
}

export function RecentChatsSidebar({ currentRoomId, onJoinRoom, onReturnToLobby }: RecentChatsSidebarProps) {
  const { user, logout } = useAuth();
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; chat?: RecentChat }>({ open: false });
  const [sidebarTyping, setSidebarTyping] = useState<Record<string, string[]>>({});
  const [sidebarUnread, setSidebarUnread] = useState<Record<string, number>>({});
  const { socket } = useSocket();

  const { data: recentRooms = [], refetch: refetchRecentRooms } = api.post.getUserRecentRooms.useQuery(
    { userId: user?.uid || '' },
    {
      enabled: !!user?.uid,
      staleTime: 30000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
    }
  );

  const removeRoomFromRecentMutation = api.post.removeRoomFromRecent.useMutation();

  useEffect(() => {
    if (recentRooms) {
      setRecentChats(prev => {
        const next = recentRooms.map(room => ({
          ...room,
          lastMessageTime: new Date(room.lastMessageTime)
        }));
        if (JSON.stringify(prev) !== JSON.stringify(next)) {
          return next;
        }
        return prev;
      });
    }
  }, [recentRooms]);

  useEffect(() => {
    if (socket && user?.uid) {
      socket.emit('register-user', { userId: user.uid, displayName: user.displayName });

      const handleRecentChatsUpdated = (data: { userId: string }) => {
        if (data.userId === user.uid) {
          refetchRecentRooms();
        }
      };

      const handleSidebarTyping = (data: { roomId: string; typingUserNames: string[] }) => {
        setSidebarTyping(prev => ({ ...prev, [data.roomId]: data.typingUserNames }));
      };

      const handleSidebarUnread = (data: { roomId: string; userId: string; unreadCount: number }) => {
        if (data.userId === user.uid) {
          setSidebarUnread(prev => ({ ...prev, [data.roomId]: data.unreadCount }));
        }
      };

      socket.on('recent-chats-updated', handleRecentChatsUpdated);
      socket.on('sidebar-typing', handleSidebarTyping);
      socket.on('sidebar-unread', handleSidebarUnread);

      return () => {
        socket.off('recent-chats-updated', handleRecentChatsUpdated);
        socket.off('sidebar-typing', handleSidebarTyping);
        socket.off('sidebar-unread', handleSidebarUnread);
      };
    }
  }, [socket, user?.uid, user?.displayName, refetchRecentRooms]);

  const handleDeleteChat = async (roomId: string) => {
    try {
      await removeRoomFromRecentMutation.mutateAsync({ userId: user?.uid || '', roomId });
      if (socket && user?.uid) {
        socket.emit('remove-room-from-recent', { userId: user.uid, roomId });
      }
      toast.success('Removed from recent chats');
      setDeleteModal({ open: false });
    } catch (error) {
      toast.error('Failed to remove chat');
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  };

  return (
    <div className="w-64 border-r bg-background flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span className="font-semibold">Ever.Chat</span>
          </div>
          {currentRoomId && (
            <Button variant="ghost" size="sm" onClick={onReturnToLobby}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* User Profile */}
        {user && (
          <div className="flex items-center space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{getInitials(user.displayName || user.email || '')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.displayName || 'Anonymous'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>

      {/* Recent Chats */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            RECENT CHATS
          </div>
          {recentChats.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <p className="text-sm text-muted-foreground">No recent chats</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={onReturnToLobby}
              >
                Browse Rooms
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {recentChats.map((chat) => {
                const typingUsers = sidebarTyping[chat.roomId] || [];
                const unreadCount = sidebarUnread[chat.roomId] || 0;
                const isActive = chat.roomId === currentRoomId;

                return (
                  <div
                    key={chat.roomId}
                    className={cn(
                      "group flex items-center px-2 py-2 rounded-md cursor-pointer transition-colors",
                      isActive ? "bg-accent" : "hover:bg-accent/50"
                    )}
                    onClick={() => onJoinRoom(chat.roomId)}
                  >
                    <Hash className="h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">{chat.roomName}</p>
                        {chat.lastMessageTime && (
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(chat.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      {typingUsers.length > 0 ? (
                        <p className="text-xs text-muted-foreground italic truncate">
                          {typingUsers[0]} is typing...
                        </p>
                      ) : chat.lastMessage ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {chat.lastMessage}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {chat.participantCount} users
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 ml-2">
                      {unreadCount > 0 && (
                        <Badge className="h-5 min-w-[20px] px-1 text-xs">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({ open: true, chat });
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {/* Footer Actions */}
      <div className="p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={() => {/* Add settings handler */}}
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={logout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from recent chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{deleteModal.chat?.roomName}&quot; from your recent chats. You can still rejoin the room later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteModal.chat && handleDeleteChat(deleteModal.chat.roomId)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}