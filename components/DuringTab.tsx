"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Calendar, Edit2, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { DEFAULT_STARTER } from "@/lib/patterns";
import type { SessionPrep } from "@/lib/types";

interface Props {
  prep: SessionPrep | null;
  analyzing: boolean;
  canRefresh: boolean;
  onGoToPrep: () => void;
  onChange: (fields: Partial<SessionPrep>) => void;
  onRefreshStarter: () => void;
  onMoveToArchive: () => Promise<void>;
}

export function DuringTab({ prep, analyzing, canRefresh, onGoToPrep, onChange, onRefreshStarter, onMoveToArchive }: Props) {
  const [editStmt, setEditStmt] = useState(false);
  const [tempStmt, setTempStmt] = useState("");
  const [archiving, setArchiving] = useState(false);

  if (!prep) {
    return (
      <div className="card center">
        <Sparkles size={48} color="#c4b5fd" className="big-icon" />
        <p style={{ color: "var(--secondary)", fontSize: 16, marginBottom: 16 }}>
          Create session prep first to use during-session tools
        </p>
        <button className="btn inline" onClick={onGoToPrep}>
          <Calendar size={20} />
          Go to Prep
        </button>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="card compact">
        <h3 className="card-title">Session Date</h3>
        <input
          type="date" className="input" value={prep.sessionDate}
          onChange={(e) => onChange({ sessionDate: e.target.value })}
        />
      </div>

      <div className="starter-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8 }}>
          <h3 className="card-title" style={{ margin: 0 }}>Your Session Starter</h3>
          <div style={{ display: "flex", gap: 8 }}>
            {canRefresh && (
              <button className="link-btn" onClick={onRefreshStarter} disabled={analyzing}>
                {analyzing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Refresh
              </button>
            )}
            <button
              className="link-btn"
              onClick={() => {
                if (editStmt) {
                  onChange({ openingStatement: tempStmt });
                  setEditStmt(false);
                } else {
                  setTempStmt(prep.openingStatement || "");
                  setEditStmt(true);
                }
              }}
            >
              <Edit2 size={14} />
              {editStmt ? "Save" : "Edit"}
            </button>
          </div>
        </div>
        {editStmt ? (
          <textarea
            className="textarea" rows={3} value={tempStmt} style={{ background: "white", height: 80 }}
            onChange={(e) => setTempStmt(e.target.value)}
          />
        ) : (
          <p className="body-dark" style={{ fontSize: 16 }}>&ldquo;{prep.openingStatement || DEFAULT_STARTER}&rdquo;</p>
        )}
      </div>

      <AutosaveArea
        title="Notes"
        value={prep.notes}
        placeholder="Add any notes or context for your session..."
        onSave={(v) => onChange({ notes: v })}
      />
      <AutosaveArea
        title="Next steps"
        value={prep.nextSteps}
        placeholder="Add any next steps, homework, or things to remember for next session..."
        onSave={(v) => onChange({ nextSteps: v })}
      />

      <button
        className="btn archive"
        disabled={archiving}
        onClick={async () => {
          setArchiving(true);
          try { await onMoveToArchive(); } finally { setArchiving(false); }
        }}
      >
        {archiving ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
        Move to Archive
      </button>
    </div>
  );
}

/** A textarea that saves after a pause in typing and when it loses focus. */
function AutosaveArea({ title, value, placeholder, onSave }: {
  title: string; value: string; placeholder: string; onSave: (v: string) => void;
}) {
  const [text, setText] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const lastSaved = useRef(value);

  useEffect(() => {
    // Take in server updates (e.g. after a refresh) unless the user is mid-edit.
    if (!timer.current && value !== lastSaved.current) {
      setText(value);
      lastSaved.current = value;
    }
  }, [value]);

  const flush = (v: string) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = undefined;
    if (v !== lastSaved.current) {
      lastSaved.current = v;
      onSave(v);
    }
  };

  // Leaving the tab mid-typing still saves.
  const latest = useRef({ text, onSave });
  latest.current = { text, onSave };
  useEffect(
    () => () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      const { text: t, onSave: save } = latest.current;
      if (t !== lastSaved.current) save(t);
    },
    [],
  );

  return (
    <div className="card">
      <h3 className="card-title">{title}</h3>
      <textarea
        className="textarea" value={text} placeholder={placeholder} style={{ height: 128 }}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => flush(v), 600);
        }}
        onBlur={(e) => flush(e.target.value)}
      />
    </div>
  );
}
