"use client";

import React, { useState } from "react";
import { Bookmark, Calendar, ChevronDown, ChevronRight, Edit2, Loader2, Lock, Save, Sparkles, Star, Trash2 } from "lucide-react";
import { combineLog, entryPreview, type LogItem } from "@/lib/archive";
import { realHistory } from "@/lib/between";
import { DAILY_PROMPTS } from "@/lib/prompts";
import { getToday } from "@/lib/dates";
import { unlockWithOldPassword } from "@/lib/auth";
import type { Entry, Snapshot } from "@/lib/types";
import type { UserState } from "@/lib/userState";
import VoiceInput from "./VoiceInput";
import { EngagementMessage, LockNote, S, formatDate } from "./ui";

export interface JournalActions {
  saveEntry: (e: { date: string; text: string; prompt: string; bookmark: boolean }) => Promise<boolean>;
  updateEntry: (parseId: string, patch: { text: string; date: string }) => Promise<void>;
  deleteItem: (item: LogItem) => Promise<void>;
  toggleBookmark: (e: Entry) => void;
  removeBookmark: (parseId: string) => void;
  removeFavorite: (text: string) => void;
  reloadAll: () => Promise<void>;
}

export function JournalTab({ view, setView, entries, history, us, engagement, onDismissEngagement, actions, canUnlock }: {
  view: "write" | "log";
  setView: (v: "write" | "log") => void;
  entries: Entry[];
  history: Snapshot[];
  us: UserState;
  engagement: { text: string; type: string } | null;
  onDismissEngagement: () => void;
  actions: JournalActions;
  canUnlock: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "600px" }}>
      <div className="capture-content-wrapper" style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
        {view === "log"
          ? <Log {...{ setView, entries, history, us, engagement, onDismissEngagement, actions, canUnlock }} />
          : <Write {...{ setView, us, actions }} />}
      </div>
    </div>
  );
}

