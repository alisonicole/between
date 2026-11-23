# Between 2.0 setup

Between 1.0 (my-mvp) on a Next.js base, with Google sign-in, plus Second Wind
(greenhouse, check-ins, safety plan, Help now) built in.

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

Use Between's own Back4App app (the one holding Entry and SessionSnapshot), not
Greenhouse's.

AI (prep themes, patterns, session summaries, the monthly summary and the
encouraging notes) uses the Cloud Code functions already deployed on that app
for my-mvp, so there is no Anthropic key to set here. AI is **off** for every
person until they turn it on (in You, or the card on My Sessions → Before), and
the server checks that before every call.

## 2. Google sign-in

1. In Google Cloud, open the OAuth client and add these **Authorized JavaScript
   origins**: `http://localhost:3000`, `https://app.betweenapp.co`, and the
   Vercel preview domain.
2. In Back4App, turn on Google login for Between's app with the same client ID
   (Server Settings > Social login / Authentication). Without this,
   `Parse.User.logInWith("google")` is rejected.

## 3. Lock down the data (run once, and again after this update)

Paste your real keys in place of the dots, then run each line:

```bash
cd ~/between
export PARSE_MASTER_KEY=...
export NEXT_PUBLIC_PARSE_APP_ID=...
export NEXT_PUBLIC_PARSE_SERVER_URL=https://parseapi.back4app.com
npm run set-permissions -- --dry-run   # check first
npm run set-permissions
```

This makes Entry, SessionSnapshot and the new UserState class owner-only on
the server. UserState holds each person's settings, prep notes, greenhouse,
check-ins and safety plan. my-mvp kept some of this on the user record, which
Back4App lets anyone read by default; 2.0 moves it to UserState and makes each
user record private the first time that person signs in.

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
  moving) shows a banner in the Journal log with an Unlock button.
- **Things my-mvp kept only in the browser** (key topics, your name, saved
  patterns and summaries) are copied over the first time someone opens 2.0 in
  that same browser on the same web address. That only works once
  `app.betweenapp.co` points at the new project.
- **Second Wind:** on the Greenhouse tab, "I used Second Wind: import my
  backup" (or You → Import a Second Wind backup) takes the JSON file from
  Second Wind's own Export button.

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
