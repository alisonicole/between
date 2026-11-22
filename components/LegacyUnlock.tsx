"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { LinkedButNotMigrated, linkLegacyAccount, signInWithGoogle, type MigrationReport } from "@/lib/auth";

/** One-time step that links Google to an existing email/password account. */
export function LegacyUnlock({
  credential, username, maskedEmail, onDone, onCancel,
}: {
  credential: string;
  username: string;
  maskedEmail: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<MigrationReport | null>(null);
  const [confirmFresh, setConfirmFresh] = useState(false);
  const [linkedOnly, setLinkedOnly] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      setReport(await linkLegacyAccount(credential, username, password));
    } catch (err) {
      if (err instanceof LinkedButNotMigrated) setLinkedOnly(true);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
      setPassword("");
    }
  }

  if (linkedOnly) {
    return (
      <div className="stack-sm">
        <div className="error-banner">{error}</div>
        <button className="btn shadow" onClick={onDone}>Continue</button>
      </div>
    );
  }

  async function startFresh() {
    setBusy(true);
    try {
      await signInWithGoogle(credential, { setEmail: false });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  }

  if (report) {
    const { entries, snapshots, countsMatch } = report;
    const locked = entries.stillLocked + snapshots.stillLocked;
    return (
      <div className="stack-sm">
        <h2 className="card-title" style={{ marginBottom: 0 }}>You're all set</h2>
        <p className="body">
          Brought over {entries.total} journal {entries.total === 1 ? "entry" : "entries"} and {snapshots.total} session{" "}
          {snapshots.total === 1 ? "snapshot" : "snapshots"}. From now on, just sign in with Google.
        </p>
        {locked > 0 && (
          <p className="muted">
            {locked} {locked === 1 ? "item was" : "items were"} saved with an older password and stay locked. You can unlock them later from the Archive.
          </p>
        )}
        {!countsMatch && (
          <div className="error-banner">The number of items changed while copying. Nothing was deleted, but please check your Archive.</div>
        )}
        <button className="btn shadow" onClick={onDone}>Continue</button>
      </div>
    );
  }

  return (
    <form className="stack-sm" onSubmit={unlock}>
      <h2 className="card-title" style={{ marginBottom: 0 }}>Welcome back</h2>
      <p className="body">
        We found your Between account for {maskedEmail}. Enter your Between password once to bring your entries and
        session snapshots with you. You won't need it again.
      </p>
      <div>
        <label className="label" htmlFor="legacy-pw">Between password</label>
        <input
          id="legacy-pw" className="input" type="password" value={password} required autoFocus
          autoComplete="current-password" onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && <div className="error-banner">{error}</div>}
      <button className="btn shadow" type="submit" disabled={busy || !password}>
        {busy && <Loader2 size={20} className="animate-spin" />}
        {busy ? "Bringing your entries over..." : "Bring my entries"}
      </button>

      {confirmFresh ? (
        <div className="info-banner" style={{ display: "block" }}>
          <p style={{ marginBottom: 8 }}>
            Your old entries were locked with your password, so without it they can't be opened. Start a new, empty
            Between with this Google account?
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-small" onClick={startFresh} disabled={busy}>Start fresh</button>
            <button type="button" className="btn-ghost" onClick={() => setConfirmFresh(false)}>Go back</button>
          </div>
        </div>
      ) : (
        <p className="small-note" style={{ textAlign: "center" }}>
          Forgot it?{" "}
          <button type="button" className="link-btn underline" onClick={() => setConfirmFresh(true)}>Start fresh instead</button>
          {" · "}
          <button type="button" className="link-btn underline" onClick={onCancel}>Use a different Google account</button>
        </p>
      )}
    </form>
  );
}
