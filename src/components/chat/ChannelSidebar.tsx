'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '~/contexts/AuthContext';
import { useSocket } from '~/hooks/useSocket';
import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { Avatar, AvatarFallback } from '~/components/ui/avatar';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Separator } from '~/components/ui/separator';
import { Input } from '~/components/ui/input';
import { Badge } from '~/components/ui/badge';
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
  Headphones,
  Video,
  Phone,
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
import { Textarea } from '~/components/ui/textarea';

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
  onCreateChannel?: () => void;
}

export function ChannelSidebar({ 
  currentChannelId, 
  onSelectChannel,
  onSelectDM,
  onCreateChannel 
}: ChannelSidebarProps) {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([]);
  const [showChannels, setShowChannels] = useState(true);
  const [showDMs, setShowDMs] = useState(true);
  const [showStarred, setShowStarred] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'busy' | 'offline'>('online');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Load real channels from database
  const { data: rooms } = api.post.getRooms.useQuery();
  
  useEffect(() => {
    if (rooms) {
      setChannels(rooms.map(room => ({
        id: room.id,
        name: room.name,
        description: undefined, // Description not included in getRooms query
        isPrivate: false, // Default to public since isPublic not included
        participants: room.participantCount,
        isPinned: room.featured,
        unreadCount: unreadCounts[room.id] || 0,
      })));
    }
  }, [rooms, unreadCounts]);

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

  const filteredChannels = channels.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDMs = directMessages.filter(dm => 
    dm.userName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const starredChannels = channels.filter(c => c.isPinned);

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

  const handleCreateChannel = () => {
    // Create channel logic here
    setShowCreateDialog(false);
    setNewChannelName('');
    setNewChannelDescription('');
    setNewChannelPrivate(false);
  };

  return (
    <>
      <div className="w-64 bg-secondary/30 border-r flex flex-col h-screen">
        {/* Workspace Header */}
        <div className="p-4 border-b">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-between h-auto p-2 hover:bg-secondary/50">
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

        {/* User Status */}
        <div className="px-4 py-3 border-b">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-start h-auto p-2">
                <Avatar className="h-7 w-7 mr-2">
                  <AvatarFallback className="text-xs">
                    {getInitials(user?.displayName || 'User')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">{user?.displayName || 'Anonymous'}</p>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(userStatus)}
                    <span className="text-xs text-muted-foreground">{userStatus}</span>
                  </div>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search channels & people"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 bg-background/50 border-0 focus:bg-background"
            />
          </div>
        </div>

        {/* Channels & DMs */}
        <ScrollArea className="flex-1">
          <div className="px-2 pb-4">
            {/* Starred */}
            {starredChannels.length > 0 && (
              <div className="mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between px-2 h-7 hover:bg-transparent"
                  onClick={() => setShowStarred(!showStarred)}
                >
                  <div className="flex items-center">
                    {showStarred ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                    <Star className="h-3 w-3 mr-1" />
                    <span className="text-xs font-semibold">Starred</span>
                  </div>
                </Button>
                {showStarred && (
                  <div className="mt-1 space-y-0.5">
                    {starredChannels.map(channel => (
                      <Button
                        key={channel.id}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-between px-6 h-7",
                          currentChannelId === channel.id && "bg-primary/10 text-primary"
                        )}
                        onClick={() => onSelectChannel(channel.id)}
                      >
                        <div className="flex items-center">
                          <Hash className="h-3 w-3 mr-1.5" />
                          <span className="text-sm">{channel.name}</span>
                        </div>
                        {channel.unreadCount > 0 && (
                          <Badge className="ml-auto h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                            {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                          </Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Channels */}
            <div className="mb-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between px-2 h-7 hover:bg-transparent"
                onClick={() => setShowChannels(!showChannels)}
              >
                <div className="flex items-center">
                  {showChannels ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                  <span className="text-xs font-semibold">Channels</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateDialog(true);
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </Button>
              {showChannels && (
                <div className="mt-1 space-y-0.5">
                  {filteredChannels.map(channel => (
                    <Button
                      key={channel.id}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-between px-6 h-7 group",
                        currentChannelId === channel.id && "bg-primary/10 text-primary"
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
                      {channel.unreadCount > 0 && (
                        <Badge className="ml-auto h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                          {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Messages */}
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between px-2 h-7 hover:bg-transparent"
                onClick={() => setShowDMs(!showDMs)}
              >
                <div className="flex items-center">
                  {showDMs ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                  <span className="text-xs font-semibold">Direct Messages</span>
                </div>
                <Plus className="h-3 w-3" />
              </Button>
              {showDMs && (
                <div className="mt-1 space-y-0.5">
                  {filteredDMs.map(dm => (
                    <Button
                      key={dm.id}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-between px-6 h-8 group"
                      )}
                      onClick={() => onSelectDM?.(dm.userId)}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <Avatar className="h-5 w-5">
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
                          <span className="text-xs text-muted-foreground italic">typing...</span>
                        )}
                      </div>
                      {dm.unreadCount > 0 && (
                        <Badge className="ml-auto h-5 px-1.5 text-xs bg-primary text-primary-foreground">
                          {dm.unreadCount > 99 ? '99+' : dm.unreadCount}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t">
          <div className="flex items-center justify-around">
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Headphones className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Create Channel Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a channel</DialogTitle>
            <DialogDescription>
              Channels are where your team communicates. They&apos;re best when organized around a topic.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Name</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="channel-name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="e.g. plan-budget"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-desc">Description (optional)</Label>
              <Textarea
                id="channel-desc"
                value={newChannelDescription}
                onChange={(e) => setNewChannelDescription(e.target.value)}
                placeholder="What&apos;s this channel about?"
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="private"
                checked={newChannelPrivate}
                onChange={(e) => setNewChannelPrivate(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="private" className="text-sm font-normal">
                Make private
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateChannel} disabled={!newChannelName.trim()}>
              Create Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}