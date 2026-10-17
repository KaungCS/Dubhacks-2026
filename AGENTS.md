# AGENTS.md

Club Ops App for student club officers. Spec: `Club Ops App — Data Model & MVP Plan.md`. Team split, ownership and contracts: `TEAM_PLAN.md`. Read both before changing anything.

## Rules for AI assistants

- Ask which teammate you're working for (Kaung, Jackson, Jun or Dom), then edit **only** the folders listed for them in the Ownership table in `TEAM_PLAN.md`.
- Never edit `supabase/`, `lib/db/`, `lib/auth/`, `lib/nav.ts`, `app/layout.tsx`, `package.json` or root config unless the user is Kaung. If you need a change there, tell the user to ask Kaung.
- Use other modules only through the functions in the "Contracts" section of `TEAM_PLAN.md`. Don't import another module's internals or duplicate its logic.
- If a contract function is still a stub, code against its signature; don't implement it in your own folder.
- Don't add dependencies or new environment variables yourself; ask the user to ask Kaung.
- Before pushing: `git pull --rebase origin main`. Work on your own branch (`<name>/<module>`).
- Design: mostly white, flat, minimal. Buttons are rounded pills with a 1px black border and no shadow, gradient, shine or accent color. Use the shared components in `components/ui/` (owned by Kaung) and don't style your own lookalikes. See "Design" in `TEAM_PLAN.md`.
- Never edit `components/ui/` unless the user is Kaung.
- Scope: do what the spec says in its thin form. Email is sent only in the two cases in the spec. No Discord, no digest, no weekly summary, no task dependencies.
