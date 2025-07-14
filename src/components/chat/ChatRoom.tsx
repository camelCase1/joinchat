'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '~/hooks/useSocket';
import { useAuth } from '~/contexts/AuthContext';
import { api } from '~/trpc/react';
import toast from 'react-hot-toast';
import { BadgeTags } from '~/components/ui/BadgeTags';
import { calculateUserBadges, type UserStats } from '~/lib/badges';

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video';
  roomId?: string;
}

interface User {
  id: string;
  name: string;
  avatar?: string;
  badges: string[];
  joinedAt: Date;
  trustScore: number;
  profileAge: Date;
  messageCount: number;
}

interface ChatRoom {
  id: string;
  name: string;
  participants: User[];
  messages: Message[];
  createdAt: Date;
  maxParticipants: number;
}

interface ChatRoomProps {
  roomId: string;
  onLeaveRoom: () => void;
}

export function ChatRoom({ roomId, onLeaveRoom }: ChatRoomProps) {
  const { socket, connected, error: socketError, emitSafely } = useSocket();
  const { user, logout, isGuest } = useAuth();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<User[]>([]);
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [showParticipants, setShowParticipants] = useState(true);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteUsers, setAutocompleteUsers] = useState<User[]>([]);
  const [autocompleteIndex, setAutocompleteIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [readReceipts, setReadReceipts] = useState<Record<string, Set<string>>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // tRPC mutations and queries
  const joinRoomMutation = api.post.joinRoom.useMutation();
  const leaveRoomMutation = api.post.leaveRoom.useMutation();
  const saveMessageMutation = api.post.saveMessage.useMutation();
  const deleteRoomMutation = api.post.deleteRoom.useMutation();

  // Get room data from database as fallback
  const { data: roomData, isLoading: roomLoading } = api.post.getRoom.useQuery(
    { roomId },
    { enabled: !!roomId }
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Set room data from tRPC query when it loads
  useEffect(() => {
    if (roomData && !room) {
      setRoom(roomData);
      setParticipants(roomData.participants);
      setMessages(roomData.messages);
    }
  }, [roomData, room]);

  const addToRecentChats = (roomId: string, roomName: string, lastMessage?: string) => {
    if (typeof window === 'undefined') return;

    const existingChats = JSON.parse(localStorage.getItem('recentChats') || '[]');
    const chatIndex = existingChats.findIndex((chat: { roomId: string; roomName: string; lastMessageTime: string; lastMessage: string }) => chat.roomId === roomId);

    const chatData = {
      roomId,
      roomName,
      lastMessageTime: new Date().toISOString(),
      lastMessage: lastMessage || ''
    };

    if (chatIndex >= 0) {
      // Update existing chat
      existingChats[chatIndex] = chatData;
    } else {
      // Add new chat to beginning
      existingChats.unshift(chatData);
    }

    // Keep only last 10 recent chats
    const recentChats = existingChats.slice(0, 10);
    localStorage.setItem('recentChats', JSON.stringify(recentChats));
  };

  useEffect(() => {
    if (!socket || !user) return;

    const currentUser = {
      id: user.uid,
      name: user.displayName || 'Anonymous',
      badges: ['member'],
      joinedAt: new Date(),
    };

    // Join room in database
    joinRoomMutation.mutate({ roomId, userId: user.uid });

    emitSafely('join-room', { roomId, user: currentUser });

    socket.on('joined-room', ({ room }: { room: ChatRoom }) => {
      console.log('✅ Joined room:', room);
      setRoom(room);
      setParticipants(room.participants);

      // Add to recent chats
      addToRecentChats(room.id, room.name);
    });

    socket.on('recent-messages', ({ messages }: { messages: Message[] }) => {
      setMessages(messages);
    });

    socket.on('new-message', (message: Message) => {
      console.log('📨 Received new message:', message);
      setMessages(prev => {
        // Check if we already have this message (our own message with temp ID)
        const existingIndex = prev.findIndex(m =>
          m.content === message.content &&
          m.userId === message.userId &&
          Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000 // Within 5 seconds
        );

        if (existingIndex !== -1) {
          // Replace the temporary message with the real one from server
          const newMessages = [...prev];
          newMessages[existingIndex] = message;
          console.log('🔄 Replaced temporary message with server message');
          return newMessages;
        } else {
          // Add new message from other users
          console.log('➕ Added new message from other user');
          return [...prev, message];
        }
      });

      // Update recent chats with new message
      if (room) {
        addToRecentChats(room.id, room.name, message.content);
      }
    });

    socket.on('user-joined', ({ user, participantCount }: { user: User; participantCount: number }) => {
      setParticipants(prev => [...prev, user]);
      toast.success(`${user.name} joined the room`);
    });

    socket.on('user-left', ({ userId, participantCount }: { userId: string; participantCount: number }) => {
      setParticipants(prev => prev.filter(p => p.id !== userId));
    });

    socket.on('room-redirect', ({ newRoomId }: { newRoomId: string }) => {
      toast.error('Room is full, redirecting to alternative...');
    });

    socket.on('error', ({ message }: { message: string }) => {
      toast.error(message);
    });

    socket.on('kicked-for-idle', () => {
      toast.error('You were kicked for being idle too long');
      onLeaveRoom();
    });

    return () => {
      socket.off('joined-room');
      socket.off('recent-messages');
      socket.off('new-message');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('room-redirect');
      socket.off('error');
      socket.off('kicked-for-idle');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user, roomId, emitSafely]); // Remove mutations and callbacks to prevent infinite loop

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() || !socket || !user) {
      console.log('❌ Cannot send message:', {
        hasMessage: !!newMessage.trim(),
        hasSocket: !!socket,
        hasUser: !!user
      });
      return;
    }

    // Do NOT generate or send an ID. Let the server handle it.
    const message = {
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      content: newMessage.trim(),
      type: 'text' as const,
      timestamp: new Date(),
    };

    console.log('📝 Sending message:', message);

    // Send via socket (no ID)
    const sent = emitSafely('send-message', { roomId, message });
    console.log('📤 Socket emit result:', sent);
    setNewMessage('');
  };

  const handleLeaveRoom = () => {
    if (socket && user) {
      emitSafely('leave-room', { roomId, userId: user.uid });
      // Leave room in database
      leaveRoomMutation.mutate({ roomId, userId: user.uid });
    }
    onLeaveRoom();
  };

  const handleDeleteRoom = () => {
    if (!room || !user) return;

    const confirmDelete = confirm(`Are you sure you want to delete the room "${room.name}"? This action cannot be undone.`);
    if (!confirmDelete) return;

    deleteRoomMutation.mutate(
      { roomId, userId: user.uid },
      {
        onSuccess: () => {
          toast.success('Room deleted successfully');
          emitSafely('room-deleted', { roomId });
          onLeaveRoom();
        },
        onError: (error) => {
          toast.error(error.message);
        }
      }
    );
  };

  // Check if user is the only person in the room
  const isOnlyParticipant = participants.length === 1 && participants[0]?.id === user?.uid;

  // Calculate badges for a participant
  const getParticipantBadges = (participant: User) => {
    const profileAgeDate = new Date(participant.profileAge);
    const userStats: UserStats = {
      profileAge: profileAgeDate,
      trustScore: participant.trustScore,
      messageCount: participant.messageCount,
      roomsJoined: 1, // At least this room
      roomsCreated: 0,
      daysActive: Math.floor((new Date().getTime() - profileAgeDate.getTime()) / (1000 * 60 * 60 * 24)) || 1,
      createdAt: profileAgeDate
    };
    return calculateUserBadges(userStats);
  };

  const formatTime = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMuteUser = (userId: string) => {
    setMutedUsers(prev => new Set([...prev, userId]));
    toast.success('User muted');
  };

  const handleUnmuteUser = (userId: string) => {
    setMutedUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
    toast.success('User unmuted');
  };

  // Typing indicator logic
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    if (socket && user) {
      socket.emit('typing', { roomId, userId: user.uid });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop-typing', { roomId, userId: user.uid });
      }, 2000);
    }

    // Handle autocomplete for @mentions
    const words = value.split(' ');
    const lastWord = words[words.length - 1];

    if (lastWord && lastWord.startsWith('@') && lastWord.length > 1) {
      const searchTerm = lastWord.substring(1).toLowerCase();
      const matchingUsers = participants.filter(p =>
        p.name.toLowerCase().includes(searchTerm) && p.id !== user?.uid
      );

      if (matchingUsers.length > 0) {
        setAutocompleteUsers(matchingUsers);
        setShowAutocomplete(true);
        setAutocompleteIndex(0);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showAutocomplete) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocompleteIndex(prev =>
          prev < autocompleteUsers.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocompleteIndex(prev =>
          prev > 0 ? prev - 1 : autocompleteUsers.length - 1
        );
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const selectedUser = autocompleteUsers[autocompleteIndex];
        if (selectedUser) {
          selectAutocompleteUser(selectedUser);
        }
      } else if (e.key === 'Escape') {
        setShowAutocomplete(false);
      }
    }
  };

  const selectAutocompleteUser = (selectedUser: User) => {
    const words = newMessage.split(' ');
    words[words.length - 1] = `@${selectedUser.name} `;
    setNewMessage(words.join(' '));
    setShowAutocomplete(false);
    inputRef.current?.focus();
  };

  const filteredMessages = messages.filter(message => !mutedUsers.has(message.userId));

  // Simplified badge styling to match clean theme
  const getBadgeColor = () => {
    return 'bg-gray-100 text-gray-700';
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-gray-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Listen for typing and read receipt events
  useEffect(() => {
    if (!socket || !user) return;
    const handleTyping = ({ userId }: { userId: string }) => {
      setTypingUsers(prev => new Set(prev).add(userId));
    };
    const handleStopTyping = ({ userId }: { userId: string }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };
    const handleMessageRead = ({ userId, messageId }: { userId: string; messageId: string }) => {
      setReadReceipts(prev => {
        const next = { ...prev };
        if (!next[messageId]) next[messageId] = new Set();
        next[messageId].add(userId);
        return next;
      });
    };
    socket.on('typing', handleTyping);
    socket.on('stop-typing', handleStopTyping);
    socket.on('message-read', handleMessageRead);
    return () => {
      socket.off('typing', handleTyping);
      socket.off('stop-typing', handleStopTyping);
      socket.off('message-read', handleMessageRead);
    };
  }, [socket, user, roomId]);

  // Emit message-read for the latest message when messages change
  useEffect(() => {
    if (!socket || !user || messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      socket.emit('message-read', { roomId, userId: user.uid, messageId: lastMessage.id });
    }
  }, [messages, socket, user, roomId]);

  // Show a toast if there is a socket connection error
  useEffect(() => {
    if (socketError) {
      toast.error(socketError);
    }
  }, [socketError]);

  if (!room && roomLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          </div>
          <p className="text-gray-800 text-lg font-medium">Joining room...</p>
          <p className="text-gray-600 text-sm mt-2">Getting ready for great conversations</p>
        </div>
      </div>
    );
  }

  if (!room && !roomLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-gray-800 text-lg font-medium">Room not found</p>
          <p className="text-gray-600 text-sm mt-2">This room may have been deleted or is no longer available</p>
        </div>
      </div>
    );
  }

  // At this point, room should not be null due to early returns above
  if (!room) return null;

  return (
    <div className="flex h-screen bg-white">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="bg-white p-4 md:p-6 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center space-x-2 md:space-x-4 min-w-0 flex-1">
            {/* Leave Chat Button */}
            <button
              onClick={handleLeaveRoom}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-red-600 border border-red-200 mr-2"
              aria-label="Leave chat"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 713-3h4a3 3 0 713 3v1" />
              </svg>
              <span className="ml-2 hidden md:inline">Leave Chat</span>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 truncate">#{room.name}</h1>
              <span className="text-gray-600 text-xs md:text-sm">
                {participants.length} of {room.maxParticipants} people online
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-1 md:space-x-3">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="btn btn-secondary text-xs md:text-sm px-2 md:px-4"
            >
              <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 715 0z" />
              </svg>
              <span className="hidden md:inline">{showParticipants ? 'Hide' : 'Show'} People</span>
            </button>
            {/* Only show Delete Room if user is the only participant */}
            {isOnlyParticipant && (
              <button
                onClick={handleDeleteRoom}
                disabled={deleteRoomMutation.isPending}
                className="px-2 md:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-xs md:text-sm"
              >
                <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span className="hidden md:inline">{deleteRoomMutation.isPending ? 'Deleting...' : 'Delete Room'}</span>
              </button>
            )}

            <button
              onClick={logout}
              className="btn btn-secondary text-xs md:text-sm px-2 md:px-4"
            >
              <svg className="w-4 h-4 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 713 3v1" />
              </svg>
              <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-6 scroll-smooth bg-gray-50" style={{ minHeight: 0 }}>
          {messages.length === 0 ? (
            <div className="text-center mt-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Welcome to #{room.name}!</h3>
              <p className="text-gray-600">Be the first to start the conversation</p>
            </div>
          ) : (
            filteredMessages.map((message) => (
              <div key={message.id} className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm relative">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                  style={{
                    backgroundColor: `hsl(${message.userName.charCodeAt(0) * 137.508}deg, 60%, 60%)`
                  }}
                >
                  {message.userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-semibold text-gray-900">{message.userName}</span>
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed break-words">{message.content}</p>
                </div>
                {/* Read receipt indicator */}
                {readReceipts[message.id] && readReceipts[message.id]!.size > 0 && (
                  <div className="absolute top-2 right-2 text-xs text-green-500">
                    ✓ Read by {readReceipts[message.id] ? readReceipts[message.id]!.size : 0}
                  </div>
                )}
              </div>
            ))
          )}
          {/* Typing indicator */}
          {typingUsers.size > 0 && Array.from(typingUsers).some(uid => uid !== user?.uid) && (() => {
            const typingNames = Array.from(typingUsers)
              .filter(uid => uid !== user?.uid)
              .map(uid => {
                const participant = (participants || []).find(p => p.id === uid);
                return participant ? participant.name : 'Someone';
              });
            if (typingNames.length === 0) return null;
            return (
              <div className="text-xs text-gray-500 italic px-2 py-1">
                {typingNames.join(', ')}
                {typingNames.length === 1 ? ' is typing...' : ' are typing...'}
              </div>
            );
          })()}
          {/* Always keep this at the end for scroll-to-bottom */}
          <div ref={messagesEndRef} style={{ height: 1 }} />
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-200 p-4 md:p-6">
          <form onSubmit={handleSendMessage} className="relative">
            {isGuest && (
              <div className="flex-1 text-center text-gray-500 italic">Guest users cannot send messages. <span className="ml-2">🔒</span></div>
            )}
            {/* Autocomplete Dropdown */}
            {showAutocomplete && (
              <div className="absolute bottom-full left-0 right-16 bg-white border border-gray-200 rounded-lg shadow-lg mb-2 max-h-48 overflow-y-auto z-10">
                {autocompleteUsers.map((participant, index) => (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={() => selectAutocompleteUser(participant)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-3 ${
                      index === autocompleteIndex ? 'bg-red-50 border-l-4 border-red-500' : ''
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                      style={{
                        backgroundColor: `hsl(${participant.name.charCodeAt(0) * 137.508}deg, 60%, 60%)`
                      }}
                    >
                      {participant.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-800">{participant.name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex space-x-2 md:space-x-4">
              <input
                ref={inputRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={isGuest ? 'Login to send messages...' : `Message #${room.name}...`}
                className="flex-1 px-3 md:px-4 py-2 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm md:text-base"
                maxLength={500}
                disabled={isGuest}
              />
              <button
                type="submit"
                disabled={isGuest || !newMessage.trim()}
                className="btn btn-primary px-3 md:px-6 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="hidden md:inline">Send</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Participants Sidebar */}
      {showParticipants && (
        <div className="w-full md:w-80 bg-white border-l border-gray-200 absolute md:relative top-0 right-0 h-full md:h-auto z-10 md:z-auto">
          <div className="p-4 md:p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
              People ({participants.length})
            </h3>
            {mutedUsers.size > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {mutedUsers.size} user{mutedUsers.size !== 1 ? 's' : ''} muted
              </p>
            )}
          </div>
          <div className="p-4 space-y-2 overflow-y-auto max-h-full">
            {participants.map((participant) => (
              <div key={participant.id} className="group flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 relative"
                  style={{
                    backgroundColor: `hsl(${participant.name.charCodeAt(0) * 137.508}deg, 60%, 60%)`
                  }}
                >
                  {participant.name.charAt(0).toUpperCase()}
                  {mutedUsers.has(participant.id) && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1V7a1 1 0 011-1h1.586l4.707-4.707C10.923.663 12 1.109 12 2v20c0 .891-1.077 1.337-1.707.707L5.586 18z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className={`font-semibold truncate ${mutedUsers.has(participant.id) ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {participant.name}
                    </p>
                    {participant.id === user?.uid && (
                      <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full font-medium">(You)</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-500">Online</span>
                  </div>
                </div>
                <div className="flex items-center">
                  {participant.id !== user?.uid && (
                    <button
                      onClick={() => mutedUsers.has(participant.id) ? handleUnmuteUser(participant.id) : handleMuteUser(participant.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-200 rounded-lg transition-all"
                      title={mutedUsers.has(participant.id) ? 'Unmute user' : 'Mute user'}
                    >
                      {mutedUsers.has(participant.id) ? (
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1V7a1 1 0 011-1h1.586l4.707-4.707C10.923.663 12 1.109 12 2v20c0 .891-1.077 1.337-1.707.707L5.586 18z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1V7a1 1 0 011-1h1.586l4.707-4.707C10.923.663 12 1.109 12 2v20c0 .891-1.077 1.337-1.707.707L5.586 18z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}