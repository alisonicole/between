"use client";

import Parse from "./parse";
import type { AIFunction } from "./aiFunctions";

/** Calls a Between AI function through the server, which checks sign-in and the AI opt-in. */
export async function callAI<T = any>(fn: AIFunction, params: Record<string, unknown>): Promise<T> {
  const token = Parse.User.current()?.getSessionToken();
  const res = await fetch(`/api/ai/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-parse-session-token": token ?? "" },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data.result as T;
}
