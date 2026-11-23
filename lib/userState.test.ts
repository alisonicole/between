import { describe, it, expect } from "vitest";
import { blankState, fromLegacyBrowser, mergeEmpty } from "./userState";

function store(items: Record<string, string>) {
  const keys = Object.keys(items);
  return { getItem: (k: string) => items[k] ?? null, key: (i: number) => keys[i] ?? null, length: keys.length };
}

describe("picking up my-mvp's browser-only data", () => {
  it("reads bookmarks, summaries, check-ins and milestones for this user only", () => {
    const s = store({
      between_u1_bookmarks: JSON.stringify([{ parseId: "e1", text: "t", date: "2026-11-01" }]),
      between_u1_sessionSummary: JSON.stringify({ s1: ["old-style bullet"], s2: { bullets: ["b"], themes: ["Work"] } }),
      between_u1_patternsLastEntry: "e9",
      "between_u1_checkin_2026-11-20": "1",
      between_milestone_u1_entry1: "1",
      between_u2_bookmarks: JSON.stringify([{ parseId: "x" }]),
    });
    const out = fromLegacyBrowser("u1", s);
    expect(out.bookmarks).toEqual([{ parseId: "e1", text: "t", date: "2026-11-01" }]);
    expect(out.sessionNotesSummary).toEqual({ s1: { bullets: ["old-style bullet"], themes: [] }, s2: { bullets: ["b"], themes: ["Work"] } });
    expect(out.patternsLastEntryId).toBe("e9");
    expect(out.intentionCheckins).toEqual(["2026-11-20"]);
    expect(out.milestones).toEqual(["entry1"]);
  });
  it("never overwrites data that already synced from another device", () => {
    const state = { ...blankState(), bookmarks: [{ parseId: "keep", text: "", date: "" }] };
    const patch = mergeEmpty(state, { bookmarks: [{ parseId: "old", text: "", date: "" }], milestones: ["entry1"] });
    expect(patch).toEqual({ milestones: ["entry1"] });
  });
});
