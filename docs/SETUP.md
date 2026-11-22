# Between 2.0 setup

Phase 1A: Between 1.0 on a Next.js base, with Google sign-in, server-side AI,
and Patterns that survive a reload.

## 1. Environment variables

Copy `.env.example` to `.env.local` for local work, and add the same values in
Vercel (Project > Settings > Environment Variables).

| Variable | Where it comes from | Secret? |
| --- | --- | --- |
| `NEXT_PUBLIC_PARSE_APP_ID` | Back4App > App Settings > Security & Keys | No |
| `NEXT_PUBLIC_PARSE_JS_KEY` | same page, "JavaScript key" | No |
| `NEXT_PUBLIC_PARSE_SERVER_URL` | `https://parseapi.back4app.com` | No |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google Cloud > APIs & Services > Credentials (same client Greenhouse uses is fine) | No |
| `PARSE_MASTER_KEY` | Back4App > Security & Keys, "Master key" | **Yes** |
| `ANTHROPIC_API_KEY` | console.anthropic.com | **Yes** |
| `ANTHROPIC_MODEL` | optional, defaults to `claude-sonnet-5-5` | No |

Use Between's own Back4App app (the one holding Entry and SessionSnapshot), not
Greenhouse's.

## 2. Google sign-in

1. In Google Cloud, open the OAuth client and add these **Authorized JavaScript
   origins**: `http://localhost:3000`, `https://app.betweenapp.co`, and the
   Vercel preview domain.
2. In Back4App, turn on Google login for Between's app with the same client ID
   (Server Settings > Social login / Authentication). Without this,
   `Parse.User.logInWith("google")` is rejected.

## 3. Lock down the data (run once)

```bash
PARSE_MASTER_KEY=... NEXT_PUBLIC_PARSE_APP_ID=... \
NEXT_PUBLIC_PARSE_SERVER_URL=https://parseapi.back4app.com \
npm run set-permissions -- --dry-run   # check first
npm run set-permissions
```

This makes Entry, SessionSnapshot and the new SessionPrep owner-only on the
server. Between 1.0 set no per-row permissions, so until this runs, old rows
are protected only by the app's own queries.

## 4. How existing users move over

Nobody re-enters data. On first Google sign-in:

- **Same email as their Between account:** they enter their old password once.
  That proves it's them, links Google to the *same* Parse user (so every entry
  keeps its owner), and decrypts what the live app (my-mvp) encrypted with
  their password. The screen reports how many entries and snapshots came over,
  and the counts are checked before and after.
- **Forgot the password:** they can start fresh. Their old encrypted entries
  can't be opened without it; that was true in 1.0 too.
- **Anything still locked later** (for example, written in the old app after
  moving) shows a banner in the Archive with an Unlock button.

After this, entries are stored as plain text protected by owner-only
permissions and Back4App's encryption at rest, the same model as Between 1.0
(between-app). Password-based encryption can't continue with Google sign-in,
because there's no password to derive a key from.

## 5. Deploy

```bash
npm install
npm test
npm run build
npx vercel --prod
```

Then point `app.betweenapp.co` at the new Vercel project once you've checked it
on the preview URL.
