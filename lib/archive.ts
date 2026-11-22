import type { Entry, Snapshot } from "./types";

export const STARTER_PREFIX = "I think what I'd like to talk about today is";

export type ArchiveItem =
  | { id: string; type: "entry"; data: Entry; date: string; ts: string }
  | { id: string; type: "snap"; data: Snapshot; date: string; ts: string };

/** One list of entries and snapshots, newest first (same order as 1.0). */
export function combineArchive(entries: Entry[], snapshots: Snapshot[]): ArchiveItem[] {
  const items: ArchiveItem[] = [
    ...entries.map((e) => ({
      id: `e-${e.parseId || e.id}`,
      type: "entry" as const,
      data: e,
      date: e.date,
      ts: e.timestamp,
    })),
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

/** The one-line preview under the date in an Archive row. */
export function archivePreview(item: ArchiveItem): string {
  if (item.data.locked) return "Locked entry from the old app";
  if (item.type === "entry") {
    return item.data.title || (item.data.text || "").substring(0, 60) + "...";
  }
  const s = item.data;
  const starter = (s.openingStatement || "")
    .replace(new RegExp(`^${STARTER_PREFIX}\\s*`, "i"), "")
    .replace(/\.$/, "");
  return starter || s.intention || s.prepNote || "";
}
