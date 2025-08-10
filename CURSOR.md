# Cursor Playbook for Ever.Chat

This guide standardizes how we collaborate with AI in Cursor for this repo.

## Conventions

- Use the App Router structure in `src/app` and keep components colocated in `src/components/*`.
- Keep server logic in `src/server` and TRPC routers in `src/server/api/routers`.
- Prefer explicit, descriptive names; avoid abbreviations.
- Follow our white/grey/red UI theme; use shadcn/ui where possible.
- All edits must pass `npm run typecheck` and `npm run lint`.

## Common Tasks

- Start full dev: `npm run dev:full`
- DB ops: `npm run db:push`, `npm run db:migrate`, `npm run db:studio`
- Format: `npm run format:write`
- Lint: `npm run lint` or `npm run lint:fix`

## Coding with AI in Cursor

When asking AI to make changes, specify:

1) The target files or directories, e.g. `src/components/chat/RoomList.tsx`.
2) What to add/change at a high level.
3) Acceptance criteria (behavior, UI states, errors, tests if any).

Example prompt:

"Add unread message badge per room in `RecentChatsSidebar.tsx`. Show count (max 99+), reset on entering the room, persisted per user in DB. Add TRPC queries and minimal schema if needed. Must pass lint and typecheck."

## Architectural Guidelines

- Prefer TRPC for server/client data access. Avoid ad‑hoc REST.
- Keep real‑time events through Socket.io in `server/index.ts`; emit narrow, well‑named events.
- Validation with `zod` at the procedure boundary.
- Database schema changes via Prisma migrations with clear names.

## UI/UX Guidelines

- Maintain accessible keyboard flows (search navigation, buttons, dialogs).
- Keep hover/focus states consistent with theme.
- Use toasts for success/failure feedback.

## Review Checklist

- Types: No `any` or unsafe casts in changed code.
- Errors: Handle empty/loading/error states on all queries.
- Performance: Avoid unnecessary rerenders; memoize where it helps readability.
- Security: Never log secrets; hash passwords with bcrypt on server.

## Decision Records

High‑level decisions should be captured in short sections inside `README.md` or as separate `docs/ADR-*.md` files if the change is substantial (e.g., switching DB providers).

## Troubleshooting

- If Next.js port 3000 is busy, the app may start on 3002; check terminal output.
- Prisma errors after schema edits: try `npm run db:push`; if migration history diverged in dev, `npm run db:generate` then `db:push`.
- Socket.io not connecting: ensure `npm run dev:server` is running and CORS is enabled.


