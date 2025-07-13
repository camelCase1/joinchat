'use client';

import { useState, useEffect } from 'react';
import { useSocket } from '~/hooks/useSocket';
import { useAuth } from '~/contexts/AuthContext';
import { api } from '~/trpc/react';
import toast from 'react-hot-toast';

// interface Room {
//   id: string;
//   name: string;
//   participantCount: number;
//   maxParticipants: number;
//   createdAt: Date;
//   featured?: boolean;
// }

interface RoomListProps {
  onJoinRoom: (roomId: string) => void;
}

export function RoomList({ onJoinRoom }: RoomListProps) {
  const { socket } = useSocket();
  const { logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showRecentChats, setShowRecentChats] = useState(false);

  // Use tRPC to fetch rooms
  const { data: rooms = [], refetch: refetchRooms, isLoading } = api.post.getRooms.useQuery();
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
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [refetchRooms]);

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

  const featuredRooms = filteredRooms.filter(room => room.featured || room.participantCount > 0).slice(0, 6);
  const otherRooms = filteredRooms.filter(room => !featuredRooms.includes(room));

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-12 pb-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowRecentChats(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Open recent chats"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Join.Chat</h1>
              <p className="text-gray-600 text-lg">The people platform—Where interests become conversations</p>
            </div>
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
            <button
              onClick={logout}
              className="btn btn-secondary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-12 max-w-lg mx-auto">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for chat rooms..."
              className="block w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-lg"
            />
          </div>
        </div>

        {/* Featured Rooms */}
        {featuredRooms.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Popular chat rooms</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredRooms.map((room) => (
                <div key={room.id} className="room-card p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xl font-semibold text-gray-900">{room.name}</h3>
                      <span className="px-3 py-1 bg-red-500 text-white text-xs font-semibold rounded-full">
                        POPULAR
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600 text-sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
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

        {/* All Rooms */}
        {otherRooms.length > 0 && (
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">All chat rooms</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

      {/* Recent Chats Sidebar */}
      {showRecentChats && (
        <div className="fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowRecentChats(false)}
          ></div>
          
          {/* Sidebar */}
          <div className="absolute left-0 top-0 h-full w-80 bg-white shadow-xl">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Recent Chats</h2>
                <button
                  onClick={() => setShowRecentChats(false)}
                  className="p-1 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {/* Recent chats will be loaded from localStorage or context */}
              <div className="space-y-3">
                {typeof window !== 'undefined' && localStorage.getItem('recentChats') ? (
                  JSON.parse(localStorage.getItem('recentChats') || '[]').map((chat: { roomId: string; roomName: string; lastMessageTime: string }, index: number) => (
                    <div 
                      key={index}
                      className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        onJoinRoom(chat.roomId);
                        setShowRecentChats(false);
                      }}
                    >
                      <h3 className="font-medium text-gray-900">{chat.roomName}</h3>
                      <p className="text-sm text-gray-500">
                        Last active: {new Date(chat.lastMessageTime).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-gray-500">No recent chats yet</p>
                    <p className="text-sm text-gray-400 mt-1">Start a conversation to see your chat history</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}