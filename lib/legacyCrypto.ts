import CryptoJS from "crypto-js";

/**
 * The live Between app (my-mvp) encrypted some fields with a key derived from
 * the user's password. Google sign-in has no password, so 2.0 decrypts these
 * once, when the user enters their old password during migration.
 */

// CryptoJS passphrase output is OpenSSL format: base64 of "Salted__..."
const ENCRYPTED_PREFIX = "U2FsdGVkX1";
const LEGACY_SALT = "between-app-salt-2026";

export const ENCRYPTED_FIELDS = {
  Entry: { text: ["text", "prompt"], lists: [] as string[] },
  SessionSnapshot: {
    text: ["notes", "prepNote", "nextSteps", "intention"],
    lists: ["avoiding"],
  },
} as const;

export type LegacyClass = keyof typeof ENCRYPTED_FIELDS;

export function isEncrypted(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(ENCRYPTED_PREFIX);
}

export function deriveLegacyKey(password: string): string {
  return CryptoJS.SHA256(password + LEGACY_SALT).toString();
}

/** Returns the plaintext, or null if the key is wrong or the value is corrupt. */
export function decryptLegacy(value: string, key: string): string | null {
  try {
    const out = CryptoJS.AES.decrypt(value, key).toString(CryptoJS.enc.Utf8);
    return out === "" ? null : out;
  } catch {
    return null;
  }
}

/** Test helper and the format my-mvp wrote. */
export function encryptLegacy(text: string, key: string): string {
  return CryptoJS.AES.encrypt(text, key).toString();
}

interface Readable {
  get(field: string): unknown;
}

/** True if any encrypted field on this record is still locked. */
export function recordIsLocked(cls: LegacyClass, rec: Readable): boolean {
  const spec = ENCRYPTED_FIELDS[cls];
  if (spec.text.some((f) => isEncrypted(rec.get(f)))) return true;
  return spec.lists.some((f) => {
    const v = rec.get(f);
    return Array.isArray(v) && v.some(isEncrypted);
  });
}

/**
 * Works out the decrypted values for one record. Pure: returns the changes
 * instead of writing them. `failed` counts fields the key could not open.
 */
export function decryptRecord(
  cls: LegacyClass,
  rec: Readable,
  key: string,
): { changes: Record<string, string | string[]>; failed: number } {
  const spec = ENCRYPTED_FIELDS[cls];
  const changes: Record<string, string | string[]> = {};
  let failed = 0;

  for (const f of spec.text) {
    const v = rec.get(f);
    if (!isEncrypted(v)) continue;
    const plain = decryptLegacy(v, key);
    if (plain === null) failed++;
    else changes[f] = plain;
  }

  for (const f of spec.lists) {
    const v = rec.get(f);
    if (!Array.isArray(v) || !v.some(isEncrypted)) continue;
    let listFailed = false;
    const next = v.map((item) => {
      if (!isEncrypted(item)) return item;
      const plain = decryptLegacy(item, key);
      if (plain === null) {
        listFailed = true;
        return item;
      }
      return plain;
    });
    if (listFailed) failed++;
    else changes[f] = next as string[];
  }

  return { changes, failed };
}
