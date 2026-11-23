/** my-mvp's session logic, as pure functions. Behavior matches my-mvp's App.jsx unless noted. */
import type { Analysis, Entry, NoteSummary, PatternsData, Snapshot } from "./types";

export const MIN_ENTRIES = 3;

// my-mvp's welcome entry, with its last line corrected: Google sign-in can't keep
// password-based encryption, so "end-to-end encrypted" would no longer be true.
export const WELCOME_PREFIX = "Welcome to Between! 👋";
export const WELCOME_TEXT = `${WELCOME_PREFIX}

Here's how to get the most out of your journaling practice:

📝 Write Between Sessions
Capture thoughts, feelings, and moments as they come up between sessions. Don't wait until your next appointment — write when something resonates.

✨ Get AI Insights
After a few entries, go to the Patterns tab to see what themes are emerging in your life.

💬 Prep for Session
Before your session, tap Sessions to review what you've been working through and get a suggested conversation starter.

🎤 Use Voice Input
Don't feel like typing? Use voice input to speak your thoughts.

🌱 Tend Your Greenhouse
Check in morning and evening, and keep your safety plan one tap away with Help now.

🔒 Your Privacy Matters
Everything you write is private to your account. Only you can read it.`;

/** Entries the AI may see and that count toward milestones: not the welcome entry, not still locked. */
export const realEntries = (entries: Entry[]) => entries.filter((e) => !e.isWelcomeEntry && !e.locked);
export const realHistory = (snaps: Snapshot[]) => snaps.filter((s) => !s.isExampleSnapshot);
export const lastSnapshotOf = (snaps: Snapshot[]) => realHistory(snaps)[0] ?? snaps[0] ?? null;

const cutoffOf = (s: Snapshot | null | undefined) => s?.sessionDate || s?.timestamp?.slice(0, 10) || null;

/** analyzeJournal input: entries since the last session (max 20), else the latest 20. */
export function entriesForAnalysis(entries: Entry[], snaps: Snapshot[]): string[] {
  const journal = realEntries(entries);
  const cutoff = cutoffOf(realHistory(snaps)[0]);
  let pick = cutoff ? journal.filter((e) => e.date >= cutoff).slice(0, 20) : journal.slice(0, 20);
  if (!pick.length) pick = journal.slice(0, 20);
  return pick.map((e) => (e.prompt ? `Prompt: ${e.prompt}\n\nEntry: ${e.text}` : e.text));
}

/** analyzePatterns input: entries since the last session, max 15. */
export function entriesForPatterns(entries: Entry[], snaps: Snapshot[]): { text: string; date: string }[] {
  const journal = realEntries(entries);
  const cutoff = cutoffOf(realHistory(snaps)[0]);
  return (cutoff ? journal.filter((e) => e.date >= cutoff) : journal).slice(0, 15).map((e) => ({ text: e.text, date: e.date }));
}

export function lastSessionContext(s: Snapshot | null | undefined): string | undefined {
  if (!s) return undefined;
  const parts: string[] = [];
  if (s.prepNote) parts.push(`What I wanted to discuss: ${s.prepNote}`);
  if (s.discussedTopics?.length) parts.push(`Key topics covered: ${s.discussedTopics.join(", ")}`);
  if (s.avoiding?.length) parts.push(`Patterns noted: ${s.avoiding.join("; ")}`);
  if (s.notes) parts.push(`Session notes: ${s.notes}`);
  if (s.nextSteps) parts.push(`Next steps: ${s.nextSteps}`);
  return parts.length ? parts.join("\n") : undefined;
}

export const PLACEHOLDER_ANALYSIS: Analysis = {
  themes: ["Capture at least 3 thoughts to see patterns"],
  avoiding: ["Begin capturing your thoughts between sessions"],
  questions: ["What would you like to explore?"],
  placeholder: true,
};

/** Normalized pattern cards. my-mvp rendered unfinishedThoughts/wordAssociations but saved
 *  unfinished/associations, so snapshots lost them; both spellings are read here. */
