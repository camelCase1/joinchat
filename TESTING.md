# Join.Chat Testing Guide

## Quick Start Testing

### 1. Start the Application
```bash
npm run dev:full
```

This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### 2. Test Authentication
1. Go to http://localhost:3000
2. You should be redirected to `/auth`
3. Click "Create one here" to sign up
4. Fill in:
   - Display Name: "TestUser"
   - Email: "test@example.com"
   - Password: "password123"
   - Confirm Password: "password123"
5. Click "Create Account"
6. You should be logged in and see the main dashboard

### 3. Test Room Features
1. **Browse Rooms**: You should see default rooms (general, tech, gaming, music, movies)
2. **Create Room**: Click "Create Room" button, enter "test-room", click "Create Room"
3. **Join Room**: Click "Join Room" on any available room
4. **Search**: Type in search bar to filter rooms

### 4. Test Chat Features
1. **Send Message**: Type a message and press Enter or click Send
2. **@Mentions**: Type `@` followed by a username to see autocomplete
3. **Mute Users**: Hover over a user in the sidebar and click the mute button
4. **Leave Room**: Click "Leave" button to return to room list

### 5. Test Real-time Features
1. Open another browser window/tab with http://localhost:3000
2. Sign up with different credentials
3. Join the same room from both windows
4. Send messages from one window, see them appear in the other

### 6. Test User Profiles
1. Check the participants sidebar to see user badges
2. Send multiple messages to increase trust score and message count
3. User badges should update based on activity

### 7. Test Recent Chats
1. Join multiple rooms
2. Check the left sidebar for recent chat history
3. Click on recent chats to switch between rooms

## Features to Test

### ✅ Core Features
- [x] User authentication (signup/login)
- [x] Room discovery and creation
- [x] Real-time messaging
- [x] User presence indicators
- [x] Room capacity limits (30 users)
- [x] Auto-routing when rooms are full

### ✅ Advanced Features
- [x] @mention autocomplete with keyboard navigation
- [x] User muting (client-side filtering)
- [x] Trust score system and badges
- [x] Recent chats sidebar with unread counts
- [x] Auto-kick for idle users (30min timeout)
- [x] Search and filtering
- [x] Responsive design

### 🔧 Debug Features
- [x] Connection status indicator (bottom right)
- [x] Console logging for socket events
- [x] Toast notifications for user actions
- [x] Error handling and user feedback

## Expected Behavior

### Room Limits
- Each room has a 30-person limit
- When full, users get redirected to alternative rooms with same name
- If no alternatives, shows "Room is full" error

### Trust Score System
- New users start with 50% trust score
- Score increases slightly with each message sent (+0.1%)
- Badges earned based on activity and trust level

### Auto-kick System
- Users idle for 30+ minutes get automatically kicked
- Server checks every 5 minutes for idle users
- Kicked users get notification and return to lobby

### Real-time Updates
- Messages appear instantly across all connected clients
- User join/leave notifications
- Room participant counts update in real-time
- Connection status shown in bottom right

## Troubleshooting

### Connection Issues
1. Check console for socket connection errors
2. Verify both servers are running on correct ports
3. Check connection status indicator (green = connected)

### No Rooms Showing
1. Check server console for errors
2. Verify socket connection is established
3. Try refreshing the page

### Messages Not Sending
1. Check if connected to socket server
2. Verify you're in a room (participant sidebar visible)
3. Check browser console for errors

### Authentication Issues
1. Check localStorage in browser dev tools
2. Try clearing localStorage and re-registering
3. Verify auth context is providing user data

## Development Notes

- Frontend: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- Backend: Express + Socket.io + Prisma + SQLite
- Real-time: Socket.io for messaging and presence
- State: React hooks + localStorage for persistence
- Authentication: Simple localStorage-based auth (demo purposes)