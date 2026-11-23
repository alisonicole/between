import { describe, it, expect } from "vitest";
import { combineLog, entryPreview } from "./archive";
import { entry, snap } from "./test-fixtures";

describe("combineLog", () => {
  it("sorts newest date first, then newest timestamp", () => {
    const items = combineLog(
      [entry({ parseId: "a", date: "2026-11-01" }), entry({ parseId: "b", date: "2026-11-03" })],
      [snap({ parseId: "c", sessionDate: "2026-11-03", timestamp: "2026-11-03T20:00:00Z" })],
    );
    expect(items.map((i) => i.id)).toEqual(["s-c", "e-b", "e-a"]);
  });
});

describe("entryPreview", () => {
  it("shows the first 60 characters like my-mvp", () => {
    expect(entryPreview(entry({ text: "x".repeat(80) }))).toBe("x".repeat(60) + "...");
  });
  it("never shows ciphertext", () => {
    expect(entryPreview(entry({ locked: true, text: "U2FsdGVkX1abc" }))).toBe("Locked entry from the old app");
  });
});
