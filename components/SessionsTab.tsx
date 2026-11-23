"use client";

import React, { useEffect, useRef, useState } from "react";
import { Archive, ArrowRight, Bookmark, Calendar, ChevronDown, ChevronRight, ChevronUp, Edit2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { patternCards, patternsRefreshState, realEntries, realHistory, recurringThemes } from "@/lib/between";
import { pastAppts, summarizeSince, upcomingAppts, MOODS, type Appointment } from "@/lib/garden";
import type { Bookmark as BookmarkT, Entry, SessionDraft, Snapshot } from "@/lib/types";
import type { UserState } from "@/lib/userState";
import VoiceInput from "./VoiceInput";
import { AppointmentFields } from "./GreenhouseTab";
import { LockNote, S, fmtShortDate, fmtTime, formatDate } from "./ui";

export type SessionView = "prep" | "after" | "progress" | "care";

export interface SessionsApi {
  us: UserState;
  today: string;
  entries: Entry[];
  history: Snapshot[];
  analysisLoading: boolean;
  patternsLoading: boolean;
  patternsError: string | null;
  summaryLoading: boolean;
  genAnalysis: () => void;
  loadPatterns: () => void;
  save: (patch: Partial<UserState>) => Promise<void>;
  logSession: () => Promise<void>;
  openSnapshot: (s: Snapshot) => void;
  openBookmark: (b: BookmarkT) => void;
  turnOnAI: () => void;
}

export function SessionsTab({ view, setView, api }: { view: SessionView; setView: (v: SessionView) => void; api: SessionsApi }) {
  return (
    <>
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px 24px 12px", width: "100%" }}>
        <div style={{ display: "flex", gap: "6px" }} role="tablist">
          {([["prep", "Before"], ["after", "After"], ["progress", "Progress"], ["care", "Care"]] as const).map(([v, label]) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
              style={{ flex: 1, padding: "10px 8px", borderRadius: "14px", fontWeight: 600, fontSize: "13px", border: "none", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s", background: view === v ? "#9333ea" : "rgba(255,255,255,0.6)", color: view === v ? "white" : "#7c3aed", boxShadow: view === v ? "0 4px 12px rgba(147,51,234,0.3)" : "none" }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {view === "prep" && <Before api={api} goAfter={() => setView("after")} />}
      {view === "after" && <After api={api} />}
      {view === "progress" && <Progress api={api} />}
      {view === "care" && <Care api={api} />}
    </>
  );
}

// ---- Before ----------------------------------------------------------------

function Before({ api, goAfter }: { api: SessionsApi; goAfter: () => void }) {
  const { us } = api;
  const realHist = realHistory(api.history);
  const last = realHist[0] ?? api.history[0] ?? null;
  const [recallOpen, setRecallOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const analysis = us.lastAnalysis;
  const real = realEntries(api.entries);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {last && (
        <div style={{ background: "rgba(255,255,255,0.7)", backdropFilter: "blur(10px)", border: "1px solid #e9d5ff", borderRadius: "20px", overflow: "hidden" }}>
          <button onClick={() => setRecallOpen((o) => !o)} aria-expanded={recallOpen} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Archive size={18} style={{ color: "#9333ea" }} />
              <span style={{ fontSize: "16px", fontWeight: 500, color: "#581c87" }}>Recall Your Last Session</span>
            </div>
            <ChevronDown size={18} style={{ color: "#9333ea", transition: "transform 0.2s", transform: recallOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }} />
          </button>
          {recallOpen && (
            <div style={{ padding: "0 24px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {last.locked ? <p style={{ color: "#7c3aed", fontSize: "14px", margin: 0 }}>This session is locked from the old app. Unlock it from your Journal log.</p> : (
                <>
                  <div><div style={{ ...S.label, fontSize: "12px", letterSpacing: "0.5px", marginBottom: "6px" }}>Session Date</div><div style={{ fontSize: "15px", color: "#581c87" }}>{formatDate(last.sessionDate)}</div></div>
                  {last.notes && (
                    <div>
                      <div style={{ ...S.label, letterSpacing: "0.5px", marginBottom: "8px" }}>What You Covered</div>
                      {api.summaryLoading && !us.sessionNotesSummary[last.parseId] ? <div style={{ fontSize: "13px", color: "#9ca3af", fontStyle: "italic" }}>Summarizing…</div> : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                          {(us.sessionNotesSummary[last.parseId]?.bullets?.length ? us.sessionNotesSummary[last.parseId].bullets : last.notes.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 3)).map((l, i) => (
                            <li key={i} style={{ fontSize: "14px", color: "#581c87", lineHeight: 1.5, display: "flex", alignItems: "flex-start", gap: "8px" }}><span style={{ color: "#9333ea", fontWeight: 600, flexShrink: 0 }}>•</span>{l}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                  {last.nextSteps && <div><div style={{ ...S.label, letterSpacing: "0.5px", marginBottom: "6px" }}>Next Steps</div><p style={S.body}>{last.nextSteps}</p></div>}
                  {last.intention && <div><div style={{ ...S.label, letterSpacing: "0.5px", marginBottom: "6px" }}>Intention</div><p style={{ ...S.body, fontStyle: "italic" }}>{last.intention}</p></div>}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button onClick={() => api.openSnapshot(last)} style={{ padding: "8px 18px", background: "#9333ea", color: "white", border: "none", borderRadius: "20px", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>View Session Snapshot →</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {us.gardenOnboarded && <SinceLastSession api={api} since={last?.sessionDate ?? null} />}

      {!us.aiEnabled ? (
        <div style={S.bigCenter}>
          <Sparkles size={48} style={{ color: "#c4b5fd", margin: "0 auto 16px" }} />
          <h3 style={{ fontSize: "22px", fontWeight: 400, color: "#581c87", margin: "0 0 10px" }}>Turn on AI Patterns?</h3>
          <p style={{ fontSize: "14px", color: "#7c3aed", lineHeight: 1.6, maxWidth: "460px", margin: "0 auto 20px" }}>
            Patterns reads your recent journal entries and suggests themes, what you might be avoiding, and open questions. To do that, the text of your entries since your last session is sent to Anthropic&apos;s Claude through Between&apos;s server. Nothing is sent until you turn this on, and you can turn it off any time in You.
          </p>
          <button onClick={api.turnOnAI} style={S.bigButton}><Sparkles size={20} /> Turn on and prep</button>
        </div>
      ) : api.analysisLoading && !analysis ? (
        <div style={S.bigCenter}>
          <Loader2 size={48} style={{ color: "#9333ea", margin: "0 auto 16px" }} className="animate-spin" />
          <p style={{ color: "#7c3aed", fontSize: "16px", margin: 0 }}>Analyzing your reflections...</p>
        </div>
      ) : !analysis ? (
        <div style={S.bigCenter}>
          <Sparkles size={48} style={{ color: "#c4b5fd", margin: "0 auto 16px" }} />
          <button onClick={api.genAnalysis} style={S.bigButton}><Calendar size={20} /> Prep for your next session</button>
          {real.length < 3 && <p style={{ color: "#7c3aed", fontSize: "14px", marginTop: "16px" }}>Capture at least 3 thoughts to see patterns ({real.length}/3)</p>}
        </div>
      ) : null}

      {us.bookmarks.length > 0 && (
        <div style={{ ...S.prep, padding: "24px 28px" }}>
          <div style={{ ...S.label, marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}><Bookmark size={13} /> Bookmarked entries</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {us.bookmarks.map((b, i) => (
              <button key={b.parseId || i} onClick={() => api.openBookmark(b)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: "10px", border: "1px solid #e9d5ff", background: "rgba(147,51,234,0.04)", cursor: "pointer", textAlign: "left", width: "100%" }}>
                <span style={{ fontSize: "14px", color: "#581c87", fontWeight: 500 }}>{b.date ? new Date(b.date + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Journal"} — journal entry</span>
                <ChevronRight size={16} style={{ color: "#9333ea", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      <PrepNote api={api} />
      {analysis && <KeyTopics api={api} />}

      {us.aiEnabled && (
        <>
          <PatternsCard api={api} selected={selected} setSelected={setSelected} />
          <DeepDive api={api} />
        </>
      )}

      {analysis && !api.analysisLoading && realHist.length === 0 && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "14px 16px", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: "12px" }}>
          <span style={{ fontSize: "18px", flexShrink: 0 }}>💡</span>
          <div>
            <p style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#581c87", lineHeight: 1.5 }}>Save your patterns when you log a session snapshot to keep a record of your progress.</p>
            <button onClick={goAfter} style={{ padding: "7px 14px", borderRadius: "20px", border: "none", background: "#f59e0b", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>Log a Session Snapshot →</button>
          </div>
        </div>
      )}

      {selected.length > 0 && (
        <div style={{ position: "fixed", bottom: "68px", left: 0, right: 0, zIndex: 999, padding: "0 16px" }}>
          <div style={{ maxWidth: "600px", margin: "0 auto", background: "#581c87", borderRadius: "16px", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 4px 20px rgba(88,28,135,0.4)" }}>
            <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "14px" }}>{selected.length} {selected.length === 1 ? "topic" : "topics"} selected</span>
            <button onClick={() => { api.save({ keyTopics: [...us.keyTopics, ...selected.filter((t) => !us.keyTopics.includes(t))] }); setSelected([]); }} style={{ background: "#9333ea", color: "white", border: "none", borderRadius: "10px", padding: "8px 16px", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>Add to session topics</button>
          </div>
        </div>
      )}
    </div>
  );
}

function SinceLastSession({ api, since }: { api: SessionsApi; since: string | null }) {
  const s = summarizeSince(api.us, since, api.today);
  if (!s.checkins && !s.daysTended) return null;
  const moodLabel = (n: number) => MOODS.find(([m]) => m === Math.round(n))?.[1] ?? "";
  return (
    <div style={{ ...S.prep, padding: "24px 28px" }}>
      <div style={{ ...S.label, marginBottom: "12px" }}>🌱 {since ? "Since your last session" : "Your check-ins"}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: s.moods.length ? "14px" : 0 }}>
        {[
          [String(s.checkins), s.checkins === 1 ? "check-in" : "check-ins"],
          [s.averageMood !== null ? `${s.averageMood}` : "—", s.averageMood !== null ? `average mood (${moodLabel(s.averageMood)})` : "average mood"],
          [String(s.daysTended), s.daysTended === 1 ? "day tended" : "days tended"],
          [String(s.hardDays), s.hardDays === 1 ? "hard day" : "hard days"],
        ].map(([n, l]) => (
          <div key={l} style={{ flex: "1 1 110px", padding: "10px 12px", background: "rgba(237,233,254,0.5)", borderRadius: "10px", border: "1px solid rgba(147,51,234,0.1)" }}>
            <div style={{ fontSize: "20px", fontWeight: 500, color: "#581c87", fontFamily: "var(--font-serif)" }}>{n}</div>
            <div style={{ fontSize: "12px", color: "#7c3aed" }}>{l}</div>
          </div>
        ))}
      </div>
      {s.moods.length > 0 && (
        <div aria-label="Mood by day" style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "48px" }}>
          {s.moods.map((m, i) => (
            <div key={i} title={`${fmtShortDate(m.date)}: ${m.mood} (${moodLabel(m.mood)})`} style={{ flex: 1, maxWidth: "18px", height: `${m.mood * 20}%`, background: m.mood <= 2 ? "#f0abfc" : "#c4b5fd", borderRadius: "4px 4px 0 0" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function PrepNote({ api }: { api: SessionsApi }) {
  const [text, setText] = useState(api.us.sessionPrepNote);
  const [saved, setSaved] = useState(true);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaved(false);
    const t = setTimeout(() => { api.save({ sessionPrepNote: text }).then(() => setSaved(true)).catch(() => {}); }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <div style={S.prep}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <div style={S.label}>What I Want to Discuss</div>
        {text.trim() && <span style={{ fontSize: "11px", color: saved ? "#16a34a" : "#a78bfa", fontWeight: 500 }}>{saved ? "✓ Saved" : "Saving…"}</span>}
      </div>
      <p style={{ fontSize: "12px", color: "#a78bfa", margin: "0 0 14px 0" }}>In your own words — what feels most important to bring up?</p>
      <textarea aria-label="What I want to discuss" value={text} onChange={(e) => setText(e.target.value)}
        placeholder="e.g. I keep ending up in the same pattern and I want to understand why I can't just pursue what I actually want instead of seeking approval."
        style={{ ...S.input, fontSize: "15px", resize: "none", height: "140px", lineHeight: 1.6 }} />
    </div>
  );
}

function KeyTopics({ api }: { api: SessionsApi }) {
  const topics = api.us.keyTopics;
  const checked = api.us.draft.checkedTopics;
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState("");
  const [input, setInput] = useState("");
  const set = (t: string[]) => api.save({ keyTopics: t, draft: { ...api.us.draft, checkedTopics: checked.filter((c) => t.includes(c)) } });
  const add = () => { if (input.trim()) { set([...topics, input.trim()]); setInput(""); } };
  const move = (i: number, d: -1 | 1) => { const a = [...topics]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set(a); };
  return (
    <div style={S.prep}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
        <div style={S.label}>Key Topics to Cover</div>
        <button onClick={() => { if (editing) { set(temp.split("\n").map((s) => s.trim()).filter(Boolean)); setEditing(false); } else { setTemp(topics.join("\n")); setEditing(true); } }}
          style={{ background: "none", border: "none", color: "#9333ea", cursor: "pointer", fontSize: "12px", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px", padding: "2px 6px" }}>
          <Edit2 size={12} />{editing ? "Save" : "Edit"}
        </button>
      </div>
      <p style={{ fontSize: "12px", color: "#a78bfa", margin: "0 0 14px 0" }}>Add your own or bring up from patterns</p>
      {editing ? (
        <textarea value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="One topic per line" style={{ ...S.input, fontSize: "14px", padding: "10px 14px", resize: "none", height: "120px", background: "white" }} />
      ) : topics.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column" }}>
          {topics.map((t, i) => {
            const on = checked.includes(t);
            return (
              <li key={`${t}-${i}`} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 0", borderBottom: i < topics.length - 1 ? "1px solid #f3e8ff" : "none" }}>
                <input type="checkbox" id={`topic-${i}`} checked={on} onChange={() => api.save({ draft: { ...api.us.draft, checkedTopics: on ? checked.filter((c) => c !== t) : [...checked, t] } })} style={{ width: "18px", height: "18px", accentColor: "#9333ea", flexShrink: 0, cursor: "pointer" }} />
                <label htmlFor={`topic-${i}`} style={{ fontSize: "15px", color: on ? "#9ca3af" : "#581c87", cursor: "pointer", lineHeight: 1.5, textDecoration: on ? "line-through" : "none", flex: 1 }}>{t}</label>
                <div style={{ display: "flex", flexDirection: "column", flexShrink: 0 }}>
                  <button aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", padding: "1px 2px", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#e5e7eb" : "#9ca3af", lineHeight: 1 }}><ChevronUp size={13} /></button>
                  <button aria-label="Move down" onClick={() => move(i, 1)} disabled={i === topics.length - 1} style={{ background: "none", border: "none", padding: "1px 2px", cursor: i === topics.length - 1 ? "default" : "pointer", color: i === topics.length - 1 ? "#e5e7eb" : "#9ca3af", lineHeight: 1 }}><ChevronDown size={13} /></button>
                </div>
                <button aria-label="Remove topic" onClick={() => set(topics.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "14px", padding: "0 2px", flexShrink: 0 }}>×</button>
              </li>
            );
          })}
        </ul>
      ) : <p style={{ fontSize: "13px", color: "#9ca3af", margin: "0 0 8px 0" }}>No topics yet — add one below or move from Patterns.</p>}
      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="+ Add a topic..."
          style={{ flex: 1, padding: "8px 12px", borderRadius: "10px", border: "1px dashed #c084fc", outline: "none", fontSize: "14px", background: "rgba(255,255,255,0.8)", color: "#581c87" }} />
        <button onClick={add} style={{ padding: "8px 14px", borderRadius: "10px", border: "none", background: "#9333ea", color: "white", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>Add</button>
      </div>
    </div>
  );
}

function PatternsCard({ api, selected, setSelected }: { api: SessionsApi; selected: string[]; setSelected: (f: (s: string[]) => string[]) => void }) {
  const { themes, cards } = patternCards(api.us.patternsData);
  const refresh = patternsRefreshState(api.entries, api.history, api.us.patternsLastEntryId);
  const disabled = api.patternsLoading || refresh.disabled;
  const toggle = (k: string) => setSelected((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  return (
    <div style={{ ...S.glass, padding: 0 }}>
      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={20} style={{ color: "#9333ea" }} />
          <h3 style={{ fontSize: "18px", fontWeight: 500, color: "#581c87", margin: 0, flex: 1 }}>Patterns</h3>
          <button onClick={api.loadPatterns} disabled={disabled} title={api.patternsLoading ? "" : refresh.title}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "20px", border: "none", background: "#9333ea", color: "white", fontSize: "13px", fontWeight: 500, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1 }}>
            <RefreshCw size={13} className={api.patternsLoading ? "animate-spin" : ""} />{api.patternsLoading ? "Analyzing…" : "Refresh"}
          </button>
        </div>
        {api.patternsLoading && <div style={{ textAlign: "center", padding: "24px 0", color: "#a78bfa", fontSize: "14px" }}>Analyzing your entries…</div>}
        {api.patternsError && <div style={{ fontSize: "12px", color: "#9ca3af", padding: "8px 12px", background: "#f9fafb", borderRadius: "8px", border: "1px solid #e5e7eb" }}>{api.patternsError}</div>}
        {!api.patternsLoading && !api.us.patternsData && <div style={{ textAlign: "center", padding: "16px 0" }}><p style={{ color: "#9ca3af", fontSize: "14px", margin: "0 0 12px 0" }}>Hit Refresh to analyze your recent entries.</p></div>}
        {!api.patternsLoading && api.us.patternsData && (
          <>
            {themes.length > 0 && (
              <div>
                <div style={S.faintLabel}>What you wrote about</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {themes.map((t, i) => {
                    const key = t.name || "";
                    const on = selected.includes(key);
                    return (
                      <div key={i} role="button" tabIndex={0} aria-pressed={on} onClick={() => toggle(key)} onKeyDown={(e) => e.key === "Enter" && toggle(key)}
                        style={{ display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px", paddingLeft: on ? "9px" : "12px", background: on ? "rgba(187,247,208,0.55)" : "rgba(237,233,254,0.5)", borderRadius: "10px", border: "1px solid rgba(147,51,234,0.1)", borderLeft: on ? "4px solid #16a34a" : "1px solid rgba(147,51,234,0.1)", cursor: "pointer", userSelect: "none" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: t.exampleWords?.length ? "4px" : 0 }}>
                            <span style={{ fontSize: "15px", color: "#581c87", fontWeight: 500, lineHeight: 1.4 }}>{t.name}</span>
                            {t.mentionCount && <span style={{ fontSize: "12px", color: "#9333ea", fontWeight: 600, background: "rgba(147,51,234,0.1)", padding: "1px 8px", borderRadius: "20px", flexShrink: 0 }}>{t.mentionCount}×</span>}
                          </div>
                          {t.exampleWords?.length ? <div style={{ fontSize: "12px", color: "#a78bfa" }}>{t.exampleWords.join(", ")}</div> : null}
                        </div>
                        {on && <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#16a34a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, flexShrink: 0, marginTop: "2px" }}>✓</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {cards.length > 0 && (
              <div>
                <div style={S.faintLabel}>Patterns worth exploring</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {cards.map((c, i) => {
                    const on = selected.includes(c.key);
                    return (
                      <div key={i} role="button" tabIndex={0} aria-pressed={on} onClick={() => toggle(c.key)} onKeyDown={(e) => e.key === "Enter" && toggle(c.key)}
                        style={{ padding: "14px 16px", paddingLeft: on ? "11px" : "16px", borderRadius: "12px", background: on ? "rgba(187,247,208,0.55)" : "rgba(216,180,254,0.15)", border: "1px solid rgba(147,51,234,0.12)", borderLeft: on ? "4px solid #16a34a" : "1px solid rgba(147,51,234,0.12)", display: "flex", flexDirection: "column", gap: "10px", cursor: "pointer", userSelect: "none" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: on ? "#15803d" : "#7c3aed", textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
                          {on && <div style={{ width: "18px", height: "18px", borderRadius: "50%", background: "#16a34a", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700 }}>✓</div>}
                        </div>
                        {c.description && <p style={{ fontSize: "14px", color: "#581c87", margin: 0, lineHeight: 1.5 }}>{c.description}</p>}
                        {c.quotes.map((q, qi) => (
                          <div key={qi} style={{ padding: "8px 12px", background: "rgba(255,255,255,0.6)", borderRadius: "8px", borderLeft: "3px solid #c084fc" }}>
                            <span style={{ fontSize: "13px", color: "#581c87", fontStyle: "italic", lineHeight: 1.5 }}>&quot;{q.text}&quot;</span>
                            {q.date && <span style={{ fontSize: "12px", color: "#a78bfa", fontWeight: 500, marginLeft: "6px" }}>({new Date(q.date + (q.date.length === 10 ? "T12:00" : "")).toLocaleDateString("en-US", { month: "short", day: "numeric" })})</span>}
                          </div>
                        ))}
                        {c.prompt && <p style={{ fontSize: "13px", color: "#7c3aed", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>{c.prompt}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DeepDive({ api }: { api: SessionsApi }) {
  const a = api.us.lastAnalysis;
  const loading = api.analysisLoading;
  const box: React.CSSProperties = { padding: "10px 14px", background: "rgba(237,233,254,0.5)", borderRadius: "10px", border: "1px solid rgba(147,51,234,0.1)", fontSize: "14px", color: "#581c87", lineHeight: 1.5 };
  return (
    <div style={{ ...S.glass, padding: 0 }}>
      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Sparkles size={20} style={{ color: "#9333ea" }} />
          <h3 style={{ fontSize: "18px", fontWeight: 500, color: "#581c87", margin: 0, flex: 1 }}>Patterns Deep Dive</h3>
          <button onClick={api.genAnalysis} disabled={loading} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "20px", border: "none", background: "#9333ea", color: "white", fontSize: "13px", fontWeight: 500, cursor: loading ? "default" : "pointer", opacity: loading ? 0.4 : 1 }}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />{loading ? "Analyzing…" : "Refresh"}
          </button>
        </div>
        {loading && <div style={{ textAlign: "center", padding: "16px 0", color: "#a78bfa", fontSize: "14px" }}>Analyzing…</div>}
        {!loading && !a && <div style={{ textAlign: "center", padding: "8px 0" }}><p style={{ color: "#9ca3af", fontSize: "14px", margin: "0 0 12px 0" }}>Add at least 3 journal entries, then hit Refresh in Patterns above.</p></div>}
        {!loading && a && (
          <>
            {a.themes.length > 0 && <div><div style={S.faintLabel}>Themes</div><div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>{a.themes.map((t, i) => <span key={i} style={{ padding: "6px 14px", background: "rgba(147,51,234,0.1)", borderRadius: "20px", fontSize: "13px", color: "#581c87", fontWeight: 500 }}>{t}</span>)}</div></div>}
            {a.avoiding.length > 0 && <div><div style={S.faintLabel}>What you might be avoiding</div><div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>{a.avoiding.map((t, i) => <div key={i} style={box}>{t}</div>)}</div></div>}
            {a.questions.length > 0 && <div><div style={S.faintLabel}>Open questions</div><div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>{a.questions.map((q, i) => <div key={i} style={{ ...box, fontStyle: "italic" }}>{q}</div>)}</div></div>}
          </>
        )}
      </div>
    </div>
  );
}

// ---- After -------------------------------------------------------------------

function After({ api }: { api: SessionsApi }) {
  const [d, setD] = useState<SessionDraft>(api.us.draft);
  const [logging, setLogging] = useState(false);
  const latest = useRef(d);
  latest.current = d;
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const change = (patch: Partial<SessionDraft>) => {
    const next = { ...latest.current, ...patch };
    setD(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { api.save({ draft: next }); timer.current = undefined; }, 600);
  };
  // Leaving the tab mid-typing still saves.
  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); api.save({ draft: latest.current }); } }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const lbl: React.CSSProperties = { display: "block", color: "#7c3aed", marginBottom: "8px", fontWeight: 500, fontSize: "14px" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="capture-content-wrapper" style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
        <div className="mobile-card" style={S.glass}>
          <div style={{ marginBottom: "24px" }}>
            <label htmlFor="session-date" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#7c3aed", marginBottom: "8px", fontWeight: 500 }}><Calendar size={20} /> Session Date</label>
            <input id="session-date" type="date" value={d.sessionDate} onChange={(e) => change({ sessionDate: e.target.value })} style={S.input} />
          </div>
          <h2 style={S.h2}>How did your session go?</h2>
          <div style={{ marginBottom: "16px" }}><VoiceInput currentText={d.notes} onTranscript={(t) => change({ notes: t })} /></div>
          <textarea aria-label="Session notes" value={d.notes} onChange={(e) => change({ notes: e.target.value })} placeholder="What did you talk about? What came up for you?" style={{ ...S.input, resize: "none", marginBottom: "24px", height: "192px" }} />
          <div style={{ marginBottom: "24px" }}>
            <label htmlFor="next-steps" style={lbl}>Next Steps</label>
            <textarea id="next-steps" value={d.nextSteps} onChange={(e) => change({ nextSteps: e.target.value })} placeholder="Homework, things to work on, reminders for next time..." style={{ ...S.input, fontSize: "15px", resize: "none", height: "100px" }} />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label htmlFor="intention" style={lbl}>Intention</label>
            <input id="intention" type="text" value={d.intention} onChange={(e) => change({ intention: e.target.value })} placeholder="What do you want to carry forward from this session?" style={{ ...S.input, fontSize: "15px" }} />
          </div>
          <div style={{ marginBottom: "20px", padding: "14px 16px", background: "rgba(147,51,234,0.06)", border: "1px solid rgba(147,51,234,0.15)", borderRadius: "12px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
            <span style={{ fontSize: "16px", flexShrink: 0 }}>📋</span>
            <div>
              <p style={{ fontSize: "13px", color: "#6b21a8", margin: "0 0 4px 0", lineHeight: 1.5, fontWeight: 500 }}>What gets saved in your Session Snapshot</p>
              <p style={{ fontSize: "13px", color: "#6b7280", margin: 0, lineHeight: 1.5 }}>Session notes, next steps, intention, what you wanted to discuss, key topics, and patterns.</p>
            </div>
          </div>
          <button disabled={!d.notes || logging} onClick={async () => {
            clearTimeout(timer.current); timer.current = undefined;
            await api.save({ draft: latest.current });
            setLogging(true);
            try { await api.logSession(); } finally { setLogging(false); }
          }} style={{ ...S.primary, width: "100%", background: d.notes ? "#7c3aed" : "#d1d5db", opacity: d.notes ? 1 : 0.5, cursor: d.notes ? "pointer" : "not-allowed" }}>
            {logging ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />} Log Session
          </button>
          <LockNote text="Your session notes are private and secure." />
        </div>
      </div>
    </div>
  );
}

// ---- Progress ----------------------------------------------------------------

function Progress({ api }: { api: SessionsApi }) {
  const snapshots = [...realHistory(api.history)].sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
  const sums = api.us.sessionNotesSummary;
  const recurring = recurringThemes(snapshots, sums);
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "16px 16px 100px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {snapshots.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", background: "rgba(255,255,255,0.7)", borderRadius: "24px", border: "1px solid #e9d5ff" }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>🌱</div>
          <div style={{ fontSize: "18px", fontWeight: 500, color: "#581c87", fontFamily: "var(--font-serif)", marginBottom: "8px" }}>Your journey starts here</div>
          <div style={{ fontSize: "14px", color: "#7c3aed", lineHeight: 1.6 }}>Create a session snapshot after your first session to begin tracking your progress.</div>
        </div>
      ) : (
        <>
          {recurring.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: "20px", border: "1px solid #e9d5ff", padding: "20px 22px" }}>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px" }}>Recurring themes</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {recurring.map((t, i) => (
                  <div key={i} style={{ padding: "12px 14px", borderRadius: "12px", borderLeft: "4px solid #9333ea", background: "#faf5ff" }}>
                    <div style={{ fontSize: "14px", color: "#581c87", fontWeight: 500, marginBottom: "2px" }}>{t.display}</div>
                    <div style={{ fontSize: "12px", color: "#7c3aed" }}>Came up in {t.count} of your sessions</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: "15px", top: "16px", bottom: "16px", width: "2px", background: "linear-gradient(to bottom, #9333ea, #c084fc)", borderRadius: "2px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {[...snapshots].reverse().map((s, i) => {
                const isLatest = i === 0, isFirst = i === snapshots.length - 1;
                const sum = sums[s.parseId];
                return (
                  <div key={s.parseId || i} style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                    <div style={{ flexShrink: 0, width: "32px", height: "32px", borderRadius: "50%", background: isLatest ? "linear-gradient(135deg, #9333ea, #7c3aed)" : "linear-gradient(135deg, #c084fc, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: isLatest ? "0 2px 8px rgba(147,51,234,0.4)" : "none", zIndex: 1, position: "relative" }}>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "white" }}>{snapshots.length - i}</span>
                    </div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.75)", borderRadius: "16px", border: "1px solid #e9d5ff", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "6px" }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "#581c87" }}>{s.sessionDate ? new Date(s.sessionDate + "T12:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}</div>
                        <div style={{ display: "flex", gap: "6px" }}>
                          {isLatest && <span style={{ fontSize: "11px", fontWeight: 600, color: "#9333ea", background: "rgba(147,51,234,0.1)", padding: "2px 10px", borderRadius: "20px" }}>Most recent</span>}
                          {isFirst && !isLatest && <span style={{ fontSize: "11px", fontWeight: 600, color: "#16a34a", background: "rgba(22,163,74,0.1)", padding: "2px 10px", borderRadius: "20px" }}>First session</span>}
                        </div>
                      </div>
                      {sum?.themes?.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>{sum.themes.map((t, ti) => <span key={ti} style={{ fontSize: "12px", color: "#7c3aed", background: "rgba(147,51,234,0.08)", border: "1px solid rgba(147,51,234,0.15)", padding: "3px 10px", borderRadius: "20px" }}>{t}</span>)}</div> : null}
                      {s.locked ? <p style={{ fontSize: "13px", color: "#a78bfa", margin: 0 }}>Locked from the old app.</p>
                        : s.notes && (sum === undefined
                          ? (api.us.aiEnabled ? <p style={{ fontSize: "13px", color: "#a78bfa", margin: 0, fontStyle: "italic" }}>Summarizing…</p> : <p style={{ fontSize: "13px", color: "#581c87", margin: 0, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{s.notes.split("\n").filter(Boolean).slice(0, 3).join("\n")}</p>)
                          : sum.bullets.length > 0 && <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>{sum.bullets.map((b, bi) => <li key={bi} style={{ fontSize: "13px", color: "#581c87", lineHeight: 1.5, display: "flex", gap: "6px" }}><span style={{ color: "#9333ea", flexShrink: 0 }}>•</span>{b}</li>)}</ul>)}
                      {s.intention && <div style={{ fontSize: "12px", color: "#7c3aed", background: "#faf5ff", borderRadius: "8px", padding: "8px 10px" }}><span style={{ fontWeight: 600 }}>Intention: </span>{s.intention}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Care (Second Wind's appointments) ---------------------------------------

function Care({ api }: { api: SessionsApi }) {
  const { us, today } = api;
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ what: "", date: "", time: "", where: "" });
  const [err, setErr] = useState("");
  const up = upcomingAppts(us.appts, today), past = pastAppts(us.appts, today);
  const setNote = (id: number, note: string) => api.save({ appts: us.appts.map((a) => (a.id === id ? { ...a, note } : a)) });
  const card: React.CSSProperties = { ...S.soft, padding: "16px 20px" };
  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "8px 8px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
      <p style={{ fontSize: "14px", color: "#7c3aed", margin: "0 0 4px", textAlign: "center" }}>Your appointments, and what you want to remember.</p>
      {adding ? (
        <div style={card}>
          <AppointmentFields value={form} onChange={setForm} />
          {err && <p style={{ color: "#b91c1c", fontSize: "13px" }}>{err}</p>}
          <button style={{ ...S.primary, width: "100%", marginTop: "12px" }} onClick={() => {
            if (!form.what.trim() || !form.date) { setErr("Add what it is and the date."); return; }
            api.save({ appts: [...us.appts, { id: Date.now(), ...form, what: form.what.trim(), where: form.where.trim(), note: "" }] });
            setAdding(false); setForm({ what: "", date: "", time: "", where: "" }); setErr("");
          }}>Save</button>
          <div style={{ textAlign: "center" }}><button onClick={() => setAdding(false)} style={{ background: "none", border: "none", color: "#7c3aed", textDecoration: "underline", padding: "8px", cursor: "pointer" }}>Cancel</button></div>
        </div>
      ) : <button style={{ ...S.ghost, width: "100%" }} onClick={() => setAdding(true)}>Add an appointment</button>}
      {up.map((a) => (
        <div key={a.id} style={card}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "20px", color: "#581c87" }}>{a.what}</div>
          <div style={{ fontSize: "13px", color: "#581c87" }}>{fmtShortDate(a.date)}{a.time ? ` · ${fmtTime(a.time)}` : ""}</div>
          {a.where && <div style={{ fontSize: "13px", color: "#7c3aed" }}>{a.where}</div>}
          <NoteField label="Questions to bring" placeholder="Anything you want to ask" appt={a} onSave={setNote} />
          <button onClick={() => api.save({ appts: us.appts.filter((x) => x.id !== a.id) })} style={{ background: "none", border: "none", color: "#7c3aed", textDecoration: "underline", padding: "8px 0 0", cursor: "pointer", fontSize: "13px" }}>Remove</button>
        </div>
      ))}
      {past.length > 0 && <h3 style={{ fontFamily: "var(--font-serif)", fontSize: "22px", fontWeight: 400, color: "#581c87", margin: "12px 0 0" }}>How did it go?</h3>}
      {past.map((a) => (
        <div key={a.id} style={card}>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: "19px", color: "#581c87" }}>{a.what}</div>
          <div style={{ fontSize: "13px", color: "#7c3aed" }}>{fmtShortDate(a.date)}</div>
          <NoteField placeholder="Anything to remember?" appt={a} onSave={setNote} />
        </div>
      ))}
    </div>
  );
}

function NoteField({ label, placeholder, appt, onSave }: { label?: string; placeholder: string; appt: Appointment; onSave: (id: number, note: string) => void }) {
  const [v, setV] = useState(appt.note);
  return (
    <label style={{ display: "block", fontSize: "13px", color: "#581c87", marginTop: "10px" }}>
      {label}
      <textarea value={v} placeholder={placeholder} onChange={(e) => setV(e.target.value)} onBlur={() => v !== appt.note && onSave(appt.id, v)} style={{ ...S.input, fontSize: "15px", minHeight: "70px", marginTop: label ? "6px" : 0, resize: "vertical" }} />
    </label>
  );
}
