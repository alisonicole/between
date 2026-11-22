"use client";

import Parse, { initParse } from "./parse";
import { deriveLegacyKey, type LegacyClass } from "./legacyCrypto";
import { prepareMigration, type ClassResult } from "./migration";
import { ownerACL } from "./data";
import type { LookupState } from "./accountLookup";

function decodeJwt(token: string): { sub: string; email?: string; name?: string } {
  const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(decodeURIComponent(escape(atob(base64))));
}

function googleAuthData(credential: string) {
  const { sub } = decodeJwt(credential);
  return { id: sub, id_token: credential };
}

export async function lookupGoogleAccount(credential: string): Promise<LookupState> {
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Sign-in failed. Please try again.");
  return data as LookupState;
}

/** Signs in (or creates) the user linked to this Google account. */
export async function signInWithGoogle(credential: string, { setEmail = true } = {}): Promise<Parse.User> {
  initParse();
  const payload = decodeJwt(credential);
  const user = await Parse.User.logInWith("google", { authData: googleAuthData(credential) });
  let dirty = false;
  if (user.get("googleSub") !== payload.sub) { user.set("googleSub", payload.sub); dirty = true; }
  if (!user.get("name") && payload.name) { user.set("name", payload.name); dirty = true; }
  if (setEmail && !user.get("email") && payload.email) { user.set("email", payload.email); dirty = true; }
  if (dirty) {
    try {
      await user.save();
    } catch {
      // Email already belongs to an old account the user chose not to unlock.
      user.unset("email");
      await user.save().catch(() => {});
    }
  }
  return user;
}

export interface MigrationReport {
  entries: ClassResult;
  snapshots: ClassResult;
  countsMatch: boolean;
}

/**
 * The one-time step for an existing user: prove ownership with the old
 * password, link Google to that same user (so every row keeps its owner),
 * then decrypt the old app's encrypted fields.
 */
export async function linkLegacyAccount(
  credential: string,
  username: string,
  password: string,
): Promise<MigrationReport> {
  initParse();
  let user: Parse.User;
  try {
    user = await Parse.User.logIn(username, password);
  } catch {
    throw new Error("That password didn't work. Try again, or start fresh.");
  }
  try {
    await user.linkWith("google", { authData: googleAuthData(credential) });
    user.set("googleSub", decodeJwt(credential).sub);
    await user.save();
  } catch {
    // Don't leave a half-finished sign-in behind: the old account without Google.
    await Parse.User.logOut().catch(() => {});
    throw new Error("Couldn't link your Google account. Please try again.");
  }
  try {
    return await migrateMyData(password);
  } catch {
    throw new LinkedButNotMigrated();
  }
}

/** Google is linked, but decrypting failed partway. Safe to retry from the Archive. */
export class LinkedButNotMigrated extends Error {
  constructor() {
    super("Your Google account is linked, but some entries couldn't be brought over yet. You can finish from the Archive.");
  }
}

/** Decrypts the signed-in user's old entries. Safe to run more than once. */
export async function migrateMyData(password: string): Promise<MigrationReport> {
  const user = Parse.User.current();
  if (!user) throw new Error("You're signed out. Please sign in again.");
  const key = deriveLegacyKey(password);
  const acl = ownerACL(user);

  async function run(cls: LegacyClass) {
    const base = () => new Parse.Query(cls).equalTo("user", user);
    const before = await base().count();
    const rows: Parse.Object[] = [];
    for (let skip = 0; ; skip += 1000) {
      const page = await base().ascending("createdAt").skip(skip).limit(1000).find();
      rows.push(...page);
      if (page.length < 1000) break;
    }
    const { toSave, result } = prepareMigration(cls, rows, key, acl);
    for (let i = 0; i < toSave.length; i += 50) await Parse.Object.saveAll(toSave.slice(i, i + 50));
    const after = await base().count();
    return { result, match: before === after && rows.length === before };
  }

  const e = await run("Entry");
  const s = await run("SessionSnapshot");
  user.set("migratedToV2At", new Date());
  await user.save();
  return { entries: e.result, snapshots: s.result, countsMatch: e.match && s.match };
}

/** For an already-signed-in user with locked rows left (e.g. written in the old app later). */
export async function unlockWithOldPassword(password: string): Promise<MigrationReport> {
  const user = Parse.User.current();
  if (!user) throw new Error("You're signed out. Please sign in again.");
  try {
    // In the SDK since 2.x; missing from @types/parse.
    const verify = (Parse.User as unknown as { verifyPassword: (u: string, p: string) => Promise<unknown> }).verifyPassword;
    await verify.call(Parse.User, user.getUsername()!, password);
  } catch {
    throw new Error("That password didn't work.");
  }
  return migrateMyData(password);
}

export async function signOut() {
  await Parse.User.logOut();
}
