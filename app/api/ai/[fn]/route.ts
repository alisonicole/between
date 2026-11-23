import { NextRequest, NextResponse } from "next/server";
import { parseRest, userFromSession, userPointer, whereQuery } from "@/lib/server/parseRest";
import { AI_FUNCTIONS, type AIFunction } from "@/lib/aiFunctions";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs one of Between's Back4App AI functions for the signed-in user, but only
 * if they turned AI on. The function runs as that user (their session), exactly
 * as my-mvp called it, so prompts and behavior are unchanged.
 */
export async function POST(req: NextRequest, { params }: { params: { fn: string } }) {
  const fn = params.fn as AIFunction;
  if (!AI_FUNCTIONS.includes(fn)) return NextResponse.json({ error: "Unknown AI feature." }, { status: 404 });

  const token = req.headers.get("x-parse-session-token");
  const user = await userFromSession(token);
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  // Opt-in is checked here on the server, not just hidden in the app.
  const state = await parseRest<{ results: { aiEnabled?: boolean }[] }>(
    "/classes/UserState" + whereQuery({ user: userPointer(user.objectId) }, "&limit=1&keys=aiEnabled"),
  ).catch(() => ({ results: [] }));
  if (!state.results[0]?.aiEnabled) return NextResponse.json({ error: "AI is turned off." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const server = process.env.NEXT_PUBLIC_PARSE_SERVER_URL!.replace(/\/$/, "");
  const res = await fetch(`${server}/functions/${fn}`, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    // Same envelope the Parse JS SDK sends from the browser.
    body: JSON.stringify({
      ...body,
      _ApplicationId: process.env.NEXT_PUBLIC_PARSE_APP_ID,
      _JavaScriptKey: process.env.NEXT_PUBLIC_PARSE_JS_KEY,
      _SessionToken: token,
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`AI function ${fn} failed`, res.status, data);
    return NextResponse.json({ error: "The AI couldn't finish just now. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ result: data.result });
}
