"use client";

import Parse from "./parse";

/** Asks the server to generate and save Patterns or a new Session Starter. */
export async function requestAI(mode: "patterns" | "starter", sessionDate?: string): Promise<void> {
  const token = Parse.User.current()?.getSessionToken();
  const res = await fetch("/api/patterns", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-parse-session-token": token ?? "" },
    body: JSON.stringify({ mode, sessionDate }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
}
