'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '~/hooks/useSocket';
import { useAuth } from '~/contexts/AuthContext';
import { api } from '~/trpc/react';
import toast from 'react-hot-toast';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '~/components/ui/dialog';
import { Badge } from '~/components/ui/badge';
import { Label } from '~/components/ui/label';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Search, Plus, Users, Hash, TrendingUp } from 'lucide-react';

interface RoomListProps {
  onJoinRoom: (roomId: string) => void;
}

export function RoomList({ onJoinRoom }: RoomListProps) {
  const { socket } = useSocket();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);

  // Use tRPC to fetch rooms with caching
  const { data: rooms = [], refetch: refetchRooms, isLoading } = api.post.getRooms.useQuery(
    undefined,
    {
      staleTime: 30000,
      gcTime: 300000,
      refetchOnWindowFocus: false,
    }
  );

  const createRoomMutation = api.post.createRoom.useMutation({
    onSuccess: (newRoom) => {
      toast.success('Room created successfully!');
      if (socket) {
        socket.emit('refresh-rooms-cache');
      }
      void refetchRooms();
      onJoinRoom(newRoom.id);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Refresh rooms periodically
  useEffect(() => {
    const interval = setInterval(() => {
      void refetchRooms();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = () => {
    if (!newRoomName.trim()) return;
    createRoomMutation.mutate({
      name: newRoomName.trim(),
      topic: newRoomName.trim().toLowerCase()
    });
    setNewRoomName('');
    setShowCreateModal(false);
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const searchResults = searchTerm.trim() ? filteredRooms.slice(0, 8) : [];
  const featuredRooms = filteredRooms.filter(room => room.featured || room.participantCount > 0).slice(0, 6);
  const otherRooms = filteredRooms.filter(room => !featuredRooms.includes(room));

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSearchDropdown(value.trim().length > 0);
    setSelectedRoomIndex(0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSearchDropdown || searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedRoomIndex(prev => prev < searchResults.length - 1 ? prev + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedRoomIndex(prev => prev > 0 ? prev - 1 : searchResults.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults[selectedRoomIndex]) {
        onJoinRoom(searchResults[selectedRoomIndex].id);
        setSearchTerm('');
        setShowSearchDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowSearchDropdown(false);
    }
  };

  const handleRoomSelect = (roomId: string) => {
    onJoinRoom(roomId);
    setSearchTerm('');
    setShowSearchDropdown(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Chat Rooms</h1>
            <p className="text-muted-foreground mt-1">Join a conversation or start your own</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Room
          </Button>
        </div>

        {/* Search Bar */}
        <div className="mb-8 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              onFocus={() => searchTerm.trim() && setShowSearchDropdown(true)}
              placeholder="Search rooms..."
              className="pl-9"
            />

            {/* Search Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <Card className="absolute top-full left-0 right-0 mt-2 z-50">
                <ScrollArea className="max-h-80">
                  {searchResults.map((room, index) => (
                    <button
                      key={room.id}
                      onClick={() => handleRoomSelect(room.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-accent transition-colors ${
                        index === selectedRoomIndex ? 'bg-accent' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{room.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {room.participantCount}/{room.maxParticipants} users
                            </p>
                          </div>
                        </div>
                        {room.featured && <Badge variant="secondary">Popular</Badge>}
                      </div>
                    </button>
                  ))}
                </ScrollArea>
              </Card>
            )}
          </div>
        </div>

        {/* Featured Rooms */}
        {featuredRooms.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5" />
              <h2 className="text-xl font-semibold">Popular Rooms</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {featuredRooms.map((room) => (
                <Card key={room.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{room.name}</CardTitle>
                      {room.featured && <Badge>Popular</Badge>}
                    </div>
                    <CardDescription className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{room.participantCount}/{room.maxParticipants} users</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => onJoinRoom(room.id)}
                      disabled={room.participantCount >= room.maxParticipants}
                      className="w-full"
                      size="sm"
                    >
                      {room.participantCount >= room.maxParticipants ? 'Full' : 'Join'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Rooms */}
        {otherRooms.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">All Rooms</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {otherRooms.map((room) => (
                <Card key={room.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{room.name}</CardTitle>
                    <CardDescription className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{room.participantCount}/{room.maxParticipants} users</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => onJoinRoom(room.id)}
                      disabled={room.participantCount >= room.maxParticipants}
                      className="w-full"
                      size="sm"
                      variant={room.participantCount >= room.maxParticipants ? "secondary" : "default"}
                    >
                      {room.participantCount >= room.maxParticipants ? 'Full' : 'Join'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty States */}
        {filteredRooms.length === 0 && searchTerm && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No rooms found</p>
            <p className="text-muted-foreground mt-1">Try a different search term</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading rooms...</p>
          </div>
        )}

        {!isLoading && rooms.length === 0 && !searchTerm && (
          <div className="text-center py-12">
            <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No rooms yet</p>
            <p className="text-muted-foreground mt-1">Be the first to create one!</p>
            <Button onClick={() => setShowCreateModal(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Create First Room
            </Button>
          </div>
        )}
      </div>

      {/* Create Room Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Room</DialogTitle>
            <DialogDescription>
              Give your room a name. Others can join and start chatting right away.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roomName">Room name</Label>
              <Input
                id="roomName"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="e.g. Tech Talk, Music Lovers..."
                maxLength={30}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRoom} disabled={!newRoomName.trim()}>
              Create Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}