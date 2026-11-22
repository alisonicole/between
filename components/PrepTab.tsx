"use client";

import { Calendar, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { formatDate } from "@/lib/dates";
import { MIN_ENTRIES } from "@/lib/patterns";
import type { SessionPrep, Snapshot } from "@/lib/types";

interface Props {
  lastSnapshot: Snapshot | null;
  prep: SessionPrep | null;
  analyzing: boolean;
  aiOn: boolean;
  usableCount: number;
  onGenerate: () => void;
  onTurnOnAI: () => void;
  onTurnOffAI: () => void;
  onStartWithoutAI: () => void;
}

export function PrepTab(p: Props) {
  const { prep, analyzing, aiOn, usableCount } = p;
  const needsConsent = !aiOn && usableCount >= MIN_ENTRIES && (!prep || prep.placeholder);
  const hasPatterns = prep && !needsConsent;

  return (
    <div className="stack">
      <LastSession snap={p.lastSnapshot} />

      {analyzing ? (
        <div className="card center">
          <Loader2 size={48} color="#9333ea" className="animate-spin big-icon" />
          <p style={{ color: "var(--secondary)", fontSize: 16 }}>Analyzing your reflections...</p>
        </div>
      ) : needsConsent ? (
        <ConsentCard count={usableCount} onTurnOn={p.onTurnOnAI} onWithoutAI={p.onStartWithoutAI} />
      ) : !hasPatterns ? (
        <div className="card center">
          <Sparkles size={48} color="#c4b5fd" className="big-icon" />
          <button className="btn inline" onClick={p.onGenerate}>
            <Calendar size={20} />
            Prep for your next session
          </button>
          {usableCount < MIN_ENTRIES && (
            <p className="muted" style={{ marginTop: 16 }}>
              Add at least 3 journal entries to see patterns ({usableCount}/3)
            </p>
          )}
        </div>
      ) : (
        <>
          {(aiOn || usableCount < MIN_ENTRIES) && (
            <button className="btn shadow" onClick={p.onGenerate}>
              <RefreshCw size={20} />
              Refresh Analysis
            </button>
          )}
          <div className="card">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 16 }}>
              <Sparkles size={20} color="#7c3aed" style={{ marginTop: 4 }} />
              <h3 className="card-title" style={{ margin: 0 }}>Patterns</h3>
            </div>
            <div className="stack">
              {([
                ["What's trying to come up", prep!.themes],
                ["Things I might be avoiding", prep!.avoiding],
                ["Questions and confusions", prep!.questions],
              ] as const).map(([title, items]) => (
                <div key={title}>
                  <h4 style={{ fontWeight: 600, color: "var(--heading)", marginBottom: 12 }}>{title}</h4>
                  {items.length ? (
                    <ul className="bullets">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
                  ) : (
                    <p className="muted">—</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {aiOn && !analyzing && (
        <p className="small-note" style={{ textAlign: "center" }}>
          AI Patterns is on. Your journal entries are sent to Anthropic&apos;s Claude when you prep.{" "}
          <button className="link-btn underline" onClick={p.onTurnOffAI}>Turn off</button>
        </p>
      )}
    </div>
  );
}

function LastSession({ snap }: { snap: Snapshot | null }) {
  return (
    <div className="card">
      <h3 className="card-title">Last session</h3>
      {!snap ? (
        <p style={{ color: "var(--secondary)" }}>Archive your first session snapshot to get a recap of your last session</p>
      ) : snap.locked ? (
        <p style={{ color: "var(--secondary)" }}>
          Your last session is locked from the old app. Unlock it from the Archive to see the recap.
        </p>
      ) : (
        <div className="stack-sm">
          <div style={{ color: "var(--secondary)", fontSize: 14 }}>
            <span style={{ fontWeight: 600, color: "var(--heading)" }}>Session Date: </span>
            {formatDate(snap.sessionDate)}
          </div>
          <div>
            <h4 className="h4">What you talked about</h4>
            <p className="body">{snap.notes || "—"}</p>
          </div>
          <div>
            <h4 className="h4">Next steps</h4>
            <p className="body">{snap.nextSteps || "—"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ConsentCard({ count, onTurnOn, onWithoutAI }: { count: number; onTurnOn: () => void; onWithoutAI: () => void }) {
  return (
    <div className="card center">
      <Sparkles size={48} color="#c4b5fd" className="big-icon" />
      <h3 className="card-title">Turn on AI Patterns?</h3>
      <p className="body" style={{ maxWidth: 520, margin: "0 auto 24px", textAlign: "left" }}>
        Patterns reads your journal entries and suggests what&apos;s trying to come up, what you might be avoiding,
        questions to explore, and a Session Starter. To do that, the text of your {count} journal entries is sent to
        Anthropic&apos;s Claude each time you prep or refresh. Nothing is sent until you turn this on, and you can turn
        it off any time.
      </p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn inline" onClick={onTurnOn}>
          <Sparkles size={20} />
          Turn on and prep
        </button>
        <button className="btn-ghost" style={{ flex: "0 0 auto", padding: "16px 24px", fontSize: 16 }} onClick={onWithoutAI}>
          Continue without AI
        </button>
      </div>
    </div>
  );
}
