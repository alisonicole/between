/** Today's date in the user's own time zone, as YYYY-MM-DD.
 *  (1.0 used toISOString(), which flips to tomorrow in the evening in the US.) */
export function getToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "Nov 22, 2026" — same format as 1.0. */
export function formatDate(d: string): string {
  if (!d) return "";
  return new Date(d + "T12:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
