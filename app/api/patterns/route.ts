import { NextRequest, NextResponse } from "next/server";
import {
  ownerOnlyACL,
  parseRest,
  userFromSession,
  userPointer,
  whereQuery,
} from "@/lib/server/parseRest";
import { isEncrypted } from "@/lib/legacyCrypto";
import {
  buildPatternsPrompt,
  buildStarterPrompt,
  cleanStarter,
  MIN_ENTRIES,
  parsePatterns,
} from "@/lib/patterns";
import { getToday } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

async function callClaude(prompt: string, maxTokens: number): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const base = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com").replace(/\/$/, "");
  const res = await fetch(`${base}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL(), max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) {
    console.error("Anthropic error", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return data.content?.find((c) => c.type === "text")?.text?.trim() ?? null;
}

function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * Generates Patterns (mode "patterns") or a new Session Starter (mode
 * "starter") from the signed-in user's own journal entries, and saves the
 * result to their SessionPrep before returning it.
 */
export async function POST(req: NextRequest) {
  const user = await userFromSession(req.headers.get("x-parse-session-token"));
  if (!user) return fail("Please sign in again.", 401);
  if (!user.aiPatterns) return fail("AI Patterns is turned off.", 403);

  const { mode = "patterns", sessionDate } = (await req.json().catch(() => ({}))) as {
    mode?: "patterns" | "starter";
    sessionDate?: string;
  };

  // The caller's entries only: scoped by their verified user id, not by anything they send.
  const entries = await parseRest<{ results: { text?: string; isWelcomeEntry?: boolean }[] }>(
    "/classes/Entry" + whereQuery({ user: userPointer(user.objectId) }, "&order=-timestamp&limit=500&keys=text,isWelcomeEntry"),
  );
  const texts = entries.results
    .filter((e) => !e.isWelcomeEntry && typeof e.text === "string" && e.text.trim() && !isEncrypted(e.text))
    .map((e) => e.text as string);

  if (mode === "patterns" && texts.length < MIN_ENTRIES) return fail("Add at least 3 journal entries to see patterns.", 400);
  if (mode === "starter" && texts.length === 0) return fail("Add a journal entry first.", 400);

  let fields: Record<string, unknown>;
  try {
    if (mode === "starter") {
      const starter = cleanStarter(await callClaude(buildStarterPrompt(texts), 500));
      if (!starter) return fail("Couldn't refresh your Session Starter. Please try again.", 502);
      fields = { openingStatement: starter };
    } else {
      const patterns = parsePatterns(await callClaude(buildPatternsPrompt(texts), 1000));
      if (!patterns) return fail("Couldn't analyze your reflections. Please try again.", 502);
      fields = { ...patterns, placeholder: false, generatedAt: new Date().toISOString() };
      if (sessionDate) fields.sessionDate = sessionDate;
    }
  } catch (e) {
    console.error(e);
    return fail("AI Patterns isn't set up on the server yet.", 500);
  }

  // Save before responding, so a reload never loses what was generated.
  const existing = await parseRest<{ results: { objectId: string }[] }>(
    "/classes/SessionPrep" + whereQuery({ user: userPointer(user.objectId) }, "&order=-updatedAt&limit=1"),
  );
  const id = existing.results[0]?.objectId;
  if (id) {
    await parseRest(`/classes/SessionPrep/${id}`, { method: "PUT", body: fields });
  } else {
    await parseRest("/classes/SessionPrep", {
      method: "POST",
      body: {
        user: userPointer(user.objectId),
        ACL: ownerOnlyACL(user.objectId),
        sessionDate: getToday(),
        notes: "",
        nextSteps: "",
        themes: [], avoiding: [], questions: [], openingStatement: "",
        ...fields,
      },
    });
  }

  return NextResponse.json({ ok: true, sentEntries: texts.length });
}
