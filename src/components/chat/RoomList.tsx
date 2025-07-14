'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '~/hooks/useSocket';
import { useAuth } from '~/contexts/AuthContext';
import { api } from '~/trpc/react';
import toast from 'react-hot-toast';

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
      staleTime: 30000, // Consider data fresh for 30 seconds
      gcTime: 300000, // Keep in cache for 5 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
    }
  );
  const createRoomMutation = api.post.createRoom.useMutation({
    onSuccess: (newRoom) => {
      toast.success('Room created successfully!');
      
      // Refresh the Socket.io server's room cache
      if (socket) {
        socket.emit('refresh-rooms-cache');
      }
      
      void refetchRooms(); // Refresh the room list
      onJoinRoom(newRoom.id);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  // Refresh rooms periodically to get updated participant counts
  useEffect(() => {
    const interval = setInterval(() => {
      void refetchRooms();
    }, 30000); // Refresh every 30 seconds (reduced frequency)

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove refetchRooms from dependencies to prevent infinite loop

  const getStatusColor = (participantCount: number, maxParticipants: number) => {
    const ratio = participantCount / maxParticipants;
    if (ratio >= 1) return 'bg-red-100 text-red-700';
    if (ratio >= 0.8) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getStatusText = (participantCount: number, maxParticipants: number) => {
    if (participantCount >= maxParticipants) return 'Full';
    if (participantCount >= maxParticipants * 0.8) return 'Busy';
    return 'Available';
  };

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

  const searchResults = searchTerm.trim() ? filteredRooms.slice(0, 8) : []; // Limit to 8 results for dropdown
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
      setSelectedRoomIndex(prev => 
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedRoomIndex(prev => 
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
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
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 md:mb-12 pb-4 md:pb-6 border-b border-gray-200">
          <div className="mb-4 md:mb-0">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Join.Chat</h1>
            <p className="text-gray-600 text-sm md:text-lg">The people platform—Where interests become conversations</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Room
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8 md:mb-12 max-w-lg mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              onFocus={() => searchTerm.trim() && setShowSearchDropdown(true)}
              placeholder="Search for chat rooms..."
              className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
            />
            
            {/* Search Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchResults.map((room, index) => (
                  <button
                    key={room.id}
                    onClick={() => handleRoomSelect(room.id)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                      index === selectedRoomIndex 
                        ? 'bg-red-50 border-l-4 border-l-red-500' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span className="text-gray-600 font-bold text-sm">#</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{room.name}</p>
                          <p className="text-sm text-gray-500">
                            {room.participantCount} of {room.maxParticipants} people
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {room.featured && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                            POPULAR
                          </span>
                        )}
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(room.participantCount, room.maxParticipants)}`}>
                          {getStatusText(room.participantCount, room.maxParticipants)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Featured Rooms */}
        {featuredRooms.length > 0 && (
          <div className="mb-16">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Chat Rooms</h2>
            <div className="grid gap-4 md:gap-6 grid-cols-2 md:grid-cols-3">
              {featuredRooms.map((room) => (
                <div key={room.id} className="room-card p-4 bg-red-50 border-red-200 text-sm">
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900">{room.name}</h3>
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">
                        POPULAR
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600 text-xs">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 715 0z" />
                      </svg>
                      <span>{room.participantCount} attendees</span>
                    </div>
                  </div>
                  <p className="text-gray-600 mb-3 leading-relaxed text-xs">
                    Join the discussion about {room.name} and connect with others who share your interests.
                  </p>
                  <button
                    onClick={() => onJoinRoom(room.id)}
                    disabled={room.participantCount >= room.maxParticipants}
                    className="w-full btn btn-primary btn-sm disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {room.participantCount >= room.maxParticipants ? 'Room Full' : 'Join conversation'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Rooms */}
        <div className="overflow-y-auto max-h-[70vh]">
          {otherRooms.length > 0 && (
            <div className="mb-16">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">All chat rooms</h2>
              <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {otherRooms.map((room) => (
                  <div key={room.id} className="room-card p-6">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-semibold text-gray-900">{room.name}</h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(room.participantCount, room.maxParticipants)}`}>
                          {getStatusText(room.participantCount, room.maxParticipants)}
                        </span>
                      </div>
                      <div className="flex items-center text-gray-600 text-sm">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 715 0z" />
                        </svg>
                        <span>{room.participantCount} attendees</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      Join the discussion about {room.name} and connect with others who share your interests.
                    </p>
                    
                    <button
                      onClick={() => onJoinRoom(room.id)}
                      disabled={room.participantCount >= room.maxParticipants}
                      className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {room.participantCount >= room.maxParticipants ? 'Room Full' : 'Join conversation'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {filteredRooms.length === 0 && searchTerm && (
          <div className="text-center mt-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-800 text-lg font-medium">No rooms found matching &quot;{searchTerm}&quot;</p>
            <p className="text-gray-600 text-sm mt-2">Try searching for something else or create a new room</p>
          </div>
        )}

        {isLoading && (
          <div className="text-center mt-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            </div>
            <p className="text-gray-800 text-lg font-medium">Loading available rooms...</p>
            <p className="text-gray-600 text-sm mt-2">Finding the perfect conversations for you</p>
          </div>
        )}

        {!isLoading && rooms.length === 0 && !searchTerm && (
          <div className="text-center mt-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-800 text-lg font-medium">No rooms available yet</p>
            <p className="text-gray-600 text-sm mt-2">Be the first to create a room!</p>
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">Create New Room</h3>
            <div className="mb-6">
              <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-2">
                Room Name
              </label>
              <input
                id="roomName"
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Enter room name..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                maxLength={30}
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!newRoomName.trim()}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}