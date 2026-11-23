/**
 * Second Wind, ported from alisonicole/second-wind (index.html, Nov 14 2026).
 * Pure functions over a Garden object so React can re-render from new copies.
 * Wording and growth rules are unchanged.
 */

export interface Plant {
  id: string;
  name: string;
  icon: string;
  color: string;
  why?: string;
  tends: string[]; // dates (YYYY-MM-DD) tended
  rests: string[]; // dates marked as rest days
}

export interface CheckinSlot {
  mood: number | null;
  small: string | null;
  at: number;
}

export interface Appointment {
  id: number;
  what: string;
  date: string;
  time: string;
  where: string;
  note: string;
}

export interface JarItem {
  date: string;
  text: string;
}

export type PlanKey = "reasons" | "triggers" | "warning" | "coping" | "distract" | "help" | "pros" | "safe";
export type SafetyPlan = Record<PlanKey, string>;

export interface Garden {
  gardenOnboarded: boolean;
  bird: string;
  gardenStart: string | null;
  plants: Plant[];
  days: string[]; // days the greenhouse was opened
  checkins: Record<string, { am?: CheckinSlot; pm?: CheckinSlot }>;
  hardy: string[]; // hard days showed up for (winter blooms)
  plan: SafetyPlan;
  appts: Appointment[];
  times: { am: string; pm: string };
  jar: JarItem[];
  seen: string[]; // letter keys already opened
  birdDay: string | null;
  birdSeen: Record<string, boolean>;
}

// ---- Content (verbatim) ------------------------------------------------------

export const STARTER: Omit<Plant, "tends" | "rests">[] = [
  { id: "water", name: "water", icon: "💧", color: "#7FA7B8", why: "Your body is doing the work. Give it water." },
  { id: "meds", name: "meds", icon: "🌿", color: "#7A9E6E", why: "Taking your medicine is a way of keeping a promise to yourself." },
  { id: "dressed", name: "dressed", icon: "👕", color: "#C4A55A", why: "Getting dressed tells your day it has started." },
  { id: "shower", name: "shower", icon: "🫧", color: "#9B8DB5", why: "Warm water is a small reset." },
  { id: "outside", name: "outside", icon: "🌤", color: "#8FB5A0", why: "Fresh air and sky are always available." },
  { id: "ate", name: "ate", icon: "🍵", color: "#C97A6E", why: "Feeding yourself is care, not a chore." },
];

export const NEW_SEEDS: Omit<Plant, "tends" | "rests">[] = [
  { id: "pottery", name: "pottery", icon: "🏺", color: "#B8935A" },
  { id: "friend", name: "call a friend", icon: "📞", color: "#D48A9B" },
  { id: "breathe", name: "box breathing", icon: "🫁", color: "#7A9BB5" },
  { id: "journal", name: "journal", icon: "📓", color: "#7B6EA0" },
  { id: "move", name: "move", icon: "🚶", color: "#C4B447" },
  { id: "music", name: "music", icon: "🎶", color: "#8FB5A0" },
  { id: "flowers", name: "flowers", icon: "💐", color: "#DBA898" },
  { id: "rest", name: "extra rest", icon: "🌙", color: "#5C6B8A" },
];

export const SMALL_THINGS = [
  "Text a friend", "Take a shower or bath", "Cold compress on your forehead", "Five minutes of box breathing",
  "Write a few lines in a notebook", "Draw, paint or take a photo", "Pottery", "A short walk around the block",
  "Some extra rest", "Listen to music, hum or sing", "Buy or smell some flowers", "Put on your favorite perfume",
  "Wear something that makes you feel good", "Look through old photos", "Watch something funny",
  "Do something kind for someone", "Sit in the sun for ten minutes", "List three small things you did today",
];

export const QUOTES: [string, string][] = [
  ["Never let the things you cannot do prevent you from doing the things you can.", "John Wooden"],
  ["We must accept finite disappointment, but never lose infinite hope.", "Martin Luther King Jr."],
  ["Surrounding that non-choice is a million other choices that I can make.", "Michael J. Fox"],
  ["Courage does not always roar. Sometimes courage is the quiet voice at the end of the day saying, “I will try again tomorrow.”", "Mary Anne Radmacher"],
  ["The only thing that can grow is the thing you give energy to.", "attributed to Ralph Waldo Emerson"],
  ["It’s one of the greatest gifts you can give yourself, to forgive.", "Maya Angelou"],
  ["To be alive at all is to have scars.", "John Steinbeck"],
  ["Go wisely and slowly. Those who rush stumble and fall.", "William Shakespeare"],
  ["Crying does not indicate that you are weak. Since birth, it has always been a sign that you are alive.", "attributed to Charlotte Brontë"],
  ["The secret of change is to focus all of your energy, not on fighting the old, but on building the new.", "attributed to Socrates"],
  ["It takes sadness to know happiness, noise to appreciate silence, the night to appreciate daylight.", "Anonymous"],
  ["You are relearning who you are. Breathe, even rediscoveries take patience and time.", "L.E. Bowman"],
];

