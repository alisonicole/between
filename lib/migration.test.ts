import { describe, it, expect } from "vitest";
import { prepareMigration } from "./migration";
import { deriveLegacyKey, encryptLegacy } from "./legacyCrypto";

class Fake {
  acl: unknown = null;
  constructor(public data: Record<string, unknown>) {}
  get(f: string) { return this.data[f]; }
  set(f: string, v: unknown) { this.data[f] = v; }
  setACL(a: unknown) { this.acl = a; }
}

describe("prepareMigration", () => {
  const key = deriveLegacyKey("old-password");
  it("decrypts, counts, and locks down every row", () => {
    const rows = [
      new Fake({ text: encryptLegacy("first", key) }),
      new Fake({ text: "written in between-app, never encrypted" }),
      new Fake({ text: encryptLegacy("other password", deriveLegacyKey("changed")) }),
    ];
    const { toSave, result } = prepareMigration("Entry", rows, key, "OWNER");
    expect(result).toEqual({ total: 3, unlocked: 1, stillLocked: 1 });
    expect(toSave).toHaveLength(3); // no row dropped
    expect(rows[0].data.text).toBe("first");
    expect(rows[1].data.text).toBe("written in between-app, never encrypted");
    expect(rows.every((r) => r.acl === "OWNER")).toBe(true);
  });
  it("is safe to run twice", () => {
    const row = new Fake({ text: encryptLegacy("once", key) });
    prepareMigration("Entry", [row], key, "OWNER");
    const second = prepareMigration("Entry", [row], key, "OWNER");
    expect(second.result).toEqual({ total: 1, unlocked: 0, stillLocked: 0 });
    expect(row.data.text).toBe("once");
  });
});
