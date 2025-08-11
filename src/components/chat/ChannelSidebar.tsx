'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { useSocket } from '~/hooks/useSocket';
import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
import { Textarea } from '~/components/ui/textarea';
import {
  Hash,
  Plus,
  ChevronDown,
  ChevronRight,
  Lock,
  Volume2,
  Bell,
  Search,
  Settings,
  LogOut,
  Sparkles,
  Circle,
  Moon,
  Sun,
  Laptop,
  MessageSquare,
  Users,
  Star,
  MoreVertical
} from 'lucide-react';
import { cn } from '~/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '~/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '~/components/ui/dialog';
import { Label } from '~/components/ui/label';

interface Channel {
  id: string;
  name: string;
  description?: string;
  isPrivate?: boolean;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: Date;
  participants?: number;
  isPinned?: boolean;
  isMuted?: boolean;
}

interface DirectMessage {
  id: string;
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  isTyping?: boolean;
}

interface ChannelSidebarProps {
  currentChannelId?: string | null;
  onSelectChannel: (channelId: string) => void;
  onSelectDM?: (userId: string) => void;
  onCreateChannel?: (prefillName?: string) => void;
}

export function ChannelSidebar({
  currentChannelId,
  onSelectChannel,
  onSelectDM,
  onCreateChannel
}: ChannelSidebarProps) {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  
  // Initialize states from localStorage or defaults (all expanded)
  const [showChannels, setShowChannels] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-show-channels');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  
  const [showDMs, setShowDMs] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-show-dms');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  
  const [showStarred, setShowStarred] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-show-starred');
      return saved !== null ? saved === 'true' : true;
    }
    return true;
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showBrowseDialog, setShowBrowseDialog] = useState(false);
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('online');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Load user's joined channels
  const { data: joinedChannels, refetch: refetchJoined } = api.post.getUserJoinedChannels.useQuery(
    { userId: user?.uid || '' },
    { enabled: !!user?.uid }
  );

  // Load all public channels for discovery
  const { data: allChannels, refetch: refetchAllChannels } = api.post.getAllPublicChannels.useQuery();

  // Load starred channels for current user
  const { data: starredChannelIds = [], refetch: refetchStarred } = api.post.getStarredChannels.useQuery(
    { userId: user?.uid || '' },
    { enabled: !!user?.uid }
  );

  // Mutations for star/unstar
  const starChannelMutation = api.post.starChannel.useMutation({
    onSuccess: () => {
      void refetchStarred();
    }
  });

  const unstarChannelMutation = api.post.unstarChannel.useMutation({
    onSuccess: () => {
      void refetchStarred();
    }
  });

  // Mutation for joining channels
  const joinChannelMutation = api.post.joinRoom.useMutation({
    onSuccess: (data, variables) => {
      void refetchJoined();
      setShowBrowseDialog(false);
      // Navigate to the joined channel
      onSelectChannel(variables.roomId);
    }
  });

  // Mutation for leaving channels
  const leaveChannelMutation = api.post.leaveRoom.useMutation({
    onSuccess: () => {
      void refetchJoined();
      // If leaving current channel, clear selection
      if (currentChannelId && currentChannelId === leaveChannelMutation.variables?.roomId) {
        // Navigate to first available channel or clear selection
        const otherChannels = channels.filter(c => c.id !== currentChannelId);
        if (otherChannels.length > 0) {
          onSelectChannel(otherChannels[0].id);
        }
      }
    }
  });

  // Compute channels from joined channels data
  const channels = useMemo<Channel[]>(() => {
    if (!joinedChannels) return [];
    return joinedChannels.map(room => ({
      id: room.id,
      name: room.name,
      description: room.description || undefined,
      isPrivate: false,
      participants: room.participantCount,
      isPinned: starredChannelIds.includes(room.id),
      unreadCount: unreadCounts[room.id] || undefined,
    }));
  }, [joinedChannels, starredChannelIds, unreadCounts]);

  // Listen for unread count updates from socket
  useEffect(() => {
    if (socket && user?.uid) {
      const handleSidebarUnread = (data: { roomId: string; userId: string; unreadCount: number }) => {
        if (data.userId === user.uid) {
          setUnreadCounts(prev => ({ ...prev, [data.roomId]: data.unreadCount }));
        }
      };

      socket.on('sidebar-unread', handleSidebarUnread);

      return () => {
        socket.off('sidebar-unread', handleSidebarUnread);
      };
    }
  }, [socket, user?.uid]);


  // TODO: Load real direct messages
  useEffect(() => {
    setDirectMessages([]);
  }, []);

  const filteredChannels = useMemo(() =>
    channels.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.isPinned
    ), [channels, searchQuery]);

  const filteredDMs = useMemo(() =>
    directMessages.filter(dm =>
      dm.userName.toLowerCase().includes(searchQuery.toLowerCase())
    ), [directMessages, searchQuery]);

  const starredChannels = useMemo(() =>
    channels.filter(c => c.isPinned), [channels]);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'online': return <Circle className="h-2 w-2 fill-green-500 text-green-500" />;
      case 'away': return <Moon className="h-2 w-2 fill-yellow-500 text-yellow-500" />;
      case 'busy': return <Circle className="h-2 w-2 fill-red-500 text-red-500" />;
      default: return <Circle className="h-2 w-2 fill-gray-400 text-gray-400" />;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };


  const handleToggleStar = async (channelId: string, isStarred: boolean) => {
    if (!user?.uid) return;

    if (isStarred) {
      await unstarChannelMutation.mutateAsync({ userId: user.uid, channelId });
    } else {
      await starChannelMutation.mutateAsync({
        userId: user.uid,
        channelId,
        userName: user.displayName || undefined,
        userEmail: user.email || undefined
      });
    }
  };

  const handleLeaveChannel = async (channelId: string) => {
    if (!user?.uid) return;

    // Emit leave-room event to Socket.io
    if (socket) {
      const channel = channels.find(c => c.id === channelId);
      if (channel) {
        socket.emit('leave-room', channel.name);
      }
    }

    // Update database
    await leaveChannelMutation.mutateAsync({
      userId: user.uid,
      roomId: channelId
    });
  };
  
  // Handlers for toggling sections with localStorage persistence
  const toggleStarred = () => {
    const newValue = !showStarred;
    setShowStarred(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-show-starred', String(newValue));
    }
  };
  
  const toggleChannels = () => {
    const newValue = !showChannels;
    setShowChannels(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-show-channels', String(newValue));
    }
  };
  
  const toggleDMs = () => {
    const newValue = !showDMs;
    setShowDMs(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-show-dms', String(newValue));
    }
  };

  return (
    <>
      <div className="w-64 bg-secondary/30 border-r flex flex-col h-screen">
        {/* Workspace Header */}
        <div className="p-4 border-b">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-auto p-2 hover:bg-accent hover:text-accent-foreground">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 gradient-bg rounded-lg">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">ever.chat</p>
                    <p className="text-xs text-muted-foreground">10,234 online</p>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Workspace</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Users className="mr-2 h-4 w-4" />
                Invite people
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>


        {/* Channels & DMs */}
        <ScrollArea className="flex-1 mt-4">
          <div className="px-2 pb-4">
            {/* Starred */}
            {starredChannels.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between px-2 h-7">
                  <button
                    className="flex items-center flex-1 px-1"
                    onClick={toggleStarred}
                  >
                    {showStarred ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                    <Star className="h-3 w-3 mr-1" />
                    <span className="text-xs font-semibold">Starred</span>
                  </button>
                </div>
                {showStarred && (
                  <div className="mt-1 space-y-0.5">
                    {starredChannels.map(channel => (
                      <div key={channel.id} className="flex items-center group">
                        <div
                          className={cn(
                            "flex-1 flex items-center justify-between px-2 h-7 rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-all duration-150",
                            currentChannelId === channel.id && "bg-primary/10 text-primary hover:bg-primary/15"
                          )}
                          onClick={() => onSelectChannel(channel.id)}
                        >
                          <div className="flex items-center">
                            <Hash className="h-3 w-3 mr-1.5" />
                            <span className="text-sm">{channel.name}</span>
                          </div>
                          {channel.unreadCount > 0 ? (
                            <Badge className="ml-auto h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                              {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                            </Badge>
                          ) : null}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="h-7 w-7 p-0 hover:bg-secondary/50 rounded-md flex items-center justify-center transition-all duration-150"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleToggleStar(channel.id, channel.isPinned || false);
                              }}
                            >
                              <Star className="mr-2 h-4 w-4 fill-yellow-500 text-yellow-500" />
                              Unstar Channel
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleLeaveChannel(channel.id);
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              Leave Channel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Channels */}
            <div className="mb-4">
              <div className="flex items-center justify-between px-2 h-7">
                <button
                  className="flex items-center flex-1 px-1"
                  onClick={toggleChannels}
                >
                  {showChannels ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                  <span className="text-xs font-semibold">My Channels</span>
                </button>
                <button
                  className="h-5 w-5 p-0 hover:bg-secondary/50 rounded-md flex items-center justify-center transition-all duration-150"
                  onClick={(e) => {
                    e.stopPropagation();
                    void refetchAllChannels(); // Refresh channels when opening dialog
                    setShowBrowseDialog(true);
                  }}
                >
                  <Plus className="h-3 w-3 hover:text-accent-foreground" />
                </button>
              </div>
              {showChannels && (
                <div className="mt-1 space-y-0.5">
                  {filteredChannels.length === 0 ? (
                    <div className="px-2 py-4 text-center">
                      <p className="text-xs text-muted-foreground mb-2">
                        {channels.length === 0 
                          ? "No channels joined yet" 
                          : "All channels are starred"}
                      </p>
                      {channels.length === 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setShowBrowseDialog(true)}
                        >
                          <Search className="h-3 w-3 mr-1" />
                          Join Channels
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredChannels.map(channel => (
                    <div key={channel.id} className="flex items-center group">
                      <div
                        className={cn(
                          "flex-1 flex items-center justify-between px-2 h-7 rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-all duration-150",
                          currentChannelId === channel.id && "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                        onClick={() => onSelectChannel(channel.id)}
                      >
                        <div className="flex items-center">
                          {channel.isPrivate ? (
                            <Lock className="h-3 w-3 mr-1.5" />
                          ) : (
                            <Hash className="h-3 w-3 mr-1.5" />
                          )}
                          <span className="text-sm">{channel.name}</span>
                        </div>
                        {channel.unreadCount > 0 ? (
                          <Badge className="ml-auto h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                            {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                          </Badge>
                        ) : null}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-all hover:bg-secondary/50 rounded-md flex items-center justify-center duration-150"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleToggleStar(channel.id, channel.isPinned || false);
                            }}
                          >
                            <Star className={cn(
                              "mr-2 h-4 w-4",
                              channel.isPinned ? "fill-yellow-500 text-yellow-500" : ""
                            )} />
                            {channel.isPinned ? 'Unstar' : 'Star'} Channel
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleLeaveChannel(channel.id);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Leave Channel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))
                  )}
                </div>
              )}
            </div>

            {/* Direct Messages */}
            <div className="mb-4">
              <div className="flex items-center justify-between px-2 h-7">
                <button
                  className="flex items-center flex-1 px-1"
                  onClick={toggleDMs}
                >
                  {showDMs ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                  <span className="text-xs font-semibold">Direct Messages</span>
                </button>
              </div>
              {showDMs && (
                <div className="mt-1 space-y-0.5">
                  {filteredDMs.length === 0 ? (
                    <div className="px-2 py-4 text-center">
                      <p className="text-xs text-muted-foreground">No direct messages</p>
                    </div>
                  ) : (
                    filteredDMs.map(dm => (
                      <div key={dm.id} className="flex items-center group">
                        <div
                          className={cn(
                            "flex-1 flex items-center justify-between px-2 h-7 rounded-md cursor-pointer hover:bg-accent hover:text-accent-foreground transition-all duration-150"
                          )}
                          onClick={() => onSelectDM?.(dm.userId)}
                        >
                          <div className="flex items-center">
                            <div className="relative mr-2">
                              <Avatar className="h-4 w-4">
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(dm.userName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="absolute -bottom-0.5 -right-0.5">
                                {getStatusIcon(dm.status)}
                              </div>
                            </div>
                            <span className="text-sm">{dm.userName}</span>
                            {dm.isTyping && (
                              <span className="text-xs text-muted-foreground italic ml-2">typing...</span>
                            )}
                          </div>
                          {dm.unreadCount > 0 ? (
                            <Badge className="ml-auto h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                              {dm.unreadCount > 99 ? '99+' : dm.unreadCount}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* User Profile */}
        <div className="p-3 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start h-auto p-2 hover:bg-accent hover:text-accent-foreground">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarFallback className="text-xs">
                    {getInitials(user?.displayName || 'User')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{user?.displayName || 'Anonymous'}</p>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(userStatus)}
                    <span className="text-xs text-muted-foreground capitalize">{userStatus}</span>
                  </div>
                </div>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.displayName || 'Anonymous'}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setUserStatus('online')}>
                <Circle className="mr-2 h-3 w-3 fill-green-500 text-green-500" />
                Online
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUserStatus('away')}>
                <Moon className="mr-2 h-3 w-3 fill-yellow-500 text-yellow-500" />
                Away
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUserStatus('busy')}>
                <Circle className="mr-2 h-3 w-3 fill-red-500 text-red-500" />
                Busy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setUserStatus('offline')}>
                <Circle className="mr-2 h-3 w-3 fill-gray-400 text-gray-400" />
                Appear offline
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Browse Channels Dialog */}
      <Dialog open={showBrowseDialog} onOpenChange={setShowBrowseDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Join Channels</DialogTitle>
            <DialogDescription>
              Browse and join available channels
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search channels..."
                className="pl-9"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {(() => {
                  const filteredChannels = allChannels?.filter(channel =>
                    channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    channel.topic.toLowerCase().includes(searchQuery.toLowerCase())
                  ) || [];

                  if (filteredChannels.length === 0 && searchQuery.trim()) {
                    return (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground mb-4">
                          No channels found matching "{searchQuery}"
                        </p>
                        <Button
                          onClick={() => {
                            if (onCreateChannel) {
                              onCreateChannel(searchQuery.trim().toLowerCase().replace(/\s+/g, '-'));
                              setShowBrowseDialog(false);
                            }
                          }}
                          className="gradient-bg text-white"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create #{searchQuery.trim().toLowerCase().replace(/\s+/g, '-')}
                        </Button>
                      </div>
                    );
                  }

                  return filteredChannels.map(channel => {
                  const isJoined = joinedChannels?.some(jc => jc.id === channel.id);
                  return (
                    <div
                      key={channel.id}
                      className={cn(
                        "relative p-4 rounded-lg border transition-all duration-200",
                        !isJoined && "cursor-pointer hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm",
                        isJoined && "opacity-60 bg-muted/30"
                      )}
                      onClick={() => {
                        if (!isJoined && user?.uid && !joinChannelMutation.isPending) {
                          joinChannelMutation.mutate({
                            roomId: channel.id,
                            userId: user.uid,
                            userName: user.displayName || undefined,
                            userEmail: user.email || undefined
                          });
                        } else if (isJoined) {
                          // If already joined, navigate to the channel
                          onSelectChannel(channel.id);
                          setShowBrowseDialog(false);
                        }
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center">
                          <Hash className="h-4 w-4 mr-2" />
                          <span className="font-medium">{channel.name}</span>
                          {channel.featured && (
                            <Badge variant="secondary" className="ml-2 text-xs">Featured</Badge>
                          )}
                        </div>
                        {channel.description && (
                          <p className="text-sm text-muted-foreground mt-1">{channel.description}</p>
                        )}
                        <div className="flex items-center mt-2 text-xs text-muted-foreground">
                          <Users className="h-3 w-3 mr-1" />
                          <span>{channel.participantCount}/{channel.maxParticipants} members</span>
                        </div>
                      </div>
                      {isJoined && (
                        <div className="absolute top-4 right-4">
                          <Badge variant="outline" className="text-xs">Joined</Badge>
                        </div>
                      )}
                    </div>
                  );
                });
                })()}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBrowseDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}