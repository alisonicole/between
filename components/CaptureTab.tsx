"use client";

import { useState } from "react";
import { Calendar, ChevronDown, ChevronRight, Edit2, Loader2, Lock, Save, Trash2 } from "lucide-react";
import * as data from "@/lib/data";
import { unlockWithOldPassword } from "@/lib/auth";
import { combineArchive, archivePreview, type ArchiveItem } from "@/lib/archive";
import { formatDate, getToday } from "@/lib/dates";
import type { Entry, Snapshot } from "@/lib/types";

interface Props {
  entries: Entry[];
  snapshots: Snapshot[];
  showArchive: boolean;
  setShowArchive: (v: boolean) => void;
  reloadEntries: () => Promise<void>;
  reloadSnapshots: () => Promise<void>;
  onError: (e: unknown, fallback: string) => void;
  canUnlock: boolean;
}

export function CaptureTab(props: Props) {
  const { entries, snapshots, showArchive, setShowArchive } = props;
  return (
    <div className="stack capture">
      <div className="subtabs">
        {([[false, "Journal Entry"], [true, `Archive (${entries.length + snapshots.length})`]] as const).map(([isArchive, label]) => (
          <button
            key={String(isArchive)}
            className={`subtab${showArchive === isArchive ? " active" : ""}`}
            onClick={() => setShowArchive(isArchive)}
          >
            {label}
          </button>
        ))}
      </div>
      {showArchive ? <Archive {...props} /> : <JournalEntry {...props} />}
    </div>
  );
}

function JournalEntry({ reloadEntries, setShowArchive, onError }: Props) {
  const [date, setDate] = useState(getToday());
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!text) return;
    setSaving(true);
    try {
      await data.createEntry({ date, title, text });
      await reloadEntries();
      setTitle("");
      setText("");
      setShowArchive(true);
    } catch (err) {
      onError(err, "Couldn't save your entry. It's still here; please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card compact">
      <div style={{ marginBottom: 24 }}>
        <label className="label" htmlFor="entry-date">
          <Calendar size={18} />
          Date
        </label>
        <input id="entry-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <h2 className="card-title">What&apos;s on your mind?</h2>

      <input
        type="text" className="input title" value={title} placeholder="Title (optional)"
        onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 16 }}
      />
      <textarea
        className="textarea" value={text} placeholder="Start writing..."
        onChange={(e) => setText(e.target.value)} style={{ marginBottom: 16, height: 192 }}
      />

      <button className="btn" onClick={save} disabled={!text || saving}>
        {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
        Save
      </button>

      <div className="lock-note">
        <Lock size={14} />
        <span>Your data is private and secure.</span>
      </div>
    </div>
  );
}

