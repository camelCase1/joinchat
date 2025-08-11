# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product Overview

Ever.Chat is a community-owned, AI-moderated messaging platform for topic-based, small (≤30) real-time rooms. It combines Reddit's topic-centric discovery with Discord's real-time chat, with quality maintained via AI moderation and lightweight reputation signals (badges, account age, trust score).

## Development Commands

```bash
# Start both frontend and backend (recommended)
npm run dev           # Runs both Next.js and Socket.io server

# Database operations
npm run db:push       # Sync schema to database
npm run db:generate   # Generate migrations
npm run db:studio     # Open Prisma Studio GUI

# Code quality
npm run lint          # Run ESLint
npm run lint:fix      # Auto-fix linting issues
npm run typecheck     # TypeScript type checking
npm run format:write  # Format with Prettier

# ⚠️ IMPORTANT: BUILD COMMANDS - DO NOT RUN ⚠️
# npm run build       # DO NOT RUN - User will run builds manually
# npm run preview     # DO NOT RUN - User will run this manually
```

## 🚨 CRITICAL: Never Run Build Commands 🚨

**NEVER run `npm run build` or any build-related commands automatically.**
- The user will handle all production builds manually
- This includes `npm run build`, `npm run preview`, or any similar commands
- Only use development commands like `npm run dev` for testing
- If you need to verify the app works, use `npm run dev` and test with Playwright

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
- `tests/screenshots/*` - Test screenshots (gitignored)

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

### Screenshot Policy
**NEVER save screenshots to disk or show screenshot previews**:
- Do not use `mcp__playwright__browser_take_screenshot` with a filename parameter
- Do not save test screenshots to the filesystem
- Use `mcp__playwright__browser_snapshot` for debugging instead of screenshots
- All screenshot files are gitignored and should not be committed
- If screenshots are needed for debugging, view them in memory only

## YOLO Mode

When YOLO mode is enabled, Claude will:
- Take decisive actions without asking for confirmation
- Automatically fix errors and issues as they're discovered
- Make implementation decisions based on best practices
- Complete multi-step tasks autonomously
- Only ask for user input when absolutely necessary (missing critical information)

To enable YOLO mode, simply tell Claude "YOLO mode enabled" or "go ahead with YOLO mode".

## Audio Notifications

### Task Completion Notification
When you complete a task, run the following command to provide audio feedback:
```bash
say2 "Task completed successfully"
```

You can customize the message based on what was accomplished. Examples:
- `say2 "Channel creation functionality fixed and tested"`
- `say2 "Message bubble styling completed"`
- `say2 "All tests passing, ready for review"`
- `say2 "Build successful, no errors found"`

### User Action Required Notification
**IMPORTANT**: Whenever you need the user to take an action or provide input, use the `say2` command to alert them. This ensures the user knows when their attention is needed without constantly monitoring the screen.

**CRITICAL**: When Claude shows prompts asking for confirmation (like "Do you want to make this edit to X?"), ALWAYS run `say2` to notify the user that you're waiting for their response. This prevents blocking situations where the user doesn't realize Claude is waiting for input.

Examples of when to alert the user:
- `say2 "Waiting for your confirmation to edit ChannelSidebar.tsx"`
- `say2 "Please confirm if you want to make the edit"`
- `say2 "Please provide the API key for the service"`
- `say2 "Waiting for you to choose between option A or B"`
- `say2 "Need confirmation before proceeding with database migration"`
- `say2 "Please review the changes and confirm if they look correct"`
- `say2 "Authentication required. Please enter your credentials"`
- `say2 "Build failed. Please check the error and provide guidance"`

Always use clear, concise messages that describe what action is needed from the user. This provides helpful audio feedback so the user knows when their input is required.

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