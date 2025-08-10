'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '~/hooks/useSocket';
import { useAuth } from '~/contexts/AuthContext';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { Badge } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { 
  Hash, 
  Plus, 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical,
  Reply,
  Edit,
  Trash,
  Pin,
  Bookmark,
  Copy,
  MessageSquare,
  Heart,
  ThumbsUp,
  Laugh,
  Frown,
  PartyPopper,
  Rocket,
  Eye,
  Flame,
  Star,
  Zap,
  AtSign,
  Image,
  Video,
  Phone,
  FileText,
  Code,
  Bold,
  Italic,
  List,
  Link2,
  ChevronDown
} from 'lucide-react';
import { cn } from '~/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '~/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';

interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video' | 'file';
  edited?: boolean;
  threadCount?: number;
  lastThreadReply?: Date;
  reactions?: { emoji: string; users: string[]; }[];
  mentions?: string[];
  attachments?: { name: string; size: string; type: string; }[];
}

interface ModernChatRoomProps {
  channelId: string;
  channelName: string;
  isPrivate?: boolean;
}

export function ModernChatRoom({ channelId, channelName, isPrivate }: ModernChatRoomProps) {
  const { socket, connected } = useSocket();
  const { user, isGuest } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showFormatting, setShowFormatting] = useState(false);
  const [roomParticipants, setRoomParticipants] = useState<any[]>([]);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Join room and setup socket listeners
  useEffect(() => {
    if (!socket || !connected || !channelName) return;

    console.log('Switching to channel:', channelName, 'from:', currentRoom);

    // Leave previous room if switching channels
    if (currentRoom && currentRoom !== channelName) {
      console.log('Leaving room:', currentRoom);
      socket.emit('leave-room', currentRoom);
      setMessages([]); // Clear messages when switching rooms
      setRoomParticipants([]); // Clear participants
    }

    // Join new room
    const roomName = channelName;
    console.log('Joining room:', roomName);
    socket.emit('join-room', {
      roomName,
      userId: user?.uid || `guest-${Date.now()}`,
      userName: user?.displayName || 'Guest'
    });
    setCurrentRoom(roomName);

    // Socket event listeners
    const handleRoomJoined = (data: any) => {
      console.log('Joined room:', data);
      setRoomParticipants(data.participants || []);
      if (data.messages) {
        setMessages(data.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        })));
      }
    };

    const handleNewMessage = (message: any) => {
      setMessages(prev => [...prev, {
        ...message,
        timestamp: new Date(message.timestamp)
      }]);
    };

    const handleUserJoined = (data: any) => {
      console.log('User joined:', data);
      setRoomParticipants(data.participants || []);
    };

    const handleUserLeft = (data: any) => {
      console.log('User left:', data);
      setRoomParticipants(data.participants || []);
    };

    const handleTypingUpdate = (data: any) => {
      if (data.userId !== user?.uid) {
        if (data.isTyping) {
          setTypingUsers(prev => [...new Set([...prev, data.userName])]);
        } else {
          setTypingUsers(prev => prev.filter(name => name !== data.userName));
        }
      }
    };

    socket.on('room-joined', handleRoomJoined);
    socket.on('new-message', handleNewMessage);
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('typing-update', handleTypingUpdate);

    return () => {
      socket.off('room-joined', handleRoomJoined);
      socket.off('new-message', handleNewMessage);
      socket.off('user-joined', handleUserJoined);
      socket.off('user-left', handleUserLeft);
      socket.off('typing-update', handleTypingUpdate);
      if (currentRoom) {
        socket.emit('leave-room', currentRoom);
      }
    };
  }, [socket, connected, channelName, user]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!socket || !currentRoom || isGuest) return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('typing', {
        roomName: currentRoom,
        userId: user?.uid,
        userName: user?.displayName || 'User',
        isTyping: true
      });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socket.emit('typing', {
        roomName: currentRoom,
        userId: user?.uid,
        userName: user?.displayName || 'User',
        isTyping: false
      });
    }, 2000);
  }, [socket, currentRoom, isGuest, isTyping, user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || isGuest || !socket || !currentRoom) return;

    // Handle slash commands
    if (newMessage.startsWith('/')) {
      const command = newMessage.slice(1).split(' ')[0];
      if (command) {
        handleSlashCommand(command, newMessage.slice(command.length + 2));
        setNewMessage('');
        return;
      }
    }

    const message = {
      roomName: currentRoom,
      userId: user?.uid || '',
      userName: user?.displayName || 'Anonymous',
      content: newMessage,
      type: 'text',
      mentions: extractMentions(newMessage)
    };

    // Send message through socket
    socket.emit('send-message', message);
    
    setNewMessage('');
    setReplyingTo(null);
    
    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    setIsTyping(false);
    socket.emit('typing', {
      roomName: currentRoom,
      userId: user?.uid,
      userName: user?.displayName || 'User',
      isTyping: false
    });
  };

  const handleSlashCommand = (command: string, args: string) => {
    const commands: Record<string, () => void> = {
      shrug: () => {
        setNewMessage(newMessage + ' ¯\\_(ツ)_/¯');
      },
      tableflip: () => {
        setNewMessage('(╯°□°）╯︵ ┻━┻');
      },
      giphy: () => {
        // Implement giphy search
        console.log('Searching giphy for:', args);
      },
      me: () => {
        setNewMessage(`_${args}_`);
      }
    };

    if (commands[command]) {
      commands[command]();
    }
  };

  const extractMentions = (text: string): string[] => {
    const mentions = text.match(/@\w+/g) || [];
    return mentions.map(m => m.slice(1));
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        const existingReaction = reactions.find(r => r.emoji === emoji);
        
        if (existingReaction) {
          if (existingReaction.users.includes(user?.displayName || '')) {
            existingReaction.users = existingReaction.users.filter(u => u !== user?.displayName);
            if (existingReaction.users.length === 0) {
              return { ...msg, reactions: reactions.filter(r => r.emoji !== emoji) };
            }
          } else {
            existingReaction.users.push(user?.displayName || '');
          }
        } else {
          reactions.push({ emoji, users: [user?.displayName || ''] });
        }
        
        return { ...msg, reactions };
      }
      return msg;
    }));
  };

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

  const quickEmojis = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '🔥'];

  return (
    <div className="flex-1 flex flex-col h-screen bg-background">
      {/* Channel Header */}
      <div className="h-10 border-b px-3 flex items-center justify-between bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center space-x-3">
          <Hash className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-base">{channelName}</h2>
          <Separator orientation="vertical" className="h-5" />
          <Button variant="ghost" size="sm" className="h-6 px-1.5">
            <Star className="h-3 w-3 mr-0.5" />
            Star
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {roomParticipants.slice(0, 4).map((participant, i) => (
                <Avatar key={i} className="h-6 w-6 border-2 border-background">
                  <AvatarFallback className="text-[10px]">
                    {participant.name ? participant.name.slice(0, 2).toUpperCase() : `U${i + 1}`}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {roomParticipants.length > 0 ? roomParticipants.length : connected ? 'Loading...' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Phone className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Pin className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-3">
        <div>
          {messages.map((message, index) => {
            const showAvatar = index === 0 || messages[index - 1]?.userId !== message.userId;
            const isOwnMessage = message.userId === user?.uid;
            
            return (
              <div key={message.id} className={cn("group relative", showAvatar ? "mb-1.5" : "mb-0.5")}>
                <div className="flex items-start space-x-2">
                  {showAvatar ? (
                    <Avatar className="h-8 w-8 mt-1">
                      <AvatarFallback className="text-[11px] gradient-bg text-white">
                        {getInitials(message.userName)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8" /> // Spacer for non-avatar messages
                  )}
                  
                  <div className="flex-1">
                    {showAvatar && (
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm text-foreground">{message.userName}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
                        {message.edited && (
                          <span className="text-xs text-muted-foreground">(edited)</span>
                        )}
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    {message.type === 'text' && (
                      <div className="bg-gray-100 rounded-2xl px-3 py-1.5 max-w-2xl">
                        <p className="text-sm leading-relaxed">
                          {message.content.split(' ').map((word, i) => {
                            if (word.startsWith('@')) {
                              return <span key={i} className="mention">@{word.slice(1)} </span>;
                            }
                            return word + ' ';
                          })}
                        </p>
                      </div>
                    )}
                    
                    {message.type === 'file' && message.attachments && (
                      <div className="bg-muted/30 rounded-2xl p-3 max-w-sm">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{message.attachments[0]?.name || 'File'}</p>
                            <p className="text-xs text-muted-foreground">{message.attachments[0]?.size || 'Unknown size'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {message.type === 'image' && (
                      <div className="bg-muted/30 rounded-2xl p-3 max-w-md">
                        <p className="text-sm italic text-muted-foreground">{message.content}</p>
                        <div className="mt-2 bg-muted rounded h-48 flex items-center justify-center">
                          <Image className="h-12 w-12 text-muted-foreground" aria-label="Image placeholder" />
                        </div>
                      </div>
                    )}

                    {/* Reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        {message.reactions.map((reaction, i) => (
                          <button
                            key={i}
                            onClick={() => handleReaction(message.id, reaction.emoji)}
                            className={cn(
                              "reaction-pill",
                              reaction.users.includes(user?.displayName || '') && "reacted"
                            )}
                          >
                            <span>{reaction.emoji}</span>
                            <span className="text-xs">{reaction.users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Thread indicator */}
                    {message.threadCount && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-primary">
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {message.threadCount} replies
                        <span className="text-xs text-muted-foreground ml-2">
                          Last reply {formatTime(message.lastThreadReply!)}
                        </span>
                      </Button>
                    )}
                  </div>

                  {/* Message Actions */}
                  <div className="message-hover-actions flex items-center space-x-1">
                    <TooltipProvider>
                      {quickEmojis.map(emoji => (
                        <Tooltip key={emoji}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleReaction(message.id, emoji)}
                            >
                              <span className="text-sm">{emoji}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>React with {emoji}</TooltipContent>
                        </Tooltip>
                      ))}
                    </TooltipProvider>
                    
                    <Separator orientation="vertical" className="h-5" />
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setReplyingTo(message)}
                          >
                            <Reply className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reply in thread</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit message
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy text
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Pin className="mr-2 h-4 w-4" />
                          Pin to channel
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Bookmark className="mr-2 h-4 w-4" />
                          Save for later
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash className="mr-2 h-4 w-4" />
                          Delete message
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Typing Indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-2 text-xs text-muted-foreground">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
        </div>
      )}

      {/* Reply Preview */}
      {replyingTo && (
        <div className="mx-4 p-2 bg-secondary/50 rounded-t-lg border-l-4 border-primary">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Reply className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Replying to {replyingTo.userName}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => setReplyingTo(null)}
            >
              ×
            </Button>
          </div>
          <p className="text-sm mt-1 line-clamp-1">{replyingTo.content}</p>
        </div>
      )}

      {/* Message Input */}
      <div className="p-3 border-t">
        <div className="flex items-end space-x-2">
          <div className="flex-1">
            <div className="relative">
              <div className="flex items-center space-x-1 absolute left-2 top-2.5">
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isGuest ? "Sign up to start chatting" : `Message #${channelName}`}
                disabled={isGuest}
                className="pl-10 pr-32 py-4"
              />
              
              <div className="flex items-center space-x-0.5 absolute right-2 top-2.5">
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <AtSign className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <Link2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <Code className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-5" />
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0">
                  <Smile className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-muted-foreground">
                <kbd className="px-1.5 py-0.5 text-xs bg-secondary rounded">Shift</kbd> + <kbd className="px-1.5 py-0.5 text-xs bg-secondary rounded">Enter</kbd> for new line
              </p>
              <Button
                onClick={handleSendMessage}
                disabled={isGuest || !newMessage.trim()}
                size="sm"
                className="gradient-bg text-white"
              >
                Send
                <Send className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}