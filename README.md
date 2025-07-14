# Join.Chat

A community-owned, AI-moderated messaging platform combining the best of Discord and Reddit—focused, topic-based conversations in small, 30-person chat rooms.

## Features

- **Topic-based chat rooms** - Organized discussions around specific topics
- **30-person room limits** - Reduced clutter, meaningful conversations
- **Community ownership** - No designated room owners, shared governance
- **Real-time messaging** - Powered by Socket.io
- **User authentication** - Firebase-based auth system
- **Profile badges** - Display user credibility and community trust
- **Auto-routing** - Automatically routes to alternative rooms when full
- **Modern UI** - Built with shadcn/ui components

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Backend**: Express.js, Socket.io
- **Authentication**: Firebase Auth
- **UI Components**: shadcn/ui, Tailwind CSS
- **Database**: Prisma (SQLite for development)
- **Real-time**: Socket.io

## Getting Started

### Quickstart (First Time Setup)

1. **Clone the repo and install dependencies:**
   ```bash
   git clone <your-repo-url>
   cd joinchat
   npm install
   ```
2. **Copy environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase config (see below)
   ```
3. **Set up the database:**
   ```bash
   npm run db:push
   # If you see a migration error, run:
   npm run db:reset
   ```
4. **Start everything (frontend + backend):**
   ```bash
   npm run dev:full
   ```
5. **Open your browser:**
   - Go to http://localhost:3000

---

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project (for authentication)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd joinchat
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure Firebase:
   - Create a new Firebase project at https://console.firebase.google.com
   - Enable Authentication with Email/Password
   - Copy your Firebase config values to `.env`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

5. Set up the database:
```bash
npm run db:push
# If you see a migration error, run:
npm run db:reset
```

### Development

**Recommended:**
```bash
npm run dev:full
```
This will start both the Next.js frontend and Socket.io backend together:
- Next.js app on http://localhost:3000
- Socket.io server on http://localhost:3001

Or run them separately:
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run dev:server
```

### Usage

1. Open http://localhost:3000
2. Create an account, sign in, or use "Login as Guest"
3. Browse available chat rooms
4. Join a room and start chatting (guests are read-only)

## Project Structure

```
├── src/
│   ├── app/                 # Next.js app router pages
│   ├── components/          # React components
│   │   ├── auth/           # Authentication components
│   │   ├── chat/           # Chat-related components
│   │   └── ui/             # shadcn/ui components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   └── styles/             # Global styles
├── server/                 # Express.js + Socket.io server
├── prisma/                 # Database schema
└── public/                 # Static assets
```

## Available Scripts

- `npm run dev` - Start Next.js development server
- `npm run dev:server` - Start Socket.io server
- `npm run dev:full` - Start both servers concurrently
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
