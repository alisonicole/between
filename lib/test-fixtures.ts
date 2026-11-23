import type { Entry, Snapshot } from "./types";

export const entry = (p: Partial<Entry>): Entry => ({
  parseId: "e1", id: "1", date: "2026-11-01", text: "", prompt: "", timestamp: "2026-11-01T10:00:00Z", locked: false, isWelcomeEntry: false, ...p,
});
export const snap = (p: Partial<Snapshot>): Snapshot => ({
  parseId: "s1", id: "1", sessionDate: "2026-11-01", timestamp: "2026-11-01T10:00:00Z", notes: "", prepNote: "", nextSteps: "",
  intention: "", avoiding: [], discussedTopics: [], isExampleSnapshot: false, locked: false, ...p,
});
