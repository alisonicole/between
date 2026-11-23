"use client";

/**
 * One owner-only record per user (class UserState) for everything that isn't an
 * entry or a snapshot: my-mvp's private settings (which it kept on the publicly
 * readable user record or in one browser) and all of Second Wind's data.
 */
import Parse from "./parse";
import { currentUser, ownerACL } from "./data";
import { blankGarden, type Garden } from "./garden";
import { getToday } from "./dates";
import type { Analysis, Bookmark, Favorite, MonthlySummary, NoteSummary, PatternsData, SessionDraft } from "./types";

export interface UserState extends Garden {
  displayName: string;
  sessionDays: string[];
  sessionTime: string;
  onboardingComplete: boolean;
  keyTopics: string[];
  sessionPrepNote: string;
  lastAnalysis: Analysis | null;
  patternsData: PatternsData | null;
  patternsLastEntryId: string | null;
  favoritedPatterns: Favorite[];
  bookmarks: Bookmark[];
  sessionNotesSummary: Record<string, NoteSummary>;
  monthlySummary: MonthlySummary | null;
  intentionCheckins: string[];
  milestones: string[];
  aiEnabled: boolean;
  draft: SessionDraft;
}

export function blankDraft(): SessionDraft {
  return { sessionDate: getToday(), notes: "", nextSteps: "", intention: "", checkedTopics: [] };
}

export function blankState(): UserState {
  return {
    ...blankGarden(),
    displayName: "", sessionDays: [], sessionTime: "", onboardingComplete: false, keyTopics: [], sessionPrepNote: "",
    lastAnalysis: null, patternsData: null, patternsLastEntryId: null, favoritedPatterns: [], bookmarks: [],
    sessionNotesSummary: {}, monthlySummary: null, intentionCheckins: [], milestones: [], aiEnabled: false, draft: blankDraft(),
  };
}

export const STATE_FIELDS = Object.keys(blankState()) as (keyof UserState)[];

let obj: Parse.Object | null = null;
let chain: Promise<unknown> = Promise.resolve();

function read(o: Parse.Object): UserState {
  const s = blankState();
  for (const k of STATE_FIELDS) {
    const v = o.get(k);
    if (v !== undefined && v !== null) (s as unknown as Record<string, unknown>)[k] = v;
  }
  return s;
}

// my-mvp kept these on the user record. They move to UserState, then leave the user record.
const LEGACY_USER_FIELDS = ["displayName", "sessionDays", "sessionTime", "keyTopics", "sessionPrepNote", "lastAnalysis", "favoritedPatterns", "onboardingComplete"] as const;
const PRIVATE_USER_FIELDS = ["keyTopics", "sessionPrepNote", "lastAnalysis", "favoritedPatterns", "savedPrompts", "displayName", "sessionDays", "sessionTime", "therapyDay"];

function fromLegacyUser(user: Parse.User): Partial<UserState> {
  const out: Partial<UserState> = {};
  for (const k of LEGACY_USER_FIELDS) {
    const v = user.get(k);
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  if (!out.sessionDays && user.get("therapyDay")) out.sessionDays = [user.get("therapyDay")];
  if (Array.isArray(out.favoritedPatterns)) {
    out.favoritedPatterns = (out.favoritedPatterns as unknown[]).map((f) =>
      typeof f === "string" ? { text: f, favoritedAt: new Date().toISOString() } : (f as Favorite),
    );
  }
  return out;
}

/**
 * my-mvp kept some things only in the browser, keyed by user id. When 2.0 runs
 * on the same address (app.betweenapp.co) it can pick them up once.
 */
export function fromLegacyBrowser(userId: string, storage: Pick<Storage, "getItem" | "key" | "length">): Partial<UserState> {
  const get = (k: string) => {
    try { const v = storage.getItem(`between_${userId}_${k}`); return v ? JSON.parse(v) : null; } catch { return null; }
  };
  const raw = (k: string) => { try { return storage.getItem(`between_${userId}_${k}`); } catch { return null; } };
  const out: Partial<UserState> = {};
  const bookmarks = get("bookmarks");
  if (Array.isArray(bookmarks) && bookmarks.length) out.bookmarks = bookmarks;
  const summaries = get("sessionSummary");
  if (summaries && typeof summaries === "object" && Object.keys(summaries).length) {
    out.sessionNotesSummary = Object.fromEntries(
      Object.entries(summaries).map(([id, v]) => [id, Array.isArray(v) ? { bullets: v as string[], themes: [] } : (v as NoteSummary)]),
    );
  }
  const patterns = get("patternsData");
  if (patterns) out.patternsData = patterns;
  const last = raw("patternsLastEntry");
  if (last) out.patternsLastEntryId = last;
  const monthly = get("monthlySummary");
  if (monthly?.monthKey) out.monthlySummary = monthly;
  const topics = get("extraTopics");
  if (Array.isArray(topics) && topics.length) out.keyTopics = topics;
  const checkins: string[] = [];
  const milestones: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i) || "";
    const ci = k.match(new RegExp(`^between_${userId}_checkin_(\\d{4}-\\d{2}-\\d{2})$`));
    if (ci && storage.getItem(k) === "1") checkins.push(ci[1]);
    const ms = k.match(new RegExp(`^between_milestone_${userId}_(.+)$`));
    if (ms && storage.getItem(k) === "1") milestones.push(ms[1]);
  }
  if (checkins.length) out.intentionCheckins = checkins.sort();
  if (milestones.length) out.milestones = milestones;
  return out;
}

