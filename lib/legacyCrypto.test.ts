import { describe, it, expect } from "vitest";
import CryptoJS from "crypto-js";
import {
  decryptLegacy,
  decryptRecord,
  deriveLegacyKey,
  encryptLegacy,
  isEncrypted,
  recordIsLocked,
} from "./legacyCrypto";

const rec = (o: Record<string, unknown>) => ({ get: (f: string) => o[f] });

describe("deriveLegacyKey", () => {
  it("matches my-mvp's derivation exactly", () => {
    const expected = CryptoJS.SHA256("hunter2" + "between-app-salt-2026").toString();
    expect(deriveLegacyKey("hunter2")).toBe(expected);
  });
});

describe("encrypt / decrypt round trip", () => {
  const key = deriveLegacyKey("correct horse");
  it("decrypts what my-mvp wrote", () => {
    const c = encryptLegacy("I felt anxious at work", key);
    expect(isEncrypted(c)).toBe(true);
    expect(decryptLegacy(c, key)).toBe("I felt anxious at work");
  });
  it("returns null with the wrong password", () => {
    const c = encryptLegacy("private", key);
    expect(decryptLegacy(c, deriveLegacyKey("wrong"))).toBeNull();
  });
  it("does not treat plaintext as encrypted", () => {
    expect(isEncrypted("just a normal entry")).toBe(false);
    expect(isEncrypted(undefined)).toBe(false);
  });
});

describe("decryptRecord", () => {
  const key = deriveLegacyKey("pw");
  it("decrypts Entry text and prompt, leaving plaintext alone", () => {
    const r = rec({ text: encryptLegacy("hello", key), prompt: "plain prompt" });
    expect(decryptRecord("Entry", r, key)).toEqual({ changes: { text: "hello" }, failed: 0 });
  });
  it("decrypts snapshot text fields and the avoiding list", () => {
    const r = rec({
      notes: encryptLegacy("notes", key),
      nextSteps: encryptLegacy("steps", key),
      avoiding: [encryptLegacy("conflict", key), "already plain"],
    });
    const out = decryptRecord("SessionSnapshot", r, key);
    expect(out.failed).toBe(0);
    expect(out.changes).toEqual({
      notes: "notes",
      nextSteps: "steps",
      avoiding: ["conflict", "already plain"],
    });
  });
  it("reports failures and never writes partial lists", () => {
    const other = deriveLegacyKey("other");
    const r = rec({ text: encryptLegacy("x", other) });
    expect(decryptRecord("Entry", r, key)).toEqual({ changes: {}, failed: 1 });
    const s = rec({ avoiding: [encryptLegacy("a", key), encryptLegacy("b", other)] });
    expect(decryptRecord("SessionSnapshot", s, key)).toEqual({ changes: {}, failed: 1 });
  });
  it("recordIsLocked spots encrypted fields and lists", () => {
    expect(recordIsLocked("Entry", rec({ text: encryptLegacy("x", key) }))).toBe(true);
    expect(recordIsLocked("Entry", rec({ text: "x" }))).toBe(false);
    expect(recordIsLocked("SessionSnapshot", rec({ avoiding: [encryptLegacy("x", key)] }))).toBe(true);
  });
});
