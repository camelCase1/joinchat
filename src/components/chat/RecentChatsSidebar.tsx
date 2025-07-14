'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { api } from '~/trpc/react';
import { ProfileSettings } from '~/components/profile/ProfileSettings';
import { BadgeTags } from '~/components/ui/BadgeTags';

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
  const [showProfileSettings, setShowProfileSettings] = useState(false);

  // Fetch recent rooms from database
  const { data: recentRooms = [], refetch: refetchRecentRooms } = api.post.getUserRecentRooms.useQuery(
    { userId: user?.uid || '' },
    { 
      enabled: !!user?.uid,
      staleTime: 30000, // Consider data fresh for 30 seconds
      gcTime: 300000, // Keep in cache for 5 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    }
  );

  // Fetch user badges
  const { data: userBadges } = api.post.getUserBadges.useQuery(
    { userId: user?.uid || '' },
    { 
      enabled: !!user?.uid,
      staleTime: 60000, // Consider data fresh for 1 minute (badges don't change often)
      gcTime: 600000, // Keep in cache for 10 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false,
    }
  );

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

  const addToRecentChats = useCallback((roomId: string, roomName: string, lastMessage?: string) => {
    if (!user?.uid) return;
    
    // Refetch recent rooms to update the list
    void refetchRecentRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]); // Remove refetchRecentRooms to prevent infinite loop

  const clearUnreadCount = (roomId: string) => {
    // In future, this could mark messages as read in the database
    setRecentChats(prev => 
      prev.map(chat => 
        chat.roomId === roomId ? { ...chat, unreadCount: 0 } : chat
      )
    );
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

  // Remove global window assignment to prevent infinite loops
  // useEffect(() => {
  //   (window as any).addToRecentChats = addToRecentChats;
  //   (window as any).clearUnreadCount = clearUnreadCount;
  // }, [addToRecentChats, user?.uid, currentRoomId]);

  return (
    <>
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
        {/* Header */}
        <div className="p-3 md:p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Join.Chat</h2>
            {/* Remove Browse Rooms and Sign Out buttons from here */}
          </div>
          {user && (
            <button
              onClick={() => setShowProfileSettings(true)}
              className="flex items-center space-x-3 w-full p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                style={{ 
                  backgroundColor: `hsl(${user.displayName?.charCodeAt(0) * 137.508}deg, 60%, 60%)` 
                }}
              >
                {user.displayName?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left flex-1">
                <p className="font-medium text-gray-900">{user.displayName}</p>
                <p className="text-sm text-gray-500">Online</p>
                {userBadges && userBadges.badges && (
                  <div className="mt-1">
                    <BadgeTags badges={userBadges.badges} maxDisplay={2} size="sm" />
                  </div>
                )}
              </div>
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="p-3 md:p-4">
          <button
            onClick={onReturnToLobby}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
              !currentRoomId ? 'bg-red-500 text-white' : 'hover:bg-gray-100 text-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m7 7 5 5 5-5" />
            </svg>
            <span>Browse Rooms</span>
          </button>
        </div>

        {/* Recent Chats */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3 md:p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3 uppercase tracking-wider">Recent Chats</h3>
            
            {recentChats.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">No recent chats</p>
                <p className="text-xs mt-1">Join a room to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentChats.map((chat) => (
                  <button
                    key={chat.roomId}
                    onClick={() => {
                      onJoinRoom(chat.roomId);
                      clearUnreadCount(chat.roomId);
                    }}
                    className={`w-full text-left p-3 rounded-lg transition-colors relative ${
                      currentRoomId === chat.roomId 
                        ? 'bg-red-500 text-white' 
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        currentRoomId === chat.roomId ? 'bg-red-400' : 'bg-gray-200'
                      }`}>
                        <span className={`font-bold ${
                          currentRoomId === chat.roomId ? 'text-white' : 'text-gray-600'
                        }`}>#</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{chat.roomName}</p>
                          {chat.lastMessageTime && (
                            <span className={`text-xs ${
                              currentRoomId === chat.roomId ? 'text-red-100' : 'text-gray-500'
                            }`}>
                              {formatRelativeTime(chat.lastMessageTime)}
                            </span>
                          )}
                        </div>
                        {chat.lastMessage && (
                          <p className={`text-sm truncate mt-1 ${
                            currentRoomId === chat.roomId ? 'text-red-100' : 'text-gray-500'
                          }`}>
                            {chat.lastMessage}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {chat.unreadCount > 0 && currentRoomId !== chat.roomId && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
            <span>Join.Chat</span>
            <span>•</span>
            <span>Community Powered</span>
          </div>
        </div>
      </div>
      
      <ProfileSettings 
        isOpen={showProfileSettings}
        onClose={() => setShowProfileSettings(false)}
      />
    </>
  );
}