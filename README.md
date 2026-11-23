# between

Capture what comes up between sessions and bring it into the room.

Between 2.0: every screen of Between 1.0 (my-mvp) on a Next.js base with Google
sign-in, plus Second Wind built in: the greenhouse, morning and evening
check-ins, the jar, appointments, the safety plan and Help now.

```bash
npm install
cp .env.example .env.local   # fill in, see docs/SETUP.md
npm run dev
npm test
```

- `app/`: page, layout, API routes (`/api/auth/google`, `/api/ai/[fn]`)
- `components/`: the five tabs (Home, Journal, Greenhouse, My Sessions, You),
  onboarding, sign-in and legacy unlock, `garden/` (art and sheets)
- `lib/`: data access, auth and migration, `between.ts` (my-mvp logic),
  `garden.ts` (Second Wind logic), `userState.ts` (each person's private record);
  unit-tested
- `scripts/set-permissions.mjs`: owner-only permissions on Back4App

Setup and migration details: [docs/SETUP.md](docs/SETUP.md).
