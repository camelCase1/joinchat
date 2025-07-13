'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '~/contexts/AuthContext';

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

  useEffect(() => {
    // Load recent chats from localStorage
    const savedChats = localStorage.getItem(`recent-chats-${user?.uid}`);
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        setRecentChats(parsed.map((chat: any) => ({
          ...chat,
          lastMessageTime: chat.lastMessageTime ? new Date(chat.lastMessageTime) : undefined
        })));
      } catch (error) {
        console.error('Failed to load recent chats:', error);
      }
    }
  }, [user?.uid]);

  const addToRecentChats = (roomId: string, roomName: string, lastMessage?: string) => {
    if (!user?.uid) return;

    setRecentChats(prev => {
      const existingIndex = prev.findIndex(chat => chat.roomId === roomId);
      const newChat: RecentChat = {
        roomId,
        roomName,
        lastMessage,
        lastMessageTime: new Date(),
        participantCount: 0,
        unreadCount: roomId === currentRoomId ? 0 : 1
      };

      let newChats;
      if (existingIndex !== -1) {
        // Update existing chat and move to top
        newChats = [newChat, ...prev.filter((_, i) => i !== existingIndex)];
      } else {
        // Add new chat to top
        newChats = [newChat, ...prev].slice(0, 10); // Keep only 10 recent chats
      }

      // Save to localStorage
      localStorage.setItem(`recent-chats-${user.uid}`, JSON.stringify(newChats));
      return newChats;
    });
  };

  const clearUnreadCount = (roomId: string) => {
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

  // Expose functions for parent components to use
  useEffect(() => {
    (window as any).addToRecentChats = addToRecentChats;
    (window as any).clearUnreadCount = clearUnreadCount;
  }, [user?.uid, currentRoomId]);

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Join.Chat</h2>
          <button
            onClick={logout}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
        
        {user && (
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
              style={{ 
                backgroundColor: `hsl(${user.displayName?.charCodeAt(0) * 137.508}deg, 60%, 60%)` 
              }}
            >
              {user.displayName?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{user.displayName}</p>
              <p className="text-sm text-gray-400">Online</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="p-4">
        <button
          onClick={onReturnToLobby}
          className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
            !currentRoomId ? 'bg-blue-600' : 'hover:bg-gray-700'
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
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Recent Chats</h3>
          
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
                      ? 'bg-blue-600' 
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold">#</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{chat.roomName}</p>
                        {chat.lastMessageTime && (
                          <span className="text-xs text-gray-400">
                            {formatRelativeTime(chat.lastMessageTime)}
                          </span>
                        )}
                      </div>
                      {chat.lastMessage && (
                        <p className="text-sm text-gray-400 truncate mt-1">
                          {chat.lastMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {chat.unreadCount > 0 && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold">
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
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
          <span>Join.Chat</span>
          <span>•</span>
          <span>Community Powered</span>
        </div>
      </div>
    </div>
  );
}