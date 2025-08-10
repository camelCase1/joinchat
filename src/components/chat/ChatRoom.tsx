'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '~/hooks/useSocket';
import { useAuth } from '~/contexts/AuthContext';
import { api } from '~/trpc/react';
import toast from 'react-hot-toast';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '~/components/ui/sheet';
import { Send, Users, LogOut, Hash, MoreVertical, Volume2, VolumeX } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { cn } from '~/lib/utils';

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
  const { socket, connected, emitSafely } = useSocket();
  const { user, isGuest } = useAuth();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [participants, setParticipants] = useState<User[]>([]);
  const [mutedUsers, setMutedUsers] = useState<Set<string>>(new Set());
  const [typingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // tRPC mutations and queries
  const joinRoomMutation = api.post.joinRoom.useMutation();
  const leaveRoomMutation = api.post.leaveRoom.useMutation();
  const deleteRoomMutation = api.post.deleteRoom.useMutation();

  const { data: roomData, isLoading: roomLoading } = api.post.getRoom.useQuery(
    { roomId },
    { enabled: !!roomId }
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
    const chatIndex = existingChats.findIndex((chat: any) => chat.roomId === roomId);
    const chatData = {
      roomId,
      roomName,
      lastMessageTime: new Date().toISOString(),
      lastMessage: lastMessage || ''
    };
    if (chatIndex >= 0) {
      existingChats[chatIndex] = chatData;
    } else {
      existingChats.unshift(chatData);
    }
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

    joinRoomMutation.mutate({ roomId, userId: user.uid });
    emitSafely('join-room', {
      roomId,
      userId: currentUser.id,
      userName: currentUser.name
    });

    socket.on('room-joined', ({ room, participants, messages }: any) => {
      setRoom(prev => prev || {
        id: roomId,
        name: room,
        participants: participants || [],
        messages: messages || [],
        createdAt: new Date(),
        maxParticipants: 30
      });
      setParticipants(participants || []);
      setMessages(messages || []);
      addToRecentChats(roomId, room);
    });

    socket.on('recent-messages', ({ messages }: { messages: Message[] }) => {
      setMessages(messages);
    });

    socket.on('new-message', (message: Message) => {
      setMessages(prev => {
        const existingIndex = prev.findIndex(m =>
          m.content === message.content &&
          m.userId === message.userId &&
          Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 5000
        );
        if (existingIndex !== -1) {
          const newMessages = [...prev];
          newMessages[existingIndex] = message;
          return newMessages;
        } else {
          return [...prev, message];
        }
      });
      if (room) {
        addToRecentChats(room.id, room.name, message.content);
      }
    });

    socket.on('user-joined', ({ user }: { user: User }) => {
      setParticipants(prev => [...prev, user]);
      toast.success(`${user.name} joined`);
    });

    socket.on('user-left', ({ userId }: { userId: string }) => {
      setParticipants(prev => prev.filter(p => p.id !== userId));
    });

    socket.on('room-redirect', () => {
      toast.error('Room is full, redirecting...');
    });

    socket.on('error', ({ message }: { message: string }) => {
      toast.error(message);
    });

    socket.on('kicked-for-idle', () => {
      toast.error('Kicked for inactivity');
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
  }, [socket, user, roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket || !user || isGuest) {
      if (isGuest) toast.error('Guests cannot send messages');
      return;
    }

    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      userId: user.uid,
      userName: user.displayName || 'Anonymous',
      content: newMessage.trim(),
      timestamp: new Date(),
      type: 'text',
      roomId
    };

    setMessages(prev => [...prev, tempMessage]);
    emitSafely('send-message', {
      roomId,
      message: {
        userId: user.uid,
        userName: user.displayName || 'Anonymous',
        content: newMessage.trim(),
        type: 'text'
      }
    });
    setNewMessage('');
  };

  const handleLeaveRoom = () => {
    if (socket && user) {
      emitSafely('leave-room', { roomId, userId: user.uid });
      leaveRoomMutation.mutate({ roomId, userId: user.uid });
    }
    onLeaveRoom();
  };

  const handleDeleteRoom = async () => {
    if (!user || !room) return;
    if (participants.length > 1) {
      toast.error('Cannot delete room with other participants');
      return;
    }
    if (window.confirm(`Delete "${room.name}"? This cannot be undone.`)) {
      try {
        await deleteRoomMutation.mutateAsync({ roomId, userId: user.uid });
        toast.success('Room deleted');
        onLeaveRoom();
      } catch (error) {
        toast.error('Failed to delete room');
      }
    }
  };

  const toggleMuteUser = (userId: string) => {
    setMutedUsers(prev => {
      const newMuted = new Set(prev);
      if (newMuted.has(userId)) {
        newMuted.delete(userId);
        toast.success('User unmuted');
      } else {
        newMuted.add(userId);
        toast.success('User muted');
      }
      return newMuted;
    });
  };

  const filteredMessages = messages.filter(msg => !mutedUsers.has(msg.userId));

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (roomLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Room not found</p>
          <Button onClick={onLeaveRoom}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Hash className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-semibold text-lg">{room.name}</h2>
            <Badge>{participants.length}/{room.maxParticipants}</Badge>
          </div>

          <div className="flex items-center space-x-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Users className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Participants ({participants.length})</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-full mt-4">
                  <div className="space-y-3">
                    {participants.map((participant) => (
                      <div key={participant.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{participant.name}</p>
                            <div className="flex items-center space-x-2">
                              {participant.badges.map(badge => (
                                <Badge key={badge} className="text-xs">
                                  {badge}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        {participant.id !== user?.uid && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => toggleMuteUser(participant.id)}>
                                {mutedUsers.has(participant.id) ? (
                                  <><Volume2 className="mr-2 h-4 w-4" /> Unmute</>
                                ) : (
                                  <><VolumeX className="mr-2 h-4 w-4" /> Mute</>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <Button variant="ghost" size="sm" onClick={handleLeaveRoom}>
              <LogOut className="h-5 w-5" />
            </Button>

            {participants.length === 1 && (
              <Button variant="ghost" size="sm" onClick={handleDeleteRoom}>
                Delete Room
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {filteredMessages.map((message, index) => {
              const showAvatar = index === 0 || filteredMessages[index - 1]?.userId !== message.userId;
              const isOwnMessage = message.userId === user?.uid;

              return (
                <div key={message.id} className={cn("flex items-start space-x-3", isOwnMessage && "flex-row-reverse space-x-reverse")}>
                  {showAvatar ? (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{getInitials(message.userName)}</AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8" />
                  )}
                  <div className={cn("flex-1 space-y-1", isOwnMessage && "items-end")}>
                    {showAvatar && (
                      <div className={cn("flex items-center space-x-2", isOwnMessage && "justify-end")}>
                        <span className="text-sm font-medium">{message.userName}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                      </div>
                    )}
                    <div className={cn(
                      "inline-block px-3 py-2 rounded-lg",
                      isOwnMessage ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          {typingUsers.size > 0 && (
            <p className="text-xs text-muted-foreground mb-2">
              {Array.from(typingUsers).join(', ')} typing...
            </p>
          )}
          <div className="flex space-x-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
              placeholder={isGuest ? "Guests can't send messages" : "Type a message..."}
              disabled={isGuest || !connected}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={isGuest || !connected || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}