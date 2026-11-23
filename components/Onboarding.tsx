"use client";

/** my-mvp's 3-step onboarding, unchanged in wording and look. */
import React, { useEffect, useState } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMES = ["7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM"];
const grad = "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)";
const big = (on: boolean): React.CSSProperties => ({ width: "100%", padding: "14px", background: on ? grad : "#d1d5db", color: "white", border: "none", borderRadius: "14px", fontSize: "16px", fontWeight: 600, cursor: on ? "pointer" : "not-allowed", boxShadow: on ? "0 4px 16px rgba(147,51,234,0.35)" : "none", marginBottom: "10px" });
const skip: React.CSSProperties = { width: "100%", padding: "10px", background: "transparent", color: "#9ca3af", border: "none", fontSize: "14px", cursor: "pointer" };
const title: React.CSSProperties = { fontSize: "24px", fontWeight: 400, color: "#581c87", margin: "0 0 8px 0", fontFamily: "var(--font-serif)" };

export function Onboarding({ startStep = 1, days0, time0, hasEntries, onSaveSchedule, onFinish }: {
  startStep?: number;
  days0: string[];
  time0: string;
  hasEntries: boolean;
  onSaveSchedule: (days: string[], time: string) => Promise<void> | void;
  onFinish: (firstEntry: string) => Promise<void> | void;
}) {
  const [step, setStep] = useState(startStep);
  const [days, setDays] = useState<string[]>(days0);
  const [time, setTime] = useState(time0);
  const [entry, setEntry] = useState("");

  // Step 3 is skipped for people who already write (as in my-mvp).
  useEffect(() => {
    if (step === 3 && hasEntries) onFinish("");
  }, [step, hasEntries, onFinish]);

  let content: React.ReactNode = null;
  if (step === 1) {
    content = (
      <div>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>👋</div>
          <h2 style={{ ...title, fontSize: "26px", marginBottom: "10px" }}>Welcome to between</h2>
          <p style={{ fontSize: "16px", color: "#7c3aed", margin: 0, lineHeight: 1.6 }}>A private space to process what comes up between sessions.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
          {[
            { icon: "📝", t: "Write between sessions", d: "Capture thoughts, feelings, and moments as they arise — not just before your appointment." },
            { icon: "✨", t: "Discover patterns", d: "After a few entries, AI surfaces themes and what you might be avoiding." },
            { icon: "💬", t: "Prep for Session", d: "Get a suggested opening statement and key topics to bring into the room." },
          ].map(({ icon, t, d }) => (
            <div key={t} style={{ display: "flex", gap: "14px", alignItems: "flex-start", background: "rgba(147,51,234,0.05)", border: "1px solid rgba(147,51,234,0.12)", borderRadius: "14px", padding: "16px" }}>
              <div style={{ fontSize: "24px", flexShrink: 0, lineHeight: 1 }}>{icon}</div>
              <div>
                <div style={{ fontWeight: 600, color: "#581c87", fontSize: "15px", marginBottom: "4px" }}>{t}</div>
                <div style={{ fontSize: "14px", color: "#7c3aed", lineHeight: 1.5 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setStep(2)} style={big(true)}>Get Started →</button>
      </div>
    );
  } else if (step === 2) {
    content = (
      <div>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>🗓️</div>
          <h2 style={title}>When is your session?</h2>
          <p style={{ fontSize: "14px", color: "#7c3aed", margin: 0, lineHeight: 1.5 }}>We&apos;ll personalize your home screen based on where you are in the week.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "28px" }}>
          <div>
            <label style={{ display: "block", color: "#7c3aed", marginBottom: "8px", fontWeight: 500, fontSize: "14px" }}>
              Day(s) of the week <span style={{ color: "#9ca3af", fontWeight: 400 }}>(select all that apply)</span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {DAYS.map((d) => {
                const on = days.includes(d);
                return (
                  <button key={d} aria-pressed={on} onClick={() => setDays((p) => (on ? p.filter((x) => x !== d) : [...p, d]))}
                    style={{ padding: "8px 16px", borderRadius: "20px", border: "2px solid", borderColor: on ? "#9333ea" : "#e9d5ff", background: on ? "#9333ea" : "white", color: on ? "white" : "#7c3aed", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}>
                    {d.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label htmlFor="ob-time" style={{ display: "block", color: "#7c3aed", marginBottom: "8px", fontWeight: 500, fontSize: "14px" }}>
              Approximate time <span style={{ color: "#9ca3af", fontWeight: 400 }}>(optional)</span>
            </label>
            <select id="ob-time" value={time} onChange={(e) => setTime(e.target.value)} style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "2px solid #e9d5ff", outline: "none", fontSize: "16px", background: "white", color: "#581c87", cursor: "pointer" }}>
              <option value="">Select a time...</option>
              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <button disabled={!days.length} style={big(days.length > 0)} onClick={async () => { if (days.length) await onSaveSchedule(days, time); setStep(3); }}>Continue →</button>
        <button style={skip} onClick={() => setStep(3)}>Skip for now</button>
      </div>
    );
  } else if (!hasEntries) {
    content = (
      <div>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div style={{ fontSize: "36px", marginBottom: "10px" }}>✏️</div>
          <h2 style={title}>Capture your first thought</h2>
          <p style={{ fontSize: "14px", color: "#7c3aed", margin: 0, lineHeight: 1.5 }}>What came up today? There&apos;s no right or wrong way to start.</p>
        </div>
        <textarea value={entry} onChange={(e) => setEntry(e.target.value)} placeholder="I've been thinking about..." autoFocus
          style={{ width: "100%", padding: "14px 16px", borderRadius: "14px", border: "2px solid #e9d5ff", outline: "none", fontSize: "16px", resize: "none", background: "rgba(255,255,255,0.9)", color: "#581c87", height: "180px", marginBottom: "16px", lineHeight: 1.6 }} />
        <button disabled={!entry.trim()} style={big(Boolean(entry.trim()))} onClick={() => onFinish(entry)}>Save &amp; Start Journaling</button>
        <button style={skip} onClick={() => onFinish("")}>Skip for now</button>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#f3e8ff", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", zIndex: 10000, overflowY: "auto" }}>
      <div style={{ background: "rgba(255,255,255,0.95)", borderRadius: "24px", padding: "40px", maxWidth: "480px", width: "100%", boxShadow: "0 10px 40px rgba(0,0,0,0.12)", position: "relative" }}>
        <div style={{ display: "flex", gap: "6px", justifyContent: "center", marginBottom: "28px" }}>
          {[1, 2, 3].map((s) => <div key={s} style={{ width: s === step ? "24px" : "8px", height: "8px", borderRadius: "4px", background: s <= step ? "#9333ea" : "#e9d5ff", transition: "all 0.3s" }} />)}
        </div>
        {content}
      </div>
    </div>
  );
}
