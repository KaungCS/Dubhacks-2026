# RSO Manager (DubHacks 2026)

Club officers sign in with Google, describe an event, get a planning draft, then confirm to create a **Google Calendar event** and a **Drive folder** (anyone-with-link + checklist file).

## Clone and run

```bash
git clone https://github.com/KaungCS/Dubhacks-2026.git
cd Dubhacks-2026
cp .env.example .env.local
# fill AUTH_SECRET + Google OAuth vars (see below)
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production check (no Google credentials required for compile):

```bash
npm run build
```

Other scripts: `npm run start` (serve build), `npm run lint`.

## Environment (`.env.local`)

**Do not rely on Cursor Cloud Environment secrets.** Cloud Save may fail with “Repository is not ready yet.” For this 4-person team, local/dev config is always:

```bash
cp .env.example .env.local
```

Fill values in `.env.local` on your machine (and share credentials out-of-band, not via Cloud secrets UI). **Never commit `.env.local` or real secrets.**

| Variable | Required | Purpose |
|---|---|---|
| `AUTH_SECRET` | Yes | Auth.js session secret — `openssl rand -base64 32` |
| `AUTH_GOOGLE_ID` | Yes for sign-in | Google OAuth Web client ID |
| `AUTH_GOOGLE_SECRET` | Yes for sign-in | Google OAuth Web client secret |
| `CLUB_NAME` | No | Dashboard / Drive folder branding (default `RSO Manager`) |
| `CLUB_TIMEZONE` | No | Suggested event timezone (default `America/Los_Angeles`) |
| `OPENAI_API_KEY` | No | Live LLM plans; stub planner if unset |
| `OPENAI_MODEL` | No | Model override (default `gpt-4o-mini`) |
| `AUTH_URL` | Prod | Public origin, e.g. `https://your-app.vercel.app` |

Until Google credentials exist, `npm run build` and the UI still work; **Sign in with Google** will fail.

## Google OAuth (required for demo)

Summary (full checklist in Project store: `docs/google-oauth-setup.md`):

1. [Google Cloud Console](https://console.cloud.google.com/) → create/select a project.
2. Enable **Google Calendar API** and **Google Drive API**.
3. **OAuth consent screen** (External is fine for hackathon):
   - App name e.g. `RSO Manager`
   - Scopes: `openid`, `userinfo.email`, `userinfo.profile`, `calendar.events`, `drive.file`
   - Add every teammate Google account as a **Test user** while the app is in Testing
4. **Credentials → OAuth client ID → Web application**:
   - Authorized JavaScript origins: `http://localhost:3000` (+ deploy origin)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<deploy-host>/api/auth/callback/google`
5. Paste **Client ID** / **Client secret** into `.env.local` as `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.
6. Restart `npm run dev`.

Auth.js callback path is always `/api/auth/callback/google`. First sign-in must grant Calendar + Drive; the app requests offline access so tokens can refresh.

## For teammates

### Where things live

| Concern | Path |
|---|---|
| Auth.js config (Google provider, JWT refresh, session) | `src/auth.ts` |
| Edge-safe auth (middleware / `authorized`) | `src/auth.config.ts` |
| Auth route handlers | `src/app/api/auth/[...nextauth]/route.ts` |
| Route protection (`/dashboard`, `/plan`) | `src/middleware.ts` |
| Plan draft (stub or OpenAI) | `src/lib/plan.ts` → `POST /api/plan` |
| Calendar + Drive create | `src/lib/google.ts` → `POST /api/plan/confirm` |
| Plan UI | `src/components/plan-flow.tsx` + `src/app/plan/page.tsx` |
| Club name / timezone | `src/lib/config.ts` + env |

Flow: **describe event** → `POST /api/plan` → draft → **confirm** → `POST /api/plan/confirm` → Calendar event, then Drive folder.

### Adding a page or API route without breaking Auth.js

1. **Public page** — add under `src/app/.../page.tsx`. Do **not** import server-only Google helpers into client components.
2. **Protected page** — put it under `/dashboard` or `/plan`, **or** extend the `matcher` in `src/middleware.ts` **and** the `authorized` path checks in `src/auth.config.ts` (keep those two in sync). Call `auth()` in the page and `redirect("/")` if there is no user.
3. **API route that needs a session** — `src/app/api/<name>/route.ts`, call `const session = await auth()` and return `401` if missing. Do **not** remove `/api/auth/[...nextauth]`. Do **not** put Google token refresh or `googleapis` calls in middleware / Edge.
4. **Need Google access token** — read `session.accessToken` from `auth()` (populated in `src/auth.ts`). If `session.error === "RefreshAccessTokenError"`, tell the user to sign out/in.
5. Prefer `@/` imports (`@/auth`, `@/lib/...`). Keep new Auth.js providers/callbacks in `src/auth.ts`; keep Edge-safe bits in `src/auth.config.ts`.

### Demo flow

1. Sign in with Google (grant Calendar + Drive).
2. Land on `/dashboard` — club name from `CLUB_NAME`.
3. **Plan an event** → describe → **Draft plan**.
4. **Confirm → Calendar + Drive** → open the returned links.

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Auth.js (NextAuth v5) Google provider
- Google Calendar API + Google Drive API
- OpenAI optional; stub planner if no key

## Intentionally out of scope (for now)

No multi-club tenancy, persisted plan DB, billing, native apps, or expanding the AI agent beyond the existing plan stub/LLM draft. See Project store `docs/` for product context.
