import { NextRequest, NextResponse } from "next/server";
import { verifyGoogleIdToken } from "@/lib/server/google";
import { parseRest, whereQuery, type RestUser } from "@/lib/server/parseRest";
import { decideLookup } from "@/lib/accountLookup";

export const dynamic = "force-dynamic";

/**
 * After Google sign-in, tells the browser whether to sign straight in or to
 * unlock an existing email/password account first. Returns no user data
 * beyond the caller's own username and a masked email.
 */
export async function POST(req: NextRequest) {
  const { credential } = (await req.json().catch(() => ({}))) as { credential?: string };
  if (!credential) return NextResponse.json({ error: "Missing credential" }, { status: 400 });

  let identity;
  try {
    identity = await verifyGoogleIdToken(credential);
  } catch {
    return NextResponse.json({ error: "Google sign-in could not be verified" }, { status: 401 });
  }

  try {
    const keys = "&keys=username,email,googleSub,authData&limit=5";
    const bySub = await parseRest<{ results: RestUser[] }>(
      "/users" + whereQuery({ googleSub: identity.sub }, keys),
    );
    const byEmail = await parseRest<{ results: RestUser[] }>(
      "/users" +
        whereQuery(
          { $or: [{ email: identity.email }, { username: identity.email }, { username: { $regex: `^${escapeRegex(identity.email)}$`, $options: "i" } }] },
          keys,
        ),
    );
    return NextResponse.json(decideLookup(identity.sub, identity.email, bySub.results, byEmail.results));
  } catch (e) {
    console.error("account lookup failed", e);
    return NextResponse.json({ error: "We couldn't reach your account. Please try again." }, { status: 502 });
  }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
