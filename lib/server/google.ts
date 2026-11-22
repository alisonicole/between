import "server-only";
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export interface GoogleIdentity {
  sub: string;
  email: string;
  name?: string;
}

/** Verifies a Google ID token's signature, audience, issuer, and email. */
export async function verifyGoogleIdToken(token: string): Promise<GoogleIdentity> {
  const { payload } = await jwtVerify(token, JWKS, {
    audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });
  if (!payload.sub || typeof payload.email !== "string" || payload.email_verified !== true) {
    throw new Error("Google account email is not verified");
  }
  return { sub: payload.sub, email: payload.email.toLowerCase(), name: payload.name as string | undefined };
}