export const WARM = ["One step at a time.", "That counts.", "You are capable.", "That’s one small way of treating yourself well.", "Gently done.", "Thank you for tending this."];

export const MOODS: [number, string][] = [[1, "very hard"], [2, "hard"], [3, "okay"], [4, "good"], [5, "light"]];

export const MILESTONES: Record<number, string> = {
  3: "Three days in your greenhouse. Something is taking root.",
  7: "One week of showing up. That is real, and it is yours.",
  14: "Two weeks. Look how much you have tended.",
  30: "Thirty days. Your greenhouse remembers every one of them.",
  60: "Sixty days. You kept coming back, one step at a time.",
  90: "Ninety days. Your first season is complete. Life is worth living, and you lived it, one day at a time.",
};

export const PLAN_SECTIONS: [PlanKey, string, string?][] = [
  ["reasons", "Things that motivate me toward recovery"],
  ["triggers", "My triggers"],
  ["warning", "My warning signs"],
  ["coping", "Things I can do on my own to cope"],
  ["distract", "People and places that distract me"],
  ["help", "People I can ask for help", "Name, phone — one per line"],
  ["pros", "Professionals and crisis lines", "Name, phone — one per line"],
  ["safe", "Making my environment safe"],
];

export function blankPlan(): SafetyPlan {
  return { reasons: "", triggers: "", warning: "", coping: "", distract: "", help: "", pros: "988 Suicide & Crisis Lifeline, 988", safe: "" };
}

export function blankGarden(): Garden {
  return {
    gardenOnboarded: false, bird: "", gardenStart: null, plants: [], days: [], checkins: {}, hardy: [],
    plan: blankPlan(), appts: [], times: { am: "08:30", pm: "20:30" }, jar: [], seen: [], birdDay: null, birdSeen: {},
  };
}

// ---- Helpers -----------------------------------------------------------------

export function lines(t: string | undefined | null): string[] {
  return String(t || "").split("\n").map((x) => x.trim()).filter(Boolean);
}

export interface Person { name: string; phone: string; tel: string }

