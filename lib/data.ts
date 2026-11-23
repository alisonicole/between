"use client";

import Parse from "./parse";
import { recordIsLocked } from "./legacyCrypto";
import { getToday } from "./dates";
import { WELCOME_PREFIX, WELCOME_TEXT } from "./between";
import type { Entry, Snapshot } from "./types";

/** Every record 2.0 writes is readable and writable only by its owner. */
export function ownerACL(user: Parse.User): Parse.ACL {
  const acl = new Parse.ACL(user);
  acl.setPublicReadAccess(false);
  acl.setPublicWriteAccess(false);
  return acl;
}

export function currentUser(): Parse.User {
  const u = Parse.User.current();
  if (!u) throw new Error("You're signed out. Please sign in again.");
  return u;
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const iso = (o: Parse.Object) => str(o.get("timestamp")) || o.createdAt?.toISOString() || new Date().toISOString();

// ---- Entries ---------------------------------------------------------------

function toEntry(o: Parse.Object): Entry {
  return {
    parseId: o.id,
    id: String(o.get("clientId") ?? o.id),
    date: str(o.get("date")) || getToday(),
    text: str(o.get("text")),
    prompt: str(o.get("prompt")),
    timestamp: iso(o),
    locked: recordIsLocked("Entry", o),
    isWelcomeEntry: Boolean(o.get("isWelcomeEntry")),
  };
}

export async function fetchEntries(): Promise<Entry[]> {
  const q = new Parse.Query("Entry");
  q.equalTo("user", currentUser());
  q.descending("timestamp");
  q.limit(500);
  return (await q.find()).map(toEntry);
}

export async function createEntry(e: { date: string; text: string; prompt?: string; isWelcomeEntry?: boolean }): Promise<Entry> {
  const user = currentUser();
  const o = new Parse.Object("Entry");
  o.set("user", user);
  o.set("clientId", Date.now());
  o.set("date", e.date);
  o.set("text", e.text || "");
  o.set("prompt", e.prompt || "");
  o.set("timestamp", new Date().toISOString());
  if (e.isWelcomeEntry) o.set("isWelcomeEntry", true);
  o.setACL(ownerACL(user));
  await o.save();
  return toEntry(o);
}

async function ownObject(cls: string, parseId: string): Promise<Parse.Object> {
  const q = new Parse.Query(cls);
  q.equalTo("user", currentUser());
  return q.get(parseId);
}

export async function updateEntry(parseId: string, patch: { text: string; date: string }) {
  const o = await ownObject("Entry", parseId);
  o.set("text", patch.text);
  o.set("date", patch.date);
  await o.save();
}

export async function deleteEntry(parseId: string) {
  await (await ownObject("Entry", parseId)).destroy();
}

/**
 * my-mvp's first-load rule: drop old welcome entries, and give a brand-new
 * account (no real entries) a fresh welcome entry.
 */
export async function ensureWelcomeEntry(entries: Entry[]): Promise<Entry[]> {
  const isWelcome = (e: Entry) => !e.locked && e.text.startsWith(WELCOME_PREFIX);
  const old = entries.filter(isWelcome);
  const real = entries.filter((e) => !isWelcome(e));
  await Promise.all(old.map((e) => deleteEntry(e.parseId).catch(() => {})));
  if (real.length > 0) return real;
  const welcome = await createEntry({ date: getToday(), text: WELCOME_TEXT, isWelcomeEntry: true });
  return [welcome];
}

// ---- Snapshots -------------------------------------------------------------

function toSnapshot(o: Parse.Object): Snapshot {
  return {
    parseId: o.id,
    id: String(o.get("clientId") ?? o.id),
    sessionDate: str(o.get("sessionDate")) || getToday(),
    timestamp: iso(o),
    notes: str(o.get("notes")),
    prepNote: str(o.get("prepNote")),
    nextSteps: str(o.get("nextSteps")),
    intention: str(o.get("intention")),
    avoiding: list(o.get("avoiding")),
    discussedTopics: list(o.get("discussedTopics")),
    isExampleSnapshot: Boolean(o.get("isExampleSnapshot")),
    locked: recordIsLocked("SessionSnapshot", o),
  };
}

export async function fetchSnapshots(): Promise<Snapshot[]> {
  const q = new Parse.Query("SessionSnapshot");
  q.equalTo("user", currentUser());
  q.descending("timestamp");
  q.limit(200);
  return (await q.find()).map(toSnapshot);
}

export async function createSnapshot(p: Omit<Snapshot, "parseId" | "id" | "timestamp" | "isExampleSnapshot" | "locked">): Promise<void> {
  const user = currentUser();
  const o = new Parse.Object("SessionSnapshot");
  o.set("user", user);
  o.set("clientId", Date.now());
  o.set("sessionDate", p.sessionDate || getToday());
  o.set("timestamp", new Date().toISOString());
  o.set("notes", p.notes);
  o.set("prepNote", p.prepNote);
  o.set("nextSteps", p.nextSteps);
  o.set("intention", p.intention);
  o.set("avoiding", p.avoiding);
  o.set("discussedTopics", p.discussedTopics);
  o.setACL(ownerACL(user));
  await o.save();
}

export async function deleteSnapshot(parseId: string) {
  await (await ownObject("SessionSnapshot", parseId)).destroy();
}
