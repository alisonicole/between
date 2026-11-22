// Locks Between's classes so each user can only read and change their own rows,
// enforced by the server (Back4App), not just the app. Run once:
//   PARSE_MASTER_KEY=... NEXT_PUBLIC_PARSE_APP_ID=... NEXT_PUBLIC_PARSE_SERVER_URL=... npm run set-permissions
// Add --dry-run to print what would change.
const SERVER = (process.env.NEXT_PUBLIC_PARSE_SERVER_URL || "").replace(/\/$/, "");
const APP_ID = process.env.NEXT_PUBLIC_PARSE_APP_ID;
const MASTER = process.env.PARSE_MASTER_KEY;
const DRY = process.argv.includes("--dry-run");

if (!SERVER || !APP_ID || !MASTER) {
  console.error("Set NEXT_PUBLIC_PARSE_SERVER_URL, NEXT_PUBLIC_PARSE_APP_ID and PARSE_MASTER_KEY first.");
  process.exit(1);
}

// No public or "any logged-in user" access. Pointer permissions on the `user`
// field are the only way in, so a row is visible only to the user it points to.
const OWNER_ONLY = {
  find: {},
  get: {},
  count: {},
  update: {},
  delete: {},
  create: { requiresAuthentication: true },
  addField: { requiresAuthentication: true },
  readUserFields: ["user"],
  writeUserFields: ["user"],
};

const CLASSES = {
  Entry: {},
  SessionSnapshot: {},
  // New in 2.0: the saved prep, so Patterns and the Session Starter survive a reload.
  SessionPrep: {
    user: { type: "Pointer", targetClass: "_User" },
    themes: { type: "Array" },
    avoiding: { type: "Array" },
    questions: { type: "Array" },
    openingStatement: { type: "String" },
    sessionDate: { type: "String" },
    notes: { type: "String" },
    nextSteps: { type: "String" },
    generatedAt: { type: "String" },
    placeholder: { type: "Boolean" },
  },
};

const headers = { "X-Parse-Application-Id": APP_ID, "X-Parse-Master-Key": MASTER, "Content-Type": "application/json" };

async function call(method, path, body) {
  const res = await fetch(`${SERVER}${path}`, { method, headers, body: body && JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

for (const [cls, fields] of Object.entries(CLASSES)) {
  const existing = await call("GET", `/schemas/${cls}`);
  const exists = existing.ok;
  const missing = Object.fromEntries(Object.entries(fields).filter(([f]) => !existing.data?.fields?.[f]));
  const body = { className: cls, classLevelPermissions: OWNER_ONLY, ...(Object.keys(missing).length ? { fields: missing } : {}) };
  console.log(`${cls}: ${exists ? "update" : "create"} with owner-only permissions${Object.keys(missing).length ? `, add fields ${Object.keys(missing).join(", ")}` : ""}`);
  if (DRY) continue;
  const r = await call(exists ? "PUT" : "POST", `/schemas/${cls}`, body);
  if (!r.ok) {
    console.error(`  failed (${r.status}): ${r.data.error || JSON.stringify(r.data)}`);
    process.exitCode = 1;
  }
}

console.log(`
Also recommended, by hand in the Back4App dashboard (Database > _User > Security):
  turn off public Find and Get on _User, so no one can list users' emails.
  Sign-in, sign-up and "current user" keep working without them.`);