export function patternCards(p: PatternsData | null | undefined) {
  if (!p) return { themes: [], cards: [] as { kind: string; label: string; description: string; quotes: { date: string; text: string }[]; prompt?: string; key: string }[] };
  const themes = (p.themes || []).map((t) => (typeof t === "string" ? { name: t } : t));
  const cards: { kind: string; label: string; description: string; quotes: { date: string; text: string }[]; prompt?: string; key: string }[] = [];
  (p.contradictions || []).forEach((c) => {
    const description = c.description || c.pattern || "";
    cards.push({ kind: "c", label: c.label || "Contradiction", description, quotes: c.quotes || [c.entry1, c.entry2].filter(Boolean).map((t: string) => ({ date: "", text: t })), prompt: c.prompt, key: description });
  });
  (p.unfinishedThoughts || p.unfinished || []).forEach((u) => {
    const description = u.description || u.phrase || "";
    cards.push({ kind: "u", label: u.label || "Unfinished thought", description, quotes: u.quotes || [], prompt: u.prompt || u.context, key: description });
  });
  (p.wordAssociations || p.associations || []).forEach((a) => {
    const description = a.description || (Array.isArray(a.associations) ? a.associations.join(" · ") : a.associations) || "";
    cards.push({ kind: "a", label: a.label || a.word || "", description, quotes: a.quotes || [], prompt: a.prompt, key: a.label || a.word || description });
  });
  return { themes, cards };
}

/** What a logged session keeps from Patterns: "Label: description" lines. */
export function patternInsights(p: PatternsData | null | undefined): string[] {
  return patternCards(p).cards.map((c) => (c.description ? `${c.label}: ${c.description}` : c.label)).filter(Boolean);
}

/** Themes that came up in 3 or more sessions (Progress view). */
export function recurringThemes(snaps: Snapshot[], summaries: Record<string, NoteSummary>) {
  const count: Record<string, { count: number; display: string; sessions: string[] }> = {};
  snaps.forEach((s) => {
    (summaries[s.parseId]?.themes ?? []).forEach((t) => {
      const k = t.toLowerCase().trim();
      count[k] = count[k] || { count: 0, display: t, sessions: [] };
      count[k].count++;
      count[k].sessions.push(s.sessionDate);
    });
  });
  return Object.values(count).filter((t) => t.count >= 3).sort((a, b) => b.count - a.count);
}

/** The monthly summary covers last month, once there are entries from it. */
export function monthlySummaryTarget(entries: Entry[], now: Date) {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthKey = `${prev.getFullYear()}-${prev.getMonth()}`;
  const month = prev.toLocaleString("en-US", { month: "long", year: "numeric" });
  const inMonth = realEntries(entries).filter((e) => {
    if (!e.date) return false;
    const d = new Date(e.date + "T12:00");
    return d.getFullYear() === prev.getFullYear() && d.getMonth() === prev.getMonth();
  });
  return { monthKey, month, entries: inMonth.map((e) => ({ date: e.date, content: e.text })) };
}

/** Engagement message milestones, by count of real entries. */
export function entryMilestone(count: number): "entry1" | "entry2" | "entry3" | "entry5" | null {
  return ({ 1: "entry1", 2: "entry2", 3: "entry3", 5: "entry5" } as const)[count as 1 | 2 | 3 | 5] ?? null;
}

/** "lee.alisonnicole@gmail.com" → "Lee" when no display name is set (my-mvp's fallback). */
export function fallbackName(username: string | undefined): string {
  const first = (username || "").split("@")[0].split(".")[0];
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** Patterns' Refresh is off when nothing new was written since the last run, or the last thing logged was a session. */
export function patternsRefreshState(entries: Entry[], snaps: Snapshot[], lastEntryId: string | null) {
  const latestEntry = realEntries(entries)[0];
  const latestSnap = realHistory(snaps)[0];
  const snapshotIsNewer = Boolean(latestSnap && latestEntry && latestSnap.sessionDate > latestEntry.date);
  const noNewEntries = Boolean(latestEntry && latestEntry.parseId === lastEntryId);
  return {
    disabled: !latestEntry || snapshotIsNewer || noNewEntries,
    title: snapshotIsNewer ? "Log a journal entry to refresh" : noNewEntries ? "No new entries since last refresh" : "",
  };
}
