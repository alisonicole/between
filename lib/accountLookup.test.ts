import { describe, it, expect } from "vitest";
import { decideLookup, maskEmail } from "./accountLookup";

describe("decideLookup", () => {
  it("signs in a user already linked to this Google account", () => {
    expect(decideLookup("g1", "a@x.com", [{ googleSub: "g1" }], [])).toEqual({ state: "ready" });
    expect(decideLookup("g1", "a@x.com", [], [{ authData: { google: { id: "g1" } } }])).toEqual({ state: "ready" });
  });
  it("creates a new user when no account has this email", () => {
    expect(decideLookup("g1", "a@x.com", [], [])).toEqual({ state: "ready" });
  });
  it("asks to unlock an email/password account once", () => {
    expect(decideLookup("g1", "alison@x.com", [], [{ username: "Alison@x.com", email: "alison@x.com" }]))
      .toEqual({ state: "legacy", username: "Alison@x.com", maskedEmail: "a•••@x.com" });
  });
  it("refuses to link an account owned by another Google login", () => {
    expect(decideLookup("g1", "a@x.com", [], [{ authData: { google: { id: "g2" } } }])).toEqual({ state: "conflict" });
  });
  it("masks emails", () => {
    expect(maskEmail("alison@gmail.com")).toBe("a•••@gmail.com");
  });
});
