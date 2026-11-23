import { describe, it, expect } from "vitest";
import {
  entriesForAnalysis, entriesForPatterns, entryMilestone, fallbackName, lastSessionContext, monthlySummaryTarget,
  patternInsights, patternsRefreshState, realEntries, recurringThemes, WELCOME_TEXT,
} from "./between";
import { entry, snap } from "./test-fixtures";

const E = [
  entry({ parseId: "e4", date: "2026-11-21", text: "latest", prompt: "What weighed on you?" }),
  entry({ parseId: "e3", date: "2026-11-19", text: "after session" }),
  entry({ parseId: "e2", date: "2026-11-10", text: "before session" }),
  entry({ parseId: "w", date: "2026-11-01", text: "Welcome", isWelcomeEntry: true }),
  entry({ parseId: "l", date: "2026-11-20", text: "U2FsdGVkX1", locked: true }),
];
const S = [snap({ parseId: "s1", sessionDate: "2026-11-15", notes: "Talked about mom", nextSteps: "Call her", discussedTopics: ["Boundaries"] })];

describe("AI inputs", () => {
  it("analysis uses entries since the last session, with prompts, never welcome or locked ones", () => {
    expect(entriesForAnalysis(E, S)).toEqual(["Prompt: What weighed on you?\n\nEntry: latest", "after session"]);
  });
  it("falls back to recent entries if nothing was written since the session", () => {
    expect(entriesForAnalysis(E, [snap({ sessionDate: "2026-12-01" })])).toHaveLength(3);
  });
  it("patterns get text and dates since the session", () => {
    expect(entriesForPatterns(E, S)).toEqual([{ text: "latest", date: "2026-11-21" }, { text: "after session", date: "2026-11-19" }]);
  });
  it("builds my-mvp's last-session context", () => {
    expect(lastSessionContext(S[0])).toBe("Key topics covered: Boundaries\nSession notes: Talked about mom\nNext steps: Call her");
    expect(lastSessionContext(null)).toBeUndefined();
  });
});

describe("patterns", () => {
  it("keeps insights from both field spellings when a session is logged", () => {
    const p = { contradictions: [{ label: "Contradiction", description: "Wants rest, schedules more" }], unfinishedThoughts: [{ phrase: "I just wish" }], wordAssociations: [{ word: "home", associations: ["safe", "tired"] }] };
    expect(patternInsights(p)).toEqual(["Contradiction: Wants rest, schedules more", "Unfinished thought: I just wish", "home: safe · tired"]);
  });
  it("disables Refresh when nothing is new", () => {
    expect(patternsRefreshState(E, S, "e4").disabled).toBe(true);
    expect(patternsRefreshState(E, S, "e3")).toEqual({ disabled: false, title: "" });
    expect(patternsRefreshState(E, [snap({ sessionDate: "2026-11-22" })], null).title).toBe("Log a journal entry to refresh");
  });
});

describe("other rules", () => {
  it("recurring themes need 3 sessions", () => {
    const snaps = ["a", "b", "c"].map((id) => snap({ parseId: id }));
    const sums = { a: { bullets: [], themes: ["Work"] }, b: { bullets: [], themes: ["work"] }, c: { bullets: [], themes: ["Work", "Mom"] } };
    expect(recurringThemes(snaps, sums).map((t) => [t.display, t.count])).toEqual([["Work", 3]]);
  });
  it("monthly summary targets last month's real entries", () => {
    const t = monthlySummaryTarget([...E, entry({ date: "2026-10-05", text: "october" })], new Date(2026, 10, 22));
    expect(t.monthKey).toBe("2026-9");
    expect(t.month).toBe("October 2026");
    expect(t.entries).toEqual([{ date: "2026-10-05", content: "october" }]);
  });
  it("milestones, names, and the welcome text", () => {
    expect([1, 2, 3, 4, 5].map(entryMilestone)).toEqual(["entry1", "entry2", "entry3", null, "entry5"]);
    expect(fallbackName("lee.alisonnicole@gmail.com")).toBe("Lee");
    expect(realEntries(E).map((e) => e.parseId)).toEqual(["e4", "e3", "e2"]);
    expect(WELCOME_TEXT).not.toMatch(/end-to-end/i);
  });
});
