import type { Entry, Snapshot } from "./types";

export type LogItem =
  | { id: string; type: "entry"; data: Entry; date: string; ts: string }
  | { id: string; type: "snap"; data: Snapshot; date: string; ts: string };

/** Journal log: entries and session snapshots in one list, newest first (my-mvp's `combined`). */
export function combineLog(entries: Entry[], snapshots: Snapshot[]): LogItem[] {
  const items: LogItem[] = [
    ...entries.map((e) => ({ id: `e-${e.parseId || e.id}`, type: "entry" as const, data: e, date: e.date, ts: e.timestamp })),
    ...snapshots.map((s) => ({
      id: `s-${s.parseId || s.id}`,
      type: "snap" as const,
      data: s,
      date: s.sessionDate || new Date(s.timestamp).toISOString().split("T")[0],
      ts: s.timestamp,
    })),
  ];
  const t = (v: string) => new Date(v).getTime() || 0;
  return items.sort((a, b) => t(b.date) - t(a.date) || t(b.ts) - t(a.ts));
}

/** The line under an entry's date. Locked entries never show ciphertext. */
export function entryPreview(e: Entry): string {
  if (e.locked) return "Locked entry from the old app";
  return (e.text || "").substring(0, 60) + "...";
}