function Write({ setView, us, actions }: { setView: (v: "write" | "log") => void; us: UserState; actions: JournalActions }) {
  const [date, setDate] = useState(getToday());
  const [text, setText] = useState("");
  const [activePrompt, setActivePrompt] = useState("");
  const [promptIdx, setPromptIdx] = useState(0);
  const [showPrompt, setShowPrompt] = useState(false);
  const [pendingBookmark, setPendingBookmark] = useState(false);
  const [saving, setSaving] = useState(false);
  const pool = [...(us.lastAnalysis?.placeholder ? [] : us.lastAnalysis?.questions ?? []), ...DAILY_PROMPTS];
  const current = pool[promptIdx % pool.length];

  return (
    <div className="mobile-card" style={{ position: "relative", ...S.glass }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
        <button onClick={() => setView("log")} style={{ padding: "5px 12px", background: "transparent", color: "#9333ea", border: "1px solid #e9d5ff", borderRadius: "14px", fontSize: "12px", fontWeight: 500, cursor: "pointer" }}>View log →</button>
      </div>

      <div style={{ marginBottom: "24px" }}>
        <label htmlFor="entry-date" style={{ display: "flex", alignItems: "center", gap: "8px", color: "#7c3aed", marginBottom: "8px", fontWeight: 500 }}>
          <Calendar size={20} /> Date
        </label>
        <input id="entry-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={S.input} />
      </div>

      {activePrompt && (
        <div style={{ marginBottom: "16px", padding: "12px 14px", background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)", border: "1px solid #e9d5ff", borderRadius: "12px", position: "relative" }}>
          <button onClick={() => setActivePrompt("")} aria-label="Clear prompt" style={{ position: "absolute", top: "8px", right: "8px", background: "none", border: "none", color: "#9ca3af", cursor: "pointer", fontSize: "16px", padding: "2px", lineHeight: 1 }}>×</button>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", paddingRight: "16px" }}>
            <Sparkles size={14} style={{ color: "#9333ea", flexShrink: 0, marginTop: "2px" }} />
            <p style={{ fontSize: "13px", color: "#581c87", margin: 0, lineHeight: 1.5 }}>{activePrompt}</p>
          </div>
        </div>
      )}

      <h2 style={S.h2}>What came up today?</h2>

      <div style={{ marginBottom: "16px", border: "1px solid #e9d5ff", borderRadius: "14px", overflow: "hidden" }}>
        <button onClick={() => setShowPrompt((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#7c3aed" }}>Personalized prompt</span>
          <ChevronDown size={15} style={{ color: "#a78bfa", transition: "transform 0.2s", transform: showPrompt ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }} />
        </button>
        {showPrompt && (
          <div style={{ padding: "4px 16px 14px", background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)" }}>
            <p style={{ fontSize: "14px", color: "#581c87", margin: "0 0 12px 0", lineHeight: 1.6, fontStyle: "italic" }}>{current}</p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => { setActivePrompt(current); setShowPrompt(false); }} style={S.pill}>Use this prompt →</button>
              <button onClick={() => setPromptIdx((i) => i + 1)} style={S.ghostPill}>Show me another</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: "16px" }}>
        <VoiceInput currentText={text} onTranscript={setText} />
      </div>

      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Start writing..." style={{ ...S.input, resize: "none", marginBottom: "16px", height: "192px" }} />

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          disabled={!text || saving}
          onClick={async () => {
            setSaving(true);
            const ok = await actions.saveEntry({ date, text, prompt: activePrompt, bookmark: pendingBookmark });
            setSaving(false);
            if (ok) { setText(""); setActivePrompt(""); setPendingBookmark(false); setView("log"); }
          }}
          style={{ ...S.primary, flex: 1, ...(text ? {} : { background: "#d1d5db", opacity: 0.5, cursor: "not-allowed" }) }}
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} Save
        </button>
        <button onClick={() => setPendingBookmark((p) => !p)} aria-pressed={pendingBookmark} title={pendingBookmark ? "Remove bookmark" : "Bookmark this entry"}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 16px", borderRadius: "12px", border: `2px solid ${pendingBookmark ? "#9333ea" : "#e9d5ff"}`, background: pendingBookmark ? "rgba(147,51,234,0.08)" : "rgba(255,255,255,0.8)", color: pendingBookmark ? "#9333ea" : "#c4b5fd", cursor: "pointer", flexShrink: 0 }}>
          <Bookmark size={20} fill={pendingBookmark ? "#9333ea" : "none"} />
        </button>
      </div>
      <p style={{ margin: "8px 0 4px", textAlign: "right", fontSize: "12px", color: "#a78bfa" }}>Bookmark to bring up in your next session</p>
      <LockNote />
    </div>
  );
}

function Log({ setView, entries, history, us, engagement, onDismissEngagement, actions, canUnlock }: {
  setView: (v: "write" | "log") => void; entries: Entry[]; history: Snapshot[]; us: UserState;
  engagement: { text: string; type: string } | null; onDismissEngagement: () => void; actions: JournalActions; canUnlock: boolean;
}) {
  const [filter, setFilter] = useState<"all" | "entries" | "snapshots" | "bookmarked" | "favorites">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ text: "", date: "" });
  const combined = combineLog(entries, history);
  const locked = combined.filter((i) => i.data.locked).length;
  const bookmarks = us.bookmarks;
  const favs = us.favoritedPatterns;
  const pillStyle = (on: boolean): React.CSSProperties => ({ padding: "5px 12px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 500, background: on ? "#9333ea" : "rgba(147,51,234,0.08)", color: on ? "white" : "#7c3aed" });
  const empty = (t: string) => <p style={{ color: "#7c3aed", textAlign: "center", padding: "32px 0" }}>{t}</p>;
  const filtered = combined.filter((i) => (filter === "entries" ? i.type === "entry" : filter === "snapshots" ? i.type === "snap" : true));

  return (
    <div className="mobile-card" style={S.glass}>
      {engagement && <EngagementMessage message={engagement.text} type={engagement.type} onDismiss={onDismissEngagement} />}
      {locked > 0 && canUnlock && <UnlockBanner count={locked} onUnlocked={actions.reloadAll} />}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
        <button onClick={() => setView("write")} style={{ padding: "7px 16px", background: "#9333ea", color: "white", border: "none", borderRadius: "20px", fontSize: "13px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>+ Capture a thought</button>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {([["all", "All"], ["entries", `Thoughts (${entries.length})`], ["snapshots", `Sessions (${realHistory(history).length})`], ["bookmarked", `Bookmarked${bookmarks.length ? ` (${bookmarks.length})` : ""}`], ["favorites", `★ Favorites${favs.length ? ` (${favs.length})` : ""}`]] as const).map(([f, label]) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} style={pillStyle(filter === f)}>{label}</button>
          ))}
        </div>
      </div>

      {filter === "bookmarked" ? (
        bookmarks.length === 0 ? empty("No bookmarks yet. Tap the bookmark icon on any entry to save it here.") : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[...bookmarks].reverse().map((b, i) => (
              <div key={b.parseId || i} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", background: "rgba(255,255,255,0.6)", borderRadius: "12px", border: "1px solid #e9d5ff", padding: "12px 14px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: "11px", color: "#9333ea", fontWeight: 600, margin: "0 0 4px 0" }}>{b.date ? formatDate(b.date) : ""}</p>
                  <p style={{ ...S.body, margin: 0, lineHeight: 1.5 }}>{b.text}</p>
                </div>
                <button onClick={() => actions.removeBookmark(b.parseId)} title="Remove bookmark" style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", flexShrink: 0, color: "#9333ea" }}><Bookmark size={16} fill="#9333ea" /></button>
              </div>
            ))}
          </div>
        )
      ) : filter === "favorites" ? (
        favs.length === 0 ? empty("No favorites yet. Star patterns in the Patterns tab to save them here.") : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[...favs].reverse().map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", background: "rgba(255,255,255,0.6)", borderRadius: "12px", border: "1px solid #e9d5ff", padding: "12px 14px" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "rgba(147,51,234,0.08)", borderRadius: "20px", padding: "2px 8px", marginBottom: "6px" }}>
                    <Star size={10} fill="#9333ea" style={{ color: "#9333ea" }} />
                    <span style={{ fontSize: "10px", fontWeight: 600, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.4px" }}>Favorite Pattern</span>
                  </div>
                  <p style={{ fontSize: "14px", color: "#581c87", margin: "0 0 4px 0", lineHeight: 1.5 }}>{f.text}</p>
                  <p style={{ fontSize: "11px", color: "#9ca3af", margin: 0 }}>Saved {new Date(f.favoritedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </div>
                <button onClick={() => actions.removeFavorite(f.text)} title="Remove from favorites" style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", flexShrink: 0, color: "#f59e0b" }}><Star size={16} fill="#f59e0b" /></button>
              </div>
            ))}
          </div>
        )
      ) : !entries.length && !history.length ? empty("No entries yet. Start journaling to build your log.")
        : filtered.length === 0 ? empty(`No ${filter === "entries" ? "thoughts captured" : "session snapshots"} yet.`) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((item) => {
            const open = Boolean(expanded[item.id]);
            const isBookmarked = item.type === "entry" && bookmarks.some((b) => b.parseId === item.data.parseId);
            return (
              <div key={item.id} className="log-item" style={{ background: "rgba(255,255,255,0.6)", borderRadius: "16px", border: "1px solid #e9d5ff", overflow: "hidden", maxWidth: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", cursor: "pointer", gap: "8px", flexWrap: "wrap" }} onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0, overflow: "hidden" }}>
                    {open ? <ChevronDown size={20} style={{ color: "#7c3aed", flexShrink: 0 }} /> : <ChevronRight size={20} style={{ color: "#7c3aed", flexShrink: 0 }} />}
                    <div style={{ width: "70px", height: "32px", padding: "4px 6px", borderRadius: "8px", background: item.type === "entry" ? "#dbeafe" : "#ede9fe", color: item.type === "entry" ? "#1e40af" : "#5b21b6", fontSize: "10px", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", flexShrink: 0, lineHeight: 1.2, whiteSpace: "pre-line" }}>
                      {item.type === "entry" ? "Journal\nEntry" : "Session\nSnapshot"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                      <h3 style={{ fontWeight: 500, color: "#581c87", margin: 0, fontSize: "18px" }}>{formatDate(item.date)}</h3>
                      {item.type === "entry" && <p style={{ fontSize: "14px", color: "#7c3aed", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>{entryPreview(item.data)}</p>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                    {item.type === "entry" && !item.data.locked && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); actions.toggleBookmark(item.data); }} title={isBookmarked ? "Remove bookmark" : "Bookmark this entry"} aria-label={isBookmarked ? "Remove bookmark" : "Bookmark this entry"} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: isBookmarked ? "#9333ea" : "#d1d5db" }}>
                          <Bookmark size={16} fill={isBookmarked ? "#9333ea" : "none"} />
                        </button>
                        <button aria-label="Edit entry" onClick={(e) => { e.stopPropagation(); setEditingId(item.data.parseId); setDraft({ text: item.data.text, date: item.data.date || getToday() }); setExpanded((p) => ({ ...p, [item.id]: true })); }} style={{ background: "none", border: "none", color: "#7c3aed", cursor: "pointer", padding: "4px" }}>
                          <Edit2 size={16} />
                        </button>
                      </>
                    )}
                    <button aria-label="Delete" onClick={(e) => { e.stopPropagation(); actions.deleteItem(item); }} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {open && (
                  <div style={{ padding: "12px", paddingTop: 0, borderTop: "1px solid #e9d5ff", maxWidth: "100%", overflow: "hidden" }}>
                    {item.data.locked ? (
                      <p style={{ color: "#7c3aed", fontSize: "14px", marginTop: "12px" }}>This was written in the old Between app and is locked with your old password.</p>
                    ) : item.type === "entry" ? (
                      <>
                        {item.data.prompt && (
                          <div style={{ marginTop: "12px", padding: "16px", background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)", border: "1px solid #e9d5ff", borderRadius: "12px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                              <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#9333ea", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Sparkles size={14} color="white" /></div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: "10px", fontWeight: 600, color: "#9333ea", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>AI Prompt</div>
                                <p style={{ fontSize: "14px", color: "#581c87", margin: 0, lineHeight: 1.5 }}>{item.data.prompt}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        {editingId === item.data.parseId ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
                            <input type="date" value={draft.date} onChange={(e) => setDraft((p) => ({ ...p, date: e.target.value }))} style={{ ...S.input, padding: "10px 16px" }} />
                            <textarea value={draft.text} onChange={(e) => setDraft((p) => ({ ...p, text: e.target.value }))} style={{ ...S.input, resize: "none", height: "160px" }} />
                            <div style={{ display: "flex", gap: "8px" }}>
                              <button onClick={async () => { await actions.updateEntry(item.data.parseId, draft); setEditingId(null); }} style={{ flex: 1, padding: "8px 16px", borderRadius: "12px", background: "#9333ea", color: "white", fontWeight: 500, border: "none", cursor: "pointer" }}>Save changes</button>
                              <button onClick={() => setEditingId(null)} style={{ flex: 1, padding: "8px 16px", borderRadius: "12px", background: "rgba(255,255,255,0.7)", color: "#7c3aed", fontWeight: 500, border: "1px solid #e9d5ff", cursor: "pointer" }}>Cancel</button>
                            </div>
                          </div>
                        ) : <p className="entry-text" style={{ color: "#581c87", whiteSpace: "pre-wrap", marginTop: "12px", wordBreak: "break-word" }}>{item.data.text}</p>}
                      </>
                    ) : <SnapshotFields s={item.data} bullets={us.sessionNotesSummary[item.data.parseId]?.bullets} />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function SnapshotFields({ s, bullets }: { s: Snapshot; bullets?: string[] }) {
  const h4: React.CSSProperties = { fontWeight: 600, color: "#581c87", marginBottom: "8px", fontSize: "14px" };
  const p: React.CSSProperties = { color: "#7c3aed", whiteSpace: "pre-wrap", margin: 0, wordBreak: "break-word" };
  return (
    <div className="archive-card" style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
      {s.prepNote && <div><h4 style={h4}>What I Wanted to Discuss</h4><p style={p}>{s.prepNote}</p></div>}
      {s.discussedTopics.length > 0 && <div><h4 style={h4}>Key Topics</h4><ul style={{ margin: 0, paddingLeft: "18px", color: "#581c87" }}>{s.discussedTopics.map((t, i) => <li key={i} style={{ marginBottom: "4px", fontSize: "14px", lineHeight: 1.5 }}>{t}</li>)}</ul></div>}
      {s.notes && (
        <div>
          <h4 style={h4}>Session Notes</h4>
          {bullets && bullets.length ? (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "4px" }}>
              {bullets.map((b, i) => <li key={i} style={{ fontSize: "14px", color: "#7c3aed", lineHeight: 1.5, display: "flex", gap: "6px" }}><span style={{ color: "#9333ea", flexShrink: 0 }}>•</span>{b}</li>)}
            </ul>
          ) : <p style={p}>{s.notes}</p>}
        </div>
      )}
      {s.nextSteps && <div><h4 style={h4}>Next Steps</h4><p style={p}>{s.nextSteps}</p></div>}
      {s.intention && <div><h4 style={h4}>Intention</h4><p style={{ ...p, fontStyle: "italic" }}>{s.intention}</p></div>}
      {s.avoiding.length > 0 && <div><h4 style={h4}>Patterns</h4><ul style={{ margin: 0, paddingLeft: "18px", color: "#581c87" }}>{s.avoiding.map((x, i) => <li key={i} style={{ marginBottom: "4px", fontSize: "14px", lineHeight: 1.5 }}>{x}</li>)}</ul></div>}
    </div>
  );
}

function UnlockBanner({ count, onUnlocked }: { count: number; onUnlocked: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  return (
    <div style={{ padding: "12px 16px", borderRadius: "12px", background: "#ede9fe", color: "#5b21b6", fontSize: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
      <span><Lock size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />{count} {count === 1 ? "item" : "items"} from the old app {count === 1 ? "is" : "are"} still locked.</span>
      {open ? (
        <form style={{ display: "flex", gap: "8px", width: "100%" }} onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true); setMsg("");
          try {
            const r = await unlockWithOldPassword(pw);
            const left = r.entries.stillLocked + r.snapshots.stillLocked;
            await onUnlocked();
            setMsg(left ? `${left} still locked. They may use an even older password.` : "");
            if (!left) setOpen(false);
          } catch (err) { setMsg(err instanceof Error ? err.message : "That didn't work."); }
          finally { setBusy(false); setPw(""); }
        }}>
          <input type="password" placeholder="Old Between password" value={pw} autoFocus onChange={(e) => setPw(e.target.value)} style={{ ...S.input, flex: 1, padding: "8px 12px" }} />
          <button disabled={!pw || busy} style={{ ...S.pill, padding: "8px 16px" }}>{busy ? <Loader2 size={16} className="animate-spin" /> : "Unlock"}</button>
        </form>
      ) : <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "#7c3aed", fontWeight: 600, cursor: "pointer" }}>Unlock</button>}
      {msg && <p style={{ width: "100%", margin: 0 }}>{msg}</p>}
    </div>
  );
}
