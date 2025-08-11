import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { ulid } from 'ulid';
import { db } from '../src/server/db.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:3000", "http://localhost:3002"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors());
app.use(express.json());

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

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video';
}

const chatRooms = new Map<string, ChatRoom>();
const userSockets = new Map<string, string>(); // userId -> socketId
const userActivity = new Map<string, Date>(); // userId -> lastActivity
const userProfiles = new Map<string, User>(); // userId -> User profile

// Function to calculate user badges based on activity and trust score
function calculateUserBadges(user: User): string[] {
  const badges: string[] = ['member'];

  // Time-based badges
  const accountAge = Date.now() - user.profileAge.getTime();
  const daysOld = accountAge / (1000 * 60 * 60 * 24);

  if (daysOld >= 30) badges.push('veteran');
  if (daysOld >= 7) badges.push('regular');

  // Activity-based badges
  if (user.messageCount >= 100) badges.push('active');
  if (user.messageCount >= 500) badges.push('chatty');
  if (user.messageCount >= 1000) badges.push('superstar');

  // Trust-based badges
  if (user.trustScore >= 50) badges.push('trusted');
  if (user.trustScore >= 80) badges.push('reliable');
  if (user.trustScore >= 95) badges.push('exemplary');

  return badges;
}

// Function to update user trust score
function updateTrustScore(userId: string, delta: number) {
  const user = userProfiles.get(userId);
  if (user) {
    user.trustScore = Math.max(0, Math.min(100, user.trustScore + delta));
    user.badges = calculateUserBadges(user);
    userProfiles.set(userId, user);
  }
}

// Auto-kick idle users after 30 minutes
const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

function checkIdleUsers() {
  const now = new Date();

  userActivity.forEach((lastActivity, userId) => {
    if (now.getTime() - lastActivity.getTime() > IDLE_TIMEOUT) {
      const socketId = userSockets.get(userId);
      if (socketId) {
        // Remove user from all rooms
        chatRooms.forEach((room, roomId) => {
          const userIndex = room.participants.findIndex(p => p.id === userId);
          if (userIndex !== -1) {
            const user = room.participants[userIndex];
            room.participants.splice(userIndex, 1);
            io.to(roomId).emit('user-left', {
              userId,
              participantCount: room.participants.length,
              reason: 'idle'
            });
            io.to(socketId).emit('kicked-for-idle');
            emitSidebarPresence(roomId);
          }
        });

        userSockets.delete(userId);
        userActivity.delete(userId);
      }
    }
  });
}

// Check for idle users every 5 minutes
setInterval(checkIdleUsers, 5 * 60 * 1000);

// Initialize database rooms cache
async function initializeRooms() {
  try {
    const dbRooms = await db.chatRoom.findMany();
    dbRooms.forEach(room => {
      // Store rooms by name for Socket.io room lookup
      chatRooms.set(room.name, {
        id: room.id,
        name: room.name,
        participants: [],
        messages: [],
        createdAt: room.createdAt,
        maxParticipants: room.maxParticipants
      });
    });
    console.log(`✅ Loaded ${dbRooms.length} rooms from database`);
  } catch (error) {
    console.error('❌ Error loading rooms from database:', error);
  }
}

// Initialize rooms on server start
initializeRooms();

// Track typing users per room for sidebar indicator
const roomTypingUsers = new Map<string, Set<string>>(); // roomId -> Set<userId>
const userIdToName = new Map<string, string>(); // userId -> displayName

// Helper to get all active userIds in a room
async function getActiveUserIdsInRoom(roomId: string) {
  const members = await db.roomMember.findMany({
    where: { roomId, isActive: true },
    select: { userId: true }
  });
  return members.map(m => m.userId);
}

function emitSidebarPresence(roomId: string) {
  const room = chatRooms.get(roomId);
  if (!room) return;
  const onlineUserIds = room.participants.map(p => p.id);
  const participantCount = room.participants.length;
  for (const userId of onlineUserIds) {
    io.to(userId).emit('sidebar-presence', { roomId, onlineUserIds, participantCount });
  }
}

