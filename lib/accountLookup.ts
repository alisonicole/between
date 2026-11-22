/** Decides what happens after a Google sign-in. Pure, so it is unit-tested. */

export type LookupState =
  | { state: "ready" } // sign in with Google (existing linked user, or a new one)
  | { state: "legacy"; username: string; maskedEmail: string } // old account to unlock once
  | { state: "conflict" }; // the email's account is linked to a different Google account

interface UserLike {
  username?: string;
  email?: string;
  googleSub?: string;
  authData?: { google?: { id?: string } };
}

export function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return `${name.slice(0, 1)}•••@${domain}`;
}

export function decideLookup(
  sub: string,
  email: string,
  bySub: UserLike[],
  byEmail: UserLike[],
): LookupState {
  if (bySub.length > 0) return { state: "ready" };
  const match = byEmail[0];
  if (!match) return { state: "ready" };
  const linked = match.authData?.google?.id;
  if (linked === sub) return { state: "ready" };
  if (linked) return { state: "conflict" };
  return { state: "legacy", username: match.username ?? email, maskedEmail: maskEmail(match.email ?? email) };
}
