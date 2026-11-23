"use client";

import { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Loader2 } from "lucide-react";
import { lookupGoogleAccount, signInWithGoogle } from "@/lib/auth";
import type { LookupState } from "@/lib/accountLookup";
import { LegacyUnlock } from "./LegacyUnlock";
import { Logo } from "./Logo";

export function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [legacy, setLegacy] = useState<{ credential: string; state: Extract<LookupState, { state: "legacy" }> } | null>(null);

  async function handleCredential(credential?: string) {
    if (!credential) return;
    setError("");
    setBusy(true);
    try {
      const result = await lookupGoogleAccount(credential);
      if (result.state === "legacy") {
        setLegacy({ credential, state: result });
        return;
      }
      if (result.state === "conflict") {
        setError("This email's Between account is already linked to a different Google account. Sign in with that one.");
        return;
      }
      await signInWithGoogle(credential);
      onSignedIn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-wrap">
        <div className="card">
          <div className="auth-head">
            <Logo />
            <p className="tagline">Capture what comes up between sessions and bring it into the room</p>
          </div>
          {legacy ? (
            <LegacyUnlock
              credential={legacy.credential}
              username={legacy.state.username}
              maskedEmail={legacy.state.maskedEmail}
              onDone={onSignedIn}
              onCancel={() => setLegacy(null)}
            />
          ) : (
            <div className="stack-sm" style={{ alignItems: "center" }}>
              <p className="muted" style={{ textAlign: "center" }}>Sign in with Google to continue.</p>
              <div className="google-wrap">
                {busy ? (
                  <Loader2 size={28} className="animate-spin" color="#9333ea" />
                ) : (
                  <GoogleLogin
                    onSuccess={(r) => handleCredential(r.credential)}
                    onError={() => setError("Google sign-in failed. Please try again.")}
                    shape="pill"
                    text="continue_with"
                    size="large"
                  />
                )}
              </div>
              {error && <div className="error-banner" style={{ width: "100%" }}>{error}</div>}
              <p className="small-note" style={{ textAlign: "center" }}>
                Used Between before? Sign in with the Google account for the same email and your entries come with you.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