/** Fill only fields that are still empty, so a second device never overwrites real data. */
export function mergeEmpty(state: UserState, extra: Partial<UserState>): Partial<UserState> {
  const patch: Partial<UserState> = {};
  for (const [k, v] of Object.entries(extra) as [keyof UserState, unknown][]) {
    const cur = state[k] as unknown;
    const empty = cur === null || cur === "" || cur === false || (Array.isArray(cur) && cur.length === 0) || (typeof cur === "object" && cur !== null && !Array.isArray(cur) && Object.keys(cur).length === 0);
    if (empty && v !== undefined) (patch as Record<string, unknown>)[k] = v;
  }
  return patch;
}

/** Loads the signed-in user's state, creating it (from my-mvp's old places) on first run. */
export async function loadUserState(): Promise<UserState> {
  const user = currentUser();
  const q = new Parse.Query("UserState");
  q.equalTo("user", user);
  obj = (await q.first()) ?? null;
  let state: UserState;
  if (!obj) {
    obj = new Parse.Object("UserState");
    obj.set("user", user);
    obj.setACL(ownerACL(user));
    state = { ...blankState(), ...fromLegacyUser(user) };
    for (const k of STATE_FIELDS) obj.set(k, state[k]);
    await obj.save();
    await retireLegacyUserFields(user);
  } else {
    state = read(obj);
  }
  // Once per device: pick up anything my-mvp left only in this browser.
  if (typeof window !== "undefined") {
    const flag = `between2_imported_${user.id}`;
    try {
      if (!localStorage.getItem(flag)) {
        const patch = mergeEmpty(state, fromLegacyBrowser(user.id, localStorage));
        if (Object.keys(patch).length) state = await saveUserState(patch, state);
        localStorage.setItem(flag, "1");
      }
    } catch {
      /* storage blocked: nothing to import */
    }
  }
  return state;
}

/** Private fields leave the user record, and the record itself becomes owner-only. */
async function retireLegacyUserFields(user: Parse.User) {
  try {
    for (const k of PRIVATE_USER_FIELDS) if (user.has(k)) user.unset(k);
    user.setACL(ownerACL(user));
    await user.save();
  } catch {
    /* non-blocking: the data is already copied */
  }
}

/** Re-reads from the server, e.g. when the app comes back to the foreground on another device. */
export async function refreshUserState(): Promise<UserState | null> {
  if (!obj) return null;
  await chain;
  try {
    await obj.fetch();
    return read(obj);
  } catch {
    return null;
  }
}

/**
 * Saves only the given fields. Saves run one at a time, in order, so quick
 * successive edits never race. Returns the merged state.
 */
export function saveUserState(patch: Partial<UserState>, base: UserState): Promise<UserState> {
  const next = { ...base, ...patch };
  const run = chain.then(async () => {
    if (!obj) throw new Error("Your data hasn't loaded yet.");
    for (const [k, v] of Object.entries(patch)) obj.set(k, v);
    await obj.save();
  });
  chain = run.catch(() => {});
  return run.then(() => next);
}