function Archive({ entries, snapshots, reloadEntries, reloadSnapshots, onError, canUnlock }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", text: "" });

  const items = combineArchive(entries, snapshots);
  const lockedCount = items.filter((i) => i.data.locked).length;

  async function remove(item: ArchiveItem) {
    try {
      if (item.type === "entry") {
        await data.deleteEntry(item.data.parseId);
        await reloadEntries();
      } else {
        await data.deleteSnapshot(item.data.parseId);
        await reloadSnapshots();
      }
    } catch (err) {
      onError(err, "Couldn't delete that. Please try again.");
    }
  }

  async function saveEdit(parseId: string) {
    try {
      await data.updateEntry(parseId, draft);
      await reloadEntries();
      setEditingId(null);
    } catch (err) {
      onError(err, "Couldn't save your changes. Please try again.");
    }
  }

  return (
    <div className="card compact">
      <h2 className="card-title" style={{ marginBottom: 24 }}>Archive</h2>

      {lockedCount > 0 && canUnlock && (
        <UnlockBanner count={lockedCount} onUnlocked={async () => { await reloadEntries(); await reloadSnapshots(); }} />
      )}

      {!items.length ? (
        <p style={{ color: "var(--secondary)", textAlign: "center", padding: "32px 0" }}>
          No entries yet. Start journaling to build your archive.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item) => {
            const open = Boolean(expanded[item.id]);
            return (
              <div key={item.id} className="archive-item">
                <div className="archive-row" onClick={() => setExpanded((p) => ({ ...p, [item.id]: !p[item.id] }))}>
                  <div className="archive-left">
                    {open ? (
                      <ChevronDown size={20} color="#7c3aed" style={{ flexShrink: 0 }} />
                    ) : (
                      <ChevronRight size={20} color="#7c3aed" style={{ flexShrink: 0 }} />
                    )}
                    <div className={`chip ${item.type}`}>{item.type === "entry" ? "Journal\nEntry" : "Session\nSnapshot"}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="archive-date">{formatDate(item.date)}</h3>
                      <p className="archive-preview">{archivePreview(item)}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {item.type === "entry" && !item.data.locked && (
                      <button
                        className="icon-btn" aria-label="Edit entry"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(item.data.parseId);
                          setDraft({ title: item.data.title, text: item.data.text });
                          setExpanded((p) => ({ ...p, [item.id]: true }));
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    <button
                      className="icon-btn danger" aria-label="Delete"
                      onClick={(e) => { e.stopPropagation(); remove(item); }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="archive-body">
                    {item.data.locked ? (
                      <p className="muted" style={{ marginTop: 12 }}>
                        This was written in the old Between app and is locked with your old password.
                      </p>
                    ) : item.type === "entry" ? (
                      editingId === item.data.parseId ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
                          <input
                            className="input title" value={draft.title} placeholder="Title (optional)"
                            onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                          />
                          <textarea
                            className="textarea" value={draft.text} style={{ height: 160 }}
                            onChange={(e) => setDraft((p) => ({ ...p, text: e.target.value }))}
                          />
                          <div style={{ display: "flex", gap: 8 }}>
                            <button className="btn btn-small" onClick={() => saveEdit(item.data.parseId)}>Save changes</button>
                            <button className="btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p className="body-dark" style={{ marginTop: 12 }}>{item.data.text}</p>
                      )
                    ) : (
                      <SnapshotDetail s={item.data} />
                    )}
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

function SnapshotDetail({ s }: { s: Snapshot }) {
  const patternLists: [string, string[]][] = [
    ["What's trying to come up", s.themes],
    ["Things I might be avoiding", s.avoiding],
    ["Questions and confusions", s.questions],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
      <Field label="Session Starter" value={s.openingStatement} dark />
      {s.intention && <Field label="Intention" value={s.intention} />}
      {s.prepNote && <Field label="Prep note" value={s.prepNote} />}
      <Field label="Notes" value={s.notes} />
      <Field label="Next Steps" value={s.nextSteps} />
      {/* 1.0 saved Patterns with each snapshot but never showed them. */}
      {patternLists.some(([, l]) => l.length > 0) &&
        patternLists.map(([label, items]) =>
          items.length ? (
            <div key={label}>
              <h4 className="h4">{label}</h4>
              <ul className="bullets">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
            </div>
          ) : null,
        )}
    </div>
  );
}

function Field({ label, value, dark }: { label: string; value?: string; dark?: boolean }) {
  return (
    <div>
      <h4 className="h4">{label}</h4>
      <p className={dark ? "body-dark" : "body"}>{value || "—"}</p>
    </div>
  );
}

function UnlockBanner({ count, onUnlocked }: { count: number; onUnlocked: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const r = await unlockWithOldPassword(pw);
      const left = r.entries.stillLocked + r.snapshots.stillLocked;
      await onUnlocked();
      setMsg(left ? `${left} still locked. They may use an even older password.` : "");
      if (!left) setOpen(false);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "That didn't work.");
    } finally {
      setBusy(false);
      setPw("");
    }
  }

  return (
    <div className="info-banner" style={{ marginBottom: 16 }}>
      <span>
        <Lock size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />
        {count} {count === 1 ? "item" : "items"} from the old app {count === 1 ? "is" : "are"} still locked.
      </span>
      {open ? (
        <form onSubmit={unlock} style={{ display: "flex", gap: 8, width: "100%" }}>
          <input
            className="input" type="password" placeholder="Old Between password" value={pw} autoFocus
            onChange={(e) => setPw(e.target.value)} style={{ flex: 1 }}
          />
          <button className="btn btn-small" style={{ flex: "0 0 auto" }} disabled={!pw || busy}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : "Unlock"}
          </button>
        </form>
      ) : (
        <button className="link-btn" onClick={() => setOpen(true)}>Unlock</button>
      )}
      {msg && <p style={{ width: "100%" }}>{msg}</p>}
    </div>
  );
}
