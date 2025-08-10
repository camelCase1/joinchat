# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Overview

Ever.Chat is a community-owned, AI-moderated messaging platform for topic-based, small (≤30) real-time rooms. It combines Reddit's topic-centric discovery with Discord's real-time chat, with quality maintained via AI moderation and lightweight reputation signals (badges, account age, trust score).

## Development Commands

```bash
# Start both frontend and backend (recommended)
npm run dev:full

# Database operations
npm run db:push       # Sync schema to database
npm run db:generate   # Generate migrations
npm run db:studio     # Open Prisma Studio GUI

# Code quality
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix linting issues
npm run typecheck     # TypeScript type checking
npm run format:write  # Format with Prettier

# Build and production
npm run build         # Production build
npm run preview      # Build and preview production
```

## Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Backend**: Express + Socket.io for real-time, TRPC for API
- **Database**: Prisma ORM with SQLite (dev) / Postgres (prod)
- **Auth**: Firebase Authentication
- **UI**: Tailwind CSS + shadcn/ui components

### Key Directories
- `src/app/*` - Next.js App Router pages
- `src/components/*` - React components (auth/, chat/, ui/)
- `src/server/api/routers/*` - TRPC routers (currently only post.ts)
- `src/server/db.ts` - Database client
- `server/index.ts` - Socket.io real-time server
- `prisma/schema.prisma` - Database schema

### Real-time Architecture
The Socket.io server (`server/index.ts`) handles:
- Room joins/leaves with participant tracking
- Message broadcasting with database persistence
- Presence updates for sidebar (online users, typing indicators)
- Unread counts and read receipts
- Auto-kick for idle users (30 min timeout)
- Room redirection when full

### Database Schema
Key models:
- **User**: Profile with trustScore, badges, daysLoggedIn
- **ChatRoom**: Topics with participant limits and featured flag
- **RoomMember**: Many-to-many relationship tracking active status
- **Message**: Persisted chat messages with type field
- **MutedUser**: Per-room or global muting relationships

## Implementation Patterns

### Input Validation
Always validate with `zod` at TRPC boundaries:
```typescript
const input = z.object({
  roomName: z.string().min(1).max(50),
  topic: z.string().min(1).max(100)
});
```

### Real-time Events
- Persist to DB first, then broadcast via Socket.io
- Use specific event names: `user-joined`, `new-message`, `sidebar-presence`
- Handle connection state gracefully with reconnection logic

### Component Structure
- Keep components small and focused
- Use descriptive names (avoid abbreviations)
- Colocate related components in subdirectories
- Follow white/grey/red theme with shadcn/ui components

### Error Handling
- Use toast notifications for user feedback
- Handle loading/error states in all queries
- Log errors server-side but don't expose internals to client

## Testing & Quality Checks

Before committing:
1. Run `npm run typecheck` - Must pass with no errors
2. Run `npm run lint` - Fix any issues with `npm run lint:fix`
3. Run `npm run format:write` - Ensure consistent formatting
4. Test real-time features with `npm run dev:full`
5. **IMPORTANT**: Always use Playwright MCP to verify the application is working correctly
   - Test authentication flow
   - Verify channel navigation
   - Check message sending/receiving
   - Confirm UI renders without errors

## Common Workflows

### Adding a New TRPC Router
1. Create router file in `src/server/api/routers/`
2. Import and add to `src/server/api/root.ts`
3. Use the router in components via `api.routerName.procedureName`

### Adding Real-time Features
1. Define event in `server/index.ts`
2. Emit from appropriate handler
3. Listen in React component with `useEffect` and socket listener
4. Clean up listener on unmount

### Database Schema Changes
1. Edit `prisma/schema.prisma`
2. Run `npm run db:push` for development
3. For production: `npm run db:generate` then `npm run db:migrate`