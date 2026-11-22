import { describe, it, expect } from "vitest";
import { archivePreview, combineArchive } from "./archive";
import type { Entry, Snapshot } from "./types";

const entry = (p: Partial<Entry>): Entry => ({
  parseId: "e1", id: "1", date: "2026-11-01", title: "", text: "", timestamp: "2026-11-01T10:00:00Z", locked: false, ...p,
});
const snap = (p: Partial<Snapshot>): Snapshot => ({
  parseId: "s1", id: "1", sessionDate: "2026-11-01", timestamp: "2026-11-01T10:00:00Z",
  themes: [], avoiding: [], questions: [], openingStatement: "", notes: "", nextSteps: "", locked: false, ...p,
});

describe("combineArchive", () => {
  it("sorts newest date first, then newest timestamp", () => {
    const items = combineArchive(
      [entry({ parseId: "a", date: "2026-11-01" }), entry({ parseId: "b", date: "2026-11-03" })],
      [snap({ parseId: "c", sessionDate: "2026-11-03", timestamp: "2026-11-03T20:00:00Z" })],
    );
    expect(items.map((i) => i.id)).toEqual(["s-c", "e-b", "e-a"]);
  });
});

describe("archivePreview", () => {
  it("uses the title, else the first 60 characters", () => {
    expect(archivePreview(combineArchive([entry({ title: "Work" })], [])[0])).toBe("Work");
    const long = "x".repeat(80);
    expect(archivePreview(combineArchive([entry({ text: long })], [])[0])).toBe("x".repeat(60) + "...");
  });
  it("strips the starter prefix and trailing period for snapshots", () => {
    const s = snap({ openingStatement: "I think what I'd like to talk about today is my boundaries at work." });
    expect(archivePreview(combineArchive([], [s])[0])).toBe("my boundaries at work");
  });
  it("labels locked items instead of showing ciphertext", () => {
    expect(archivePreview(combineArchive([entry({ locked: true, text: "U2FsdGVkX1abc" })], [])[0]))
      .toBe("Locked entry from the old app");
  });
});