io.on('connection', (socket) => {
  console.log('✅ User connected:', socket.id);

  // Send connection confirmation
  socket.emit('connected', { message: 'Connected to server successfully' });

  socket.on('join-room', async (data: any) => {
    // Support both roomName and roomId
    const roomName = data.roomName || data.roomId;
    const userId = data.userId;
    const userName = data.userName;
    
    // Create user data
    const userData = {
      id: userId,
      name: userName,
      avatar: undefined,
      badges: [],
      joinedAt: new Date()
    };
    
    let room = chatRooms.get(roomName);

    // If room doesn't exist in memory, try to load it from database
    if (!room) {
      try {
        const dbRoom = await db.chatRoom.findFirst({
          where: { name: roomName }
        });
        
        if (dbRoom) {
          // Add room to memory cache
          room = {
            id: dbRoom.id,
            name: dbRoom.name,
            participants: [],
            messages: [],
            createdAt: dbRoom.createdAt,
            maxParticipants: dbRoom.maxParticipants
          };
          chatRooms.set(roomName, room);
          console.log(`✅ Loaded room '${roomName}' from database`);
        } else {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
      } catch (error) {
        console.error('Error loading room from database:', error);
        socket.emit('error', { message: 'Failed to load room' });
        return;
      }
    }

    if (room.participants.length >= room.maxParticipants) {
      // Try to find an alternative room with the same name
      const alternativeRoom = Array.from(chatRooms.values()).find(r =>
        r.name === room.name && r.participants.length < r.maxParticipants
      );

      if (alternativeRoom) {
        socket.emit('room-redirect', { newRoomId: alternativeRoom.id });
        return;
      } else {
        socket.emit('error', { message: 'Room is full and no alternatives available' });
        return;
      }
    }

    // Get or create user profile
    let user = userProfiles.get(userData.id);
    if (!user) {
      user = {
        ...userData,
        trustScore: 50, // Start with neutral trust score
        profileAge: new Date(),
        messageCount: 0,
      };
      user.badges = calculateUserBadges(user!);
      userProfiles.set(userData.id, user!);
    } else {
      // Update user name if changed
      user.name = userData.name;
      user.badges = calculateUserBadges(user);
      userProfiles.set(userData.id, user);
    }

    // Remove user from previous rooms
    if (user) {
      chatRooms.forEach((r) => {
        r.participants = r.participants.filter(p => p.id !== user!.id);
      });

      // Add user to new room
      room.participants.push(user);
      userSockets.set(user.id, socket.id);
      userActivity.set(user.id, new Date());
    }

    // Update room member in database
    try {
      // First find the room in database
      const dbRoom = await db.chatRoom.findFirst({
        where: { name: roomName }
      });
      
      if (dbRoom) {
        // Find or create user in database
        let dbUser = user ? await db.user.findFirst({
          where: { displayName: user.name }
        }) : null;
        
        if (!dbUser && user) {
          dbUser = await db.user.create({
            data: {
              email: `${user.id}@temp.com`,
              displayName: user.name,
              password: null,
            }
          });
        }
        
        if (dbUser) {
          await db.roomMember.upsert({
            where: {
              userId_roomId: {
                userId: dbUser.id,
                roomId: dbRoom.id
              }
            },
            update: {
              isActive: true,
              lastSeen: new Date()
            },
            create: {
              userId: dbUser.id,
              roomId: dbRoom.id,
              isActive: true
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Error updating room member in database:', error);
    }

    socket.join(roomName);
    if (user) {
      socket.emit('room-joined', { 
        room: roomName,
        participants: room.participants,
        messages: []
      });
      socket.to(roomName).emit('user-joined', { 
        userId: user.id,
        userName: user.name,
        participants: room.participants 
      });
      emitSidebarPresence(roomName);
    }

    // Load recent messages from database
    try {
      // First find the room in database
      const dbRoom = await db.chatRoom.findFirst({
        where: { name: roomName }
      });
      
      if (!dbRoom) {
        socket.emit('room-joined', { 
          room: roomName,
          participants: room.participants,
          messages: []
        });
        return;
      }
      
      const recentMessages = await db.message.findMany({
        where: { roomId: dbRoom.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          user: {
            select: {
              displayName: true
            }
          }
        }
      });

      const formattedMessages = recentMessages.reverse().map(msg => ({
        id: msg.id,
        userId: msg.userId,
        userName: msg.user.displayName,
        content: msg.content,
        timestamp: msg.createdAt,
        type: msg.type.toLowerCase() as 'text' | 'image' | 'video'
      }));

      // Send room-joined event with messages
      socket.emit('room-joined', { 
        room: roomName,
        participants: room.participants,
        messages: formattedMessages
      });
    } catch (error) {
      console.error('❌ Error loading messages from database:', error);
      // Send room-joined event without messages on error
      socket.emit('room-joined', { 
        room: roomName,
        participants: room.participants,
        messages: []
      });
    }
  });

  socket.on('send-message', async (data: any) => {
    // Support both formats for backwards compatibility
    const roomName = data.roomName || data.roomId;
    const message = data.message || data;
    
    console.log('SERVER: send-message called', { roomName, message });
    
    let room = chatRooms.get(roomName);
    
    // If room doesn't exist in memory, try to load it from database
    if (!room) {
      try {
        const dbRoom = await db.chatRoom.findFirst({
          where: { name: roomName }
        });
        
        if (dbRoom) {
          // Add room to memory cache
          room = {
            id: dbRoom.id,
            name: dbRoom.name,
            participants: [],
            messages: [],
            createdAt: dbRoom.createdAt,
            maxParticipants: dbRoom.maxParticipants
          };
          chatRooms.set(roomName, room);
          console.log(`✅ Loaded room '${roomName}' from database for message send`);
        } else {
          console.error('Room not found in database:', roomName);
          socket.emit('error', { message: 'Room not found' });
          return;
        }
      } catch (error) {
        console.error('Error loading room from database:', error);
        socket.emit('error', { message: 'Failed to load room' });
        return;
      }
    }

    // Update user activity and profile
    userActivity.set(message.userId, new Date());

    // Update message count and trust score
    const user = userProfiles.get(message.userId);
    if (user) {
      user.messageCount++;
      // Small trust score increase for sending messages (participation)
      updateTrustScore(message.userId, 0.1);
    }

    const newMessage: Message = {
      ...message,
      id: ulid(),
      timestamp: new Date()
    };

    // Save message to database
    try {
      // First, find the room in database by name
      const dbRoom = await db.chatRoom.findFirst({
        where: { name: roomName }
      });
      
      if (dbRoom) {
        // Then find or create the user
        let dbUser = await db.user.findFirst({
          where: { displayName: message.userName }
        });
        
        if (!dbUser) {
          // Create a new user if doesn't exist
          dbUser = await db.user.create({
            data: {
              email: `${message.userId}@temp.com`,
              displayName: message.userName,
              password: null,
            }
          });
        }
        
        await db.message.create({
          data: {
            content: newMessage.content,
            type: newMessage.type.toUpperCase() as any,
            userId: dbUser.id,
            roomId: dbRoom.id,
          }
        });
      }
    } catch (error) {
      console.error('❌ Error saving message to database:', error);
    }

    room.messages.push(newMessage);

    // Keep only last 1000 messages in memory
    if (room.messages.length > 1000) {
      room.messages = room.messages.slice(-1000);
    }

    io.to(roomName).emit('new-message', newMessage);

    // After saving message, emit sidebar-unread to all room members except sender
    // Need to get the actual room ID from the database
    const dbRoom = await db.chatRoom.findFirst({
      where: { name: roomName }
    });
    
    if (dbRoom) {
      const userIds = await getActiveUserIdsInRoom(dbRoom.id);
      for (const uid of userIds) {
        if (uid !== message.userId) {
          // Get unread count for this user in this room
          const member = await db.roomMember.findFirst({ where: { userId: uid, roomId: dbRoom.id } });
          const unreadCount = await db.message.count({ 
            where: { 
              roomId: dbRoom.id, 
              createdAt: { gt: member?.lastSeen || new Date(0) }, 
              userId: { not: uid } 
            } 
          });
          io.to(uid).emit('sidebar-unread', { roomId: dbRoom.id, userId: uid, unreadCount });
        }
      }
    }
  });

  socket.on('leave-room', (roomName: string) => {
    // Support both object format and string format
    const roomToLeave = typeof roomName === 'string' ? roomName : (roomName as any).roomId || (roomName as any).roomName;
    const room = chatRooms.get(roomToLeave);

    if (room) {
      // Find user associated with this socket
      let userId: string | undefined;
      for (const [uid, sid] of userSockets.entries()) {
        if (sid === socket.id) {
          userId = uid;
          break;
        }
      }
      
      if (userId) {
        room.participants = room.participants.filter(p => p.id !== userId);
        userSockets.delete(userId);
      }
      
      socket.leave(roomToLeave);
      socket.to(roomToLeave).emit('user-left', { 
        userId, 
        participantCount: room.participants.length 
      });
      emitSidebarPresence(roomToLeave);
    }
  });

  // Refresh rooms cache when new rooms are created via tRPC
  socket.on('refresh-rooms-cache', async () => {
    try {
      const dbRooms = await db.chatRoom.findMany();

      // Add any new rooms to memory cache (store by name)
      dbRooms.forEach(room => {
        if (!chatRooms.has(room.name)) {
          chatRooms.set(room.name, {
            id: room.id,
            name: room.name,
            participants: [],
            messages: [],
            createdAt: room.createdAt,
            maxParticipants: room.maxParticipants
          });
        }
      });

      console.log(`✅ Refreshed rooms cache: ${chatRooms.size} rooms`);
    } catch (error) {
      console.error('❌ Error refreshing rooms cache:', error);
    }
  });

  socket.on('typing', ({ roomId, userId, displayName }) => {
    if (!roomId || !userId) return;
    if (!roomTypingUsers.has(roomId)) roomTypingUsers.set(roomId, new Set());
    roomTypingUsers.get(roomId)?.add(userId);
    if (displayName) userIdToName.set(userId, displayName);
    // Emit to all user sessions for this user
    const typingSet = roomTypingUsers.get(roomId);
    io.to(userId).emit('sidebar-typing', {
      roomId,
      typingUserNames: typingSet ? Array.from(typingSet).map(uid => userIdToName.get(uid) || 'Someone') : []
    });
  });

  socket.on('stop-typing', ({ roomId, userId }) => {
    if (!roomId || !userId) return;
    const typingSet = roomTypingUsers.get(roomId);
    if (typingSet) {
      typingSet.delete(userId);
      io.to(userId).emit('sidebar-typing', {
        roomId,
        typingUserNames: Array.from(typingSet).map(uid => userIdToName.get(uid) || 'Someone')
      });
    }
  });

  socket.on('message-read', ({ roomId, userId, messageId }) => {
    socket.to(roomId).emit('message-read', { userId, messageId });
  });

  socket.on('read-room', async ({ roomId, userId }) => {
    // Update lastSeen for this user in this room
    await db.roomMember.updateMany({ where: { userId, roomId }, data: { lastSeen: new Date() } });
    io.to(userId).emit('sidebar-unread', { roomId, userId, unreadCount: 0 });
  });

  socket.on('remove-room-from-recent', async ({ userId, roomId }) => {
    try {
      // Set isActive to false for this RoomMember entry in DB
      await db.roomMember.updateMany({
        where: { userId, roomId },
        data: { isActive: false },
      });
      // Emit real-time update to all sockets for this user
      io.to(userId).emit('recent-chats-updated', { userId });
    } catch (err) {
      socket.emit('error', { message: 'Failed to remove room from recent.' });
    }
  });

  socket.on('register-user', ({ userId, displayName }) => {
    if (userId) {
      socket.join(userId);
      if (displayName) userIdToName.set(userId, displayName);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Remove user from all rooms
    const userId = Array.from(userSockets.entries()).find(([, socketId]) => socketId === socket.id)?.[0];

    if (userId) {
      chatRooms.forEach((room, roomId) => {
        const userIndex = room.participants.findIndex(p => p.id === userId);
        if (userIndex !== -1) {
          room.participants.splice(userIndex, 1);
          socket.to(roomId).emit('user-left', { userId, participantCount: room.participants.length });
        }
      });

      userSockets.delete(userId);
    }

    // Remove user from all typing sets
    let disconnectedUserId;
    for (const [id] of userIdToName.entries()) {
      if (userSockets.get(id) === socket.id) {
        disconnectedUserId = id;
        break;
      }
    }
    if (disconnectedUserId) {
      for (const [, set] of roomTypingUsers.entries()) {
        set.delete(disconnectedUserId);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown handlers
const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  
  // Close all socket connections
  io.close(() => {
    console.log('Socket.io connections closed');
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force exit after 5 seconds if graceful shutdown fails
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 5000);
};

// Handle termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle tsx hot reload signal
process.on('SIGUSR2', () => {
  console.log('Received SIGUSR2, reloading...');
  gracefulShutdown();
});