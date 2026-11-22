"use client";

import Parse from "./parse";
import { recordIsLocked } from "./legacyCrypto";
import { getToday } from "./dates";
import type { Entry, SessionPrep, Snapshot } from "./types";

/** Every record 2.0 writes is readable and writable only by its owner. */
export function ownerACL(user: Parse.User): Parse.ACL {
  const acl = new Parse.ACL(user);
  acl.setPublicReadAccess(false);
  acl.setPublicWriteAccess(false);
  return acl;
}

function currentUser(): Parse.User {
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
    title: str(o.get("title")),
    text: str(o.get("text")),
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

export async function createEntry(e: { date: string; title: string; text: string }): Promise<void> {
  const user = currentUser();
  const o = new Parse.Object("Entry");
  o.set("user", user);
  o.set("clientId", Date.now());
  o.set("date", e.date);
  o.set("title", e.title || "");
  o.set("text", e.text || "");
  o.set("timestamp", new Date().toISOString());
  o.setACL(ownerACL(user));
  await o.save();
}

async function ownObject(cls: string, parseId: string): Promise<Parse.Object> {
  const q = new Parse.Query(cls);
  q.equalTo("user", currentUser());
  return q.get(parseId);
}

export async function updateEntry(parseId: string, patch: { title: string; text: string }) {
  const o = await ownObject("Entry", parseId);
  o.set("title", patch.title);
  o.set("text", patch.text);
  await o.save();
}

export async function deleteEntry(parseId: string) {
  await (await ownObject("Entry", parseId)).destroy();
}

// ---- Snapshots -------------------------------------------------------------

function toSnapshot(o: Parse.Object): Snapshot {
  return {
    parseId: o.id,
    id: String(o.get("clientId") ?? o.id),
    sessionDate: str(o.get("sessionDate")) || getToday(),
    timestamp: iso(o),
    themes: list(o.get("themes")),
    avoiding: list(o.get("avoiding")),
    questions: list(o.get("questions")),
    openingStatement: str(o.get("openingStatement")),
    notes: str(o.get("notes")),
    nextSteps: str(o.get("nextSteps")),
    prepNote: str(o.get("prepNote")) || undefined,
    intention: str(o.get("intention")) || undefined,
    locked: recordIsLocked("SessionSnapshot", o),
    isExampleSnapshot: Boolean(o.get("isExampleSnapshot")),
  };
}

export async function fetchSnapshots(): Promise<Snapshot[]> {
  const q = new Parse.Query("SessionSnapshot");
  q.equalTo("user", currentUser());
  q.descending("timestamp");
  q.limit(200);
  return (await q.find()).map(toSnapshot);
}

export async function deleteSnapshot(parseId: string) {
  await (await ownObject("SessionSnapshot", parseId)).destroy();
}

// ---- Session prep (saved, so a reload keeps Patterns and the starter) ------

function toPrep(o: Parse.Object): SessionPrep {
  return {
    parseId: o.id,
    themes: list(o.get("themes")),
    avoiding: list(o.get("avoiding")),
    questions: list(o.get("questions")),
    openingStatement: str(o.get("openingStatement")),
    sessionDate: str(o.get("sessionDate")) || getToday(),
    notes: str(o.get("notes")),
    nextSteps: str(o.get("nextSteps")),
    generatedAt: str(o.get("generatedAt")) || undefined,
    placeholder: Boolean(o.get("placeholder")),
  };
}

async function findPrepObject(): Promise<Parse.Object | undefined> {
  const q = new Parse.Query("SessionPrep");
  q.equalTo("user", currentUser());
  q.descending("updatedAt");
  return q.first();
}

export async function fetchPrep(): Promise<SessionPrep | null> {
  const o = await findPrepObject();
  return o ? toPrep(o) : null;
}

/** Creates the prep if needed and saves the given fields. */
const PREP_FIELDS = [
  "themes", "avoiding", "questions", "openingStatement", "sessionDate",
  "notes", "nextSteps", "generatedAt", "placeholder",
] as const;

export async function savePrep(fields: Partial<SessionPrep>): Promise<SessionPrep> {
  const user = currentUser();
  let o = await findPrepObject();
  if (!o) {
    o = new Parse.Object("SessionPrep");
    o.set("user", user);
    o.setACL(ownerACL(user));
  }
  for (const k of PREP_FIELDS) if (fields[k] !== undefined) o.set(k, fields[k]);
  await o.save();
  return toPrep(o);
}

/** Move to Archive: save a snapshot, then clear the prep. Same fields as 1.0. */
export async function archivePrep(prep: SessionPrep): Promise<void> {
  const user = currentUser();
  const s = new Parse.Object("SessionSnapshot");
  s.set("user", user);
  s.set("clientId", Date.now());
  s.set("sessionDate", prep.sessionDate || getToday());
  s.set("timestamp", new Date().toISOString());
  s.set("themes", prep.themes);
  s.set("avoiding", prep.avoiding);
  s.set("questions", prep.questions);
  s.set("openingStatement", prep.openingStatement);
  s.set("notes", prep.notes);
  s.set("nextSteps", prep.nextSteps);
  s.setACL(ownerACL(user));
  await s.save();
  const o = await findPrepObject();
  if (o) await o.destroy();
}

// ---- AI consent ------------------------------------------------------------

export function aiPatternsEnabled(): boolean {
  return Boolean(Parse.User.current()?.get("aiPatterns"));
}

export async function setAiPatterns(on: boolean): Promise<void> {
  const u = currentUser();
  u.set("aiPatterns", on);
  await u.save();
}
