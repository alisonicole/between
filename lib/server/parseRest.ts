import "server-only";

/** Server-side Parse REST calls with the master key. Never import from client code. */
const SERVER = () => process.env.NEXT_PUBLIC_PARSE_SERVER_URL!.replace(/\/$/, "");

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const appId = process.env.NEXT_PUBLIC_PARSE_APP_ID;
  const master = process.env.PARSE_MASTER_KEY;
  if (!appId || !master) throw new Error("Server is missing Parse configuration");
  return {
    "X-Parse-Application-Id": appId,
    "X-Parse-Master-Key": master,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function parseRest<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown; sessionToken?: string } = {},
): Promise<T> {
  const res = await fetch(`${SERVER()}${path}`, {
    method: init.method ?? "GET",
    headers: headers(init.sessionToken ? { "X-Parse-Session-Token": init.sessionToken } : {}),
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string }).error || `Parse ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data as T;
}

export interface RestUser {
  objectId: string;
  username?: string;
  email?: string;
  aiPatterns?: boolean;
  googleSub?: string;
  authData?: { google?: { id?: string } };
}

export function whereQuery(where: object, extra = ""): string {
  return `?where=${encodeURIComponent(JSON.stringify(where))}${extra}`;
}

/** Resolves a session token to its user, or null if it is invalid. */
export async function userFromSession(sessionToken: string | null): Promise<RestUser | null> {
  if (!sessionToken) return null;
  try {
    return await parseRest<RestUser>("/users/me", { sessionToken });
  } catch {
    return null;
  }
}

export function ownerOnlyACL(userId: string) {
  return { [userId]: { read: true, write: true } };
}

export function userPointer(userId: string) {
  return { __type: "Pointer", className: "_User", objectId: userId };
}
