# RSO Manager (DubHacks 2026)

Club officers sign in with Google, describe an event, get a planning draft, then confirm to create a **Google Calendar event** and a **Drive folder** (anyone-with-link + checklist file).

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Auth.js (NextAuth v5) Google provider
- Google Calendar API + Google Drive API
- OpenAI optional; stub planner if no key

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Required env vars

| Variable | Purpose |
|---|---|
| `AUTH_SECRET` | Auth.js session secret |
| `AUTH_GOOGLE_ID` | Google OAuth Web client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Web client secret |
| `CLUB_NAME` | Dashboard / folder branding (defaults to `RSO Manager`) |
| `CLUB_TIMEZONE` | Suggested event timezone (default `America/Los_Angeles`) |
| `OPENAI_API_KEY` | Optional live LLM plans |
| `OPENAI_MODEL` | Optional model override (default `gpt-4o-mini`) |
| `AUTH_URL` | Optional public origin in production |

### Google OAuth

1. Create a Google Cloud project and OAuth **Web** client.
2. Enable **Google Calendar API** and **Google Drive API**.
3. Add redirect URI: `http://localhost:3000/api/auth/callback/google` (plus your deploy URL).
4. Consent screen scopes: `openid`, `email`, `profile`, `calendar.events`, `drive.file`.
5. Put the client ID/secret in `.env.local`.

Full Cloud Console steps live in the Project store doc: `docs/google-oauth-setup.md` (RSO Manager Project Context).

Until credentials exist, the app builds and the UI is browsable, but sign-in will fail.

## Demo flow

1. Sign in with Google (grant Calendar + Drive).
2. Land on `/dashboard` — club name from `CLUB_NAME`.
3. **Plan an event** → describe the event → **Draft plan**.
4. **Confirm → Calendar + Drive** → open the returned links.

## Scripts

- `npm run dev` — local server
- `npm run build` — production build
- `npm run start` — serve build
- `npm run lint` — ESLint
