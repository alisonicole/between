import { decryptRecord, type LegacyClass } from "./legacyCrypto";

/**
 * The record shape migration needs. Parse.Object satisfies it; tests use fakes.
 */
export interface MigratableRecord {
  get(field: string): unknown;
  set(field: string, value: unknown): unknown;
  setACL(acl: unknown): unknown;
}

export interface ClassResult {
  total: number;
  unlocked: number; // had encrypted fields, now readable
  stillLocked: number; // could not be opened with this password
}

/**
 * Decrypts every record in place and makes it owner-only. Returns the records
 * that changed (to save) and the counts to show the user.
 */
export function prepareMigration<T extends MigratableRecord>(
  cls: LegacyClass,
  records: T[],
  key: string,
  acl: unknown,
): { toSave: T[]; result: ClassResult } {
  const result: ClassResult = { total: records.length, unlocked: 0, stillLocked: 0 };
  const toSave: T[] = [];
  for (const r of records) {
    const { changes, failed } = decryptRecord(cls, r, key);
    const changed = Object.keys(changes).length > 0;
    for (const [f, v] of Object.entries(changes)) r.set(f, v);
    if (failed > 0) result.stillLocked++;
    else if (changed) result.unlocked++;
    // Every legacy row gets an owner-only ACL, encrypted or not: 1.0 never set one.
    r.setACL(acl);
    toSave.push(r);
  }
  return { toSave, result };
}
