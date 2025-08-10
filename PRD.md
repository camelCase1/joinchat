# Ever.Chat — Product Requirements Document (PRD)

## 1) Overview

Ever.Chat is a community-owned, AI‑moderated messaging platform that combines topic-centric discovery (inspired by Reddit) with real‑time rooms (inspired by Discord). Conversations happen in small, focused rooms limited to 30 participants, with AI moderation and lightweight social trust signals (badges, profile age, trust score) to keep discussions high‑quality.

## 2) Goals and Non‑Goals

- **Goals**
  - Deliver fast, reliable real‑time chat with room persistence and history.
  - Enable topic‑based discovery and simple room creation with sensible defaults.
  - Maintain conversation quality with AI moderation and basic reputation signals.
  - Provide a clean, consistent UI with intuitive search and navigation.

- **Non‑Goals (for MVP)**
  - End‑to‑end encryption.
  - Complex moderation workflows (appeals, strikes, role hierarchies).
  - Federation or cross‑server interoperability.
  - Native mobile apps (web-first; mobile‑responsive only).

## 3) Target Users and Personas

- **Curator Casey (Community builder)**: Creates rooms around interests; needs easy setup, discoverability, and minimal admin overhead.
- **Contributor Chris (Active participant)**: Wants low‑noise, respectful, topical discussion and to find rooms quickly.
- **Lurker Lee (Newcomer)**: Browses and reads first; needs simple onboarding, trust signals, and clear join/guest behavior.

## 4) User Stories (MVP)

- As a user, I can sign up, log in, or continue as a guest (read‑only) to try the app quickly.
- As a user, I can view featured and all rooms with participant counts and search by topic/name.
- As a user, I can create a new room (validated unique name) and join it immediately.
- As a participant, I can send and read messages with history persisted to the database.
- As a participant, I see AI moderation prevent obviously offensive/illegal spam from appearing.
- As a user, I can see basic profile signals (badges, account age, trust score) of others in the room.
- As a solo participant in an empty room, I can delete the room safely after confirmation.

## 5) Functional Requirements

- **Authentication**
  - Email/password signup and login.
  - Local session persistence; redirect rules between `/` and `/auth` as documented.
  - Guest mode (read‑only) with clear CTAs to sign up.

- **Rooms**
  - Create room with unique name, topic slug, optional description; max participants default 30.
  - List featured and all rooms; real‑time participant counts with periodic refresh.
  - Search with autocomplete; keyboard navigation; join via Enter or click.
  - Delete room available only if the requester is the only active member.

- **Messaging**
  - Real‑time text messaging with persisted history.
  - System messages (joins/leaves, deletes) displayed distinctly.
  - Muting specific users per client; muted users’ messages hidden locally.

- **Moderation**
  - Basic AI moderation pass to block obviously offensive/illegal spam before broadcast.
  - Blocked messages do not persist; client receives reason/error toast when applicable.

- **Profiles and Badges**
  - Display name, profile age, trust score, and badges visible in message list/hover.

- **Recent Chats Sidebar**
  - Shows user’s recent rooms, last message previews, timestamps; updates live.

## 6) Non‑Functional Requirements

- **Performance**: Initial room list under 1s on warm cache; message send‑to‑display < 150ms on local.
- **Reliability**: No message loss on transient disconnect; at‑least‑once persistence semantics.
- **Security**: Password hashing with bcrypt; input validation with zod; rate limiting on room create and signup.
- **Accessibility**: Keyboard navigation for search and room lists; color contrast for the white/grey/red theme.
- **Scalability (MVP)**: Single Socket.io instance + SQLite (via Prisma) sufficient for small communities; path to Postgres.

## 7) Data Model (Summary)

- Users(id, email, displayName, profileAge, trustScore, badges)
- ChatRoom(id, name, topic, description, maxParticipants, featured, createdAt)
- RoomMember(userId, roomId, isActive, joinedAt)
- Message(id, roomId, userId, content, type, createdAt)
- MutedUser(userId, mutedUserId)

## 8) System Architecture (MVP)

- Next.js (App Router) for UI; TRPC for server procedures; Socket.io for real‑time events.
- Prisma ORM with SQLite for local dev; ready to migrate to Postgres.
- AI moderation hook on server prior to broadcast + persistence.

## 9) Success Metrics

- D1 retention of new signups ≥ 30%.
- Median time‑to‑first‑message ≤ 60 seconds from first page view.
- Median rooms per active user per week ≥ 2.
- Moderation precision ≥ 90% on obvious spam/offense (manual sampling).

## 10) Scope and Release Plan

- **MVP (v0.1)**
  - Auth (email/password + guest), room CRUD (create/delete solo), search autocomplete, messaging with persistence, recent chats, basic AI moderation, badges display.

- **Post‑MVP (v0.2+)**
  - File uploads, message editing/deletion, richer moderation controls, unread counts, push notifications, SSO options.

## 11) Open Questions

- What moderation provider/configuration will be used in production and how are appeals handled?
- Should guest mode allow posting in some rooms with a read‑only default elsewhere?
- How should trust score be computed beyond a static default (e.g., activity, reports)?

## 12) Dependencies and Risks

- Dependencies: Socket.io stability, Prisma migrations, basic AI moderation endpoint.
- Risks: Over‑blocking by moderation, room name squatting, performance under large concurrent loads.


