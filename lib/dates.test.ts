import { describe, it, expect } from "vitest";
import { formatDate, getToday } from "./dates";

describe("dates", () => {
  it("uses the local calendar day", () => {
    expect(getToday(new Date(2026, 10, 22, 23, 30))).toBe("2026-11-22");
  });
  it("formats like 1.0", () => {
    expect(formatDate("2026-11-22")).toBe("Nov 22, 2026");
  });
});
