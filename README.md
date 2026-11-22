# between

Capture what comes up between sessions and bring it into the room.

Between 2.0, Phase 1A: every Between 1.0 screen on a Next.js base, with Google
sign-in, AI Patterns on a server route (off until you turn it on), and Patterns,
the Session Starter and During notes saved as you go.

```bash
npm install
cp .env.example .env.local   # fill in, see docs/SETUP.md
npm run dev
npm test
```

- `app/` — page, layout, and API routes (`/api/auth/google`, `/api/patterns`)
- `components/` — sign-in, legacy unlock, Capture / Prep / During
- `lib/` — data access, auth and migration, prompts, archive logic (unit-tested)
- `app/globals.css` — Between 1.0's design tokens
- `scripts/set-permissions.mjs` — owner-only permissions on Back4App

Setup and migration details: [docs/SETUP.md](docs/SETUP.md).
