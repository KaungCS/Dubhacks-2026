# Club Ops

One workspace where a club's officers plan events, track tasks and make decisions, on top of Google Drive, Calendar, Forms and Sheets.

- Product spec: [Club Ops App — Data Model & MVP Plan.md](<Club Ops App — Data Model & MVP Plan.md>)
- Who builds what, contracts, design rules: [TEAM_PLAN.md](TEAM_PLAN.md)
- Rules for AI agents: [AGENTS.md](AGENTS.md)

## Collaborating

Coding agents use the shared [repository agent contract](AGENTS.md) to turn developer discussions into complete GitHub issues that preserve findings and acceptance criteria.

## Run locally

1. Node 24+. `npm install`
2. `cp .env.example .env.local` and fill it in with the values Kaung shares privately.
3. `npm run dev` and open http://localhost:3000. Sign in with a Google account on the OAuth test-user list.

Checks before pushing: `npm run lint`, `npm run build`, `npm test`.

## Stack

Next.js 16 (App Router, TypeScript), Tailwind 4, Supabase (Auth + Postgres), `googleapis`.

- Database schema: `supabase/migrations/`. Only Kaung applies migrations. Types: `lib/db/types.ts`.
- Data access: `getDb()` from `@/lib/db` (server only, bypasses RLS). Always call `requireMembership()` from `@/lib/auth` first and filter by its `workspace.id`.
- Google: `getGoogleClient(workspaceId)` from `@/lib/google/client` returns an OAuth client for the club admin.
- UI: `@/components/ui` (`Button`, `buttonClass`, `Input`, `Select`, `Textarea`, `Card`, `Page`).