/** "Maria, 555 123 4567" → name + dialable number. Same regex as Second Wind. */
export function parsePerson(l: string): Person {
  const m = l.match(/^(.*?)[\s,:—–-]*([+(]?\d[\d\s().-]{1,}\d)\s*$/);
  if (!m) return { name: l.trim(), phone: "", tel: "" };
  const name = m[1].trim() || m[2];
  return { name, phone: m[2].trim(), tel: m[2].replace(/[^\d+]/g, "") };
}

export function daysBetween(a: string, b: string): number {
  const pa = a.split("-").map(Number), pb = b.split("-").map(Number);
  return Math.round((new Date(pb[0], pb[1] - 1, pb[2]).getTime() - new Date(pa[0], pa[1] - 1, pa[2]).getTime()) / 864e5);
}

export function greeting(hour: number, name?: string): string {
  const g = hour < 5 ? "Still up" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return g + (name ? ", " + name : "");
}

export const isMorning = (hour: number) => hour < 15;

// ---- Growth: cumulative care, never shrinks ----------------------------------

const THRESH = [0, 1, 3, 6, 10, 15, 21, 28];
export const careCount = (p: Plant) => (p.tends || []).length + (p.rests || []).length;
export function stageOf(p: Plant): number {
  const c = careCount(p);
  let s = 0;
  THRESH.forEach((t, i) => { if (c >= t) s = i; });
  return s;
}
export const tendedToday = (p: Plant, today: string) => (p.tends || []).includes(today) || (p.rests || []).includes(today);

function withPlant(g: Garden, id: string, fn: (p: Plant) => Plant): Garden {
  return { ...g, plants: g.plants.map((p) => (p.id === id ? fn({ ...p, tends: [...(p.tends || [])], rests: [...(p.rests || [])] }) : p)) };
}

/** Tap: tend, or untend if already tended today. Returns the toast to show. */
export function toggleTend(g: Garden, id: string, today: string, pick: (a: string[]) => string = (a) => a[0]): { garden: Garden; message: string | null } {
  const before = g.plants.find((p) => p.id === id);
  if (!before) return { garden: g, message: null };
  const stage0 = stageOf(before);
  let message: string | null = null;
  const garden = withPlant(g, id, (p) => {
    p.rests = p.rests.filter((d) => d !== today);
    if (p.tends.includes(today)) {
      p.tends = p.tends.filter((d) => d !== today);
      return p;
    }
    p.tends.push(today);
    const s = stageOf(p);
    message = s > stage0 ? (s === 6 ? `Your ${p.name} bloomed.` : `Your ${p.name} grew a little.`) : pick(WARM);
    return p;
  });
  return { garden, message };
}

/** Press and hold: a rest day counts as tending. */
export function toggleRest(g: Garden, id: string, today: string): { garden: Garden; message: string | null } {
  const p0 = g.plants.find((p) => p.id === id);
  if (!p0 || (p0.tends || []).includes(today)) return { garden: g, message: null };
  let message: string | null = null;
  const garden = withPlant(g, id, (p) => {
    if (p.rests.includes(today)) p.rests = p.rests.filter((d) => d !== today);
    else { p.rests.push(today); message = "Rest counts as tending."; }
    return p;
  });
  return { garden, message };
}

export function markShowedUp(g: Garden, today: string): Garden {
  return g.days.includes(today) ? g : { ...g, days: [...g.days, today] };
}

export function plantSeeds(g: Garden, ids: string[]): Garden {
  return { ...g, plants: STARTER.filter((p) => ids.includes(p.id)).map((p) => ({ ...p, tends: [], rests: [] })) };
}

export function addSeed(g: Garden, id: string): Garden {
  const s = NEW_SEEDS.find((x) => x.id === id);
  if (!s || g.plants.some((p) => p.id === id)) return g;
  return { ...g, plants: [...g.plants, { ...s, tends: [], rests: [] }] };
}

export function recordCheckin(g: Garden, today: string, slot: "am" | "pm", ci: { mood: number | null; small: string | null }, now: number): Garden {
  const rec = { ...(g.checkins[today] || {}) };
  rec[slot] = { mood: ci.mood, small: ci.small, at: now };
  const hard = ci.mood !== null && ci.mood <= 2;
  return {
    ...g,
    checkins: { ...g.checkins, [today]: rec },
    hardy: hard && !g.hardy.includes(today) ? [...g.hardy, today] : g.hardy,
  };
}

export function addToJar(g: Garden, today: string, text: string): Garden {
  const t = text.trim();
  return t ? { ...g, jar: [{ date: today, text: t }, ...g.jar] } : g;
}

export function upcomingAppts(appts: Appointment[], today: string): Appointment[] {
  return appts.filter((a) => a.date >= today).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export function pastAppts(appts: Appointment[], today: string): Appointment[] {
  return appts.filter((a) => a.date < today).sort((a, b) => b.date.localeCompare(a.date));
}

/** Safety plan must name one coping step and one person or professional. */
export function planIsUsable(plan: SafetyPlan): boolean {
  return lines(plan.coping).length > 0 && (lines(plan.help).length > 0 || lines(plan.pros).length > 0);
}

/** People for Help now: plan helpers, then professionals, minus 988 (already a button). */
export function helpPeople(plan: SafetyPlan): Person[] {
  return lines(plan.help).map(parsePerson).concat(lines(plan.pros).map(parsePerson).filter((p) => p.tel !== "988"));
}

// ---- Bird letters ------------------------------------------------------------

export type Letter =
  | { type: "milestone"; key: string; text: string }
  | { type: "seed"; key: string }
  | { type: "jar"; key: string; item: JarItem }
  | { type: "quote"; key: string; q: [string, string] };

/** Same schedule as Second Wind: milestones first, a seed each week, then a gentle, deterministic mix. */
export function pendingLetter(g: Garden, today: string): Letter | null {
  if (g.birdSeen[today]) return null;
  const n = g.days.length;
  const ms = Object.keys(MILESTONES).map(Number).find((d) => n >= d && !g.seen.includes("m" + d));
  if (ms) return { type: "milestone", key: "m" + ms, text: MILESTONES[ms] };
  const age = g.gardenStart ? daysBetween(g.gardenStart, today) : 0;
  const wk = Math.floor(age / 7);
  if (wk >= 1 && !g.seen.includes("w" + wk) && g.plants.length < 9) return { type: "seed", key: "w" + wk };
  if (g.birdDay === today) return null;
  const r = (n * 7 + 3) % 10;
  if (r < 3 && g.jar.length > 2) return { type: "jar", key: "j" + today, item: g.jar[(n * 3) % g.jar.length] };
  if (r < 5) return { type: "quote", key: "q" + today, q: QUOTES[(n * 5) % QUOTES.length] };
  return null;
}

export function letterOpened(g: Garden, key: string, today: string): Garden {
  return { ...g, seen: [...g.seen, key], birdSeen: { ...g.birdSeen, [today]: true }, birdDay: today };
}

// ---- Calendar reminders (.ics) -----------------------------------------------

function icsDT(date: string, time?: string) {
  return date.replace(/-/g, "") + "T" + (time || "09:00").replace(":", "") + "00";
}

function icsText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildICS(g: Garden, today: string, now: Date = new Date()): string {
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Between//EN", "CALSCALE:GREGORIAN"];
  const stamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const ev = (uid: string, start: string, sum: string, desc: string, rrule: string | null, alarm: string) => {
    L.push("BEGIN:VEVENT", `UID:${uid}@between`, `DTSTAMP:${stamp}`, `DTSTART:${start}`, "DURATION:PT10M", `SUMMARY:${icsText(sum)}`, `DESCRIPTION:${icsText(desc)}`);
    if (rrule) L.push(rrule);
    L.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(sum)}`, `TRIGGER:${alarm}`, "END:VALARM", "END:VEVENT");
  };
  ev("am", icsDT(today, g.times.am), "Between · morning check-in", "Water your greenhouse. One step at a time.", "RRULE:FREQ=DAILY", "PT0M");
  ev("pm", icsDT(today, g.times.pm), "Between · evening check-in", "Tuck your greenhouse in for the night.", "RRULE:FREQ=DAILY", "PT0M");
  upcomingAppts(g.appts, today).forEach((a) => {
    ev("ap" + a.id, icsDT(a.date, a.time), a.what, (a.where || "") + (a.note ? " · Questions: " + a.note.replace(/\n/g, " ") : ""), null, "-PT1H");
  });
  L.push("END:VCALENDAR");
  return L.join("\r\n");
}

// ---- Import a Second Wind backup ---------------------------------------------

/** Validates a Second Wind backup (Settings → Download a backup) and maps it to a Garden. */
export function fromSecondWindBackup(raw: unknown): { garden: Garden; name: string } {
  if (!raw || typeof raw !== "object" || !("plan" in raw)) throw new Error("That file isn't a Second Wind backup.");
  const d = raw as Record<string, unknown>;
  const b = blankGarden();
  const arr = <T>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
  const obj = <T extends object>(v: unknown, fallback: T): T => (v && typeof v === "object" && !Array.isArray(v) ? ({ ...fallback, ...(v as T) }) : fallback);
  const garden: Garden = {
    gardenOnboarded: Boolean(d.onboarded),
    bird: typeof d.bird === "string" ? d.bird : "",
    gardenStart: typeof d.startDate === "string" ? d.startDate : null,
    plants: arr<Plant>(d.plants, []).map((p) => ({ ...p, tends: arr(p.tends, []), rests: arr(p.rests, []) })),
    days: arr<string>(d.days, []),
    checkins: obj(d.checkins, {}),
    hardy: arr<string>(d.hardy, []),
    plan: obj(d.plan, b.plan),
    appts: arr<Appointment>(d.appts, []).map((a) => ({ ...a, note: a.note || "", where: a.where || "", time: a.time || "" })),
    times: obj(d.times, b.times),
    jar: arr<JarItem>(d.jar, []),
    seen: arr<string>(d.seen, []),
    birdDay: typeof d.birdDay === "string" ? d.birdDay : null,
    birdSeen: obj(d.birdSeen, {}),
  };
  return { garden, name: typeof d.name === "string" ? d.name : "" };
}

// ---- Prep: what the week looked like -----------------------------------------

export interface WeekSummary {
  checkins: number;
  averageMood: number | null;
  hardDays: number;
  daysTended: number;
  moods: { date: string; mood: number }[];
}

/** Check-ins and tending since a date (the last session), for the Before view. */
export function summarizeSince(g: Garden, since: string | null, today: string): WeekSummary {
  const inRange = (d: string) => (!since || d >= since) && d <= today;
  const moods: { date: string; mood: number }[] = [];
  let checkins = 0;
  Object.entries(g.checkins).filter(([d]) => inRange(d)).sort(([a], [b]) => a.localeCompare(b)).forEach(([date, slots]) => {
    (["am", "pm"] as const).forEach((s) => {
      const c = slots[s];
      if (!c) return;
      checkins++;
      if (typeof c.mood === "number") moods.push({ date, mood: c.mood });
    });
  });
  const tended = new Set<string>();
  g.plants.forEach((p) => [...(p.tends || []), ...(p.rests || [])].filter(inRange).forEach((d) => tended.add(d)));
  const avg = moods.length ? Math.round((moods.reduce((s, m) => s + m.mood, 0) / moods.length) * 10) / 10 : null;
  return { checkins, averageMood: avg, hardDays: g.hardy.filter(inRange).length, daysTended: tended.size, moods };
}
