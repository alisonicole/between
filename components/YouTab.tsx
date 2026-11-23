"use client";

import React, { useState } from "react";
import { LogOut, User } from "lucide-react";
import { buildICS, planIsUsable, type SafetyPlan } from "@/lib/garden";
import type { UserState } from "@/lib/userState";
import { PlanForm, PlanSections, type SheetKind } from "./garden/Sheets";
import { S, downloadFile } from "./ui";

const row: React.CSSProperties = { padding: "16px", background: "rgba(147,51,234,0.05)", borderRadius: "12px", border: "1px solid rgba(147,51,234,0.1)" };
const rowLabel: React.CSSProperties = { fontSize: "12px", color: "#7c3aed", marginBottom: "4px", fontWeight: 500 };
const rowValue: React.CSSProperties = { fontSize: "16px", color: "#581c87" };
const editBtn: React.CSSProperties = { background: "none", border: "none", color: "#9333ea", cursor: "pointer", fontSize: "12px", fontWeight: 500, padding: "2px 6px" };
const section: React.CSSProperties = { ...S.glass, marginTop: "20px" };
const sectionTitle: React.CSSProperties = { fontSize: "20px", fontWeight: 400, color: "#581c87", margin: "0 0 6px", fontFamily: "var(--font-serif)" };
const notSet = <span style={{ color: "#9ca3af", fontStyle: "italic" }}>Not set</span>;

export function YouTab({ us, today, email, memberSince, entryCount, sessionCount, save, onEditSchedule, onLogout, open, onExport, onImportClick, toast }: {
  us: UserState;
  today: string;
  email: string;
  memberSince?: Date;
  entryCount: number;
  sessionCount: number;
  save: (patch: Partial<UserState>) => Promise<void>;
  onEditSchedule: () => void;
  onLogout: () => void;
  open: (s: SheetKind) => void;
  onExport: () => void;
  onImportClick: () => void;
  toast: (t: string) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [editingPlan, setEditingPlan] = useState(false);
  const [plan, setPlan] = useState<SafetyPlan>(us.plan);
  const [bird, setBird] = useState(us.bird);
  const [times, setTimes] = useState(us.times);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "0 16px" }}>
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <h2 style={{ fontSize: "28px", fontWeight: 300, color: "#581c87", marginBottom: "8px" }}>Account</h2>
        <p style={{ color: "#7c3aed", fontSize: "14px" }}>Your profile and settings</p>
      </div>

      <div style={S.glass}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "linear-gradient(135deg, #9333ea 0%, #7c3aed 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            {us.displayName ? <span style={{ fontSize: "32px", fontWeight: 600, color: "white" }}>{us.displayName.charAt(0).toUpperCase()}</span> : <User size={40} color="white" />}
          </div>
          <h3 style={{ fontSize: "20px", fontWeight: 500, color: "#581c87", marginBottom: "4px" }}>{us.displayName || email || "User"}</h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={row}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <div style={{ ...rowLabel, marginBottom: 0 }}>Name</div>
              <button style={editBtn} onClick={async () => {
                if (editingName) { await save({ displayName: nameInput.trim() }); setEditingName(false); }
                else { setNameInput(us.displayName); setEditingName(true); }
              }}>{editingName ? "Save" : "Edit"}</button>
            </div>
            {editingName ? (
              <input type="text" value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Your first name" autoFocus
                style={{ width: "100%", padding: "8px 0", border: "none", borderBottom: "2px solid #9333ea", outline: "none", fontSize: "16px", background: "transparent", color: "#581c87" }} />
            ) : <div style={rowValue}>{us.displayName || notSet}</div>}
          </div>
          <div style={row}><div style={rowLabel}>Email</div><div style={rowValue}>{email || "Not available"}</div></div>
          <div style={row}><div style={rowLabel}>Member Since</div><div style={rowValue}>{memberSince ? memberSince.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Not available"}</div></div>
          <div style={row}><div style={rowLabel}>Journal Entries</div><div style={rowValue}>{entryCount} {entryCount === 1 ? "entry" : "entries"}</div></div>
          <div style={row}><div style={rowLabel}>Sessions Recorded</div><div style={rowValue}>{sessionCount} {sessionCount === 1 ? "session" : "sessions"}</div></div>
          <div style={row}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <div style={{ ...rowLabel, marginBottom: 0 }}>Session Schedule</div>
              <button style={editBtn} onClick={onEditSchedule}>{us.sessionDays.length ? "Edit" : "Set"}</button>
            </div>
            <div style={rowValue}>{us.sessionDays.length ? `${us.sessionDays.join(", ")}${us.sessionTime ? ` at ${us.sessionTime}` : ""}` : notSet}</div>
          </div>
        </div>
      </div>

      <div style={section}>
        <h3 style={sectionTitle}>My safety plan</h3>
        <p style={{ ...S.muted, margin: 0 }}>Written with my care team. Take it one step at a time, in order.</p>
        {editingPlan ? (
          <>
            <p style={{ ...S.muted, marginTop: "8px" }}>One item per line. For people, use “Name, phone”.</p>
            <PlanForm plan={plan} onChange={setPlan} />
            <button style={{ ...S.primary, width: "100%", marginTop: "14px" }} onClick={async () => {
              await save({ plan });
              setEditingPlan(false);
              toast(planIsUsable(plan) ? "Your plan is saved." : "Saved. Add a coping step and a person when you can.");
            }}>Save my plan</button>
            <div style={{ textAlign: "center" }}><button style={{ ...editBtn, fontSize: "14px", padding: "8px" }} onClick={() => { setPlan(us.plan); setEditingPlan(false); }}>Cancel</button></div>
          </>
        ) : (
          <>
            <PlanSections plan={us.plan} />
            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button style={{ ...S.ghost, flex: 1 }} onClick={() => open({ kind: "breathe" })}>Breathe with me</button>
              <button style={{ ...S.ghost, flex: 1 }} onClick={() => { setPlan(us.plan); setEditingPlan(true); }}>Edit</button>
            </div>
          </>
        )}
      </div>

      <div style={section}>
        <h3 style={sectionTitle}>AI</h3>
        <p style={{ fontSize: "14px", color: "#581c87", lineHeight: 1.6, margin: "0 0 14px" }}>
          Patterns, session summaries, your monthly reflection and encouraging notes use AI. When it&apos;s on, the text of your journal entries and session notes is sent to Anthropic&apos;s Claude through Between&apos;s server. Nothing is sent while it&apos;s off.
        </p>
        <button style={us.aiEnabled ? { ...S.ghost, width: "100%" } : { ...S.primary, width: "100%" }} onClick={async () => {
          await save({ aiEnabled: !us.aiEnabled });
          toast(us.aiEnabled ? "AI is off." : "AI is on.");
        }}>{us.aiEnabled ? "Turn AI off" : "Turn AI on"}</button>
      </div>

      <div style={section}>
        <h3 style={sectionTitle}>Greenhouse</h3>
        <label style={{ display: "block", fontSize: "14px", color: "#581c87", margin: "8px 0 6px" }}>Your bird’s name
          <input style={{ ...S.input, marginTop: "6px" }} value={bird} onChange={(e) => setBird(e.target.value)} />
        </label>
        <div style={{ display: "flex", gap: "10px" }}>
          <label style={{ flex: 1, fontSize: "14px", color: "#581c87" }}>Morning check-in<input type="time" style={{ ...S.input, marginTop: "6px" }} value={times.am} onChange={(e) => setTimes({ ...times, am: e.target.value })} /></label>
          <label style={{ flex: 1, fontSize: "14px", color: "#581c87" }}>Evening check-in<input type="time" style={{ ...S.input, marginTop: "6px" }} value={times.pm} onChange={(e) => setTimes({ ...times, pm: e.target.value })} /></label>
        </div>
        <button style={{ ...S.primary, width: "100%", marginTop: "14px" }} onClick={async () => { await save({ bird: bird.trim() || us.bird, times }); toast("Saved."); }}>Save</button>
        <button style={{ ...S.ghost, width: "100%", marginTop: "10px" }} onClick={() => downloadFile("between-reminders.ics", buildICS(us, today), "text/calendar")}>Add reminders to my phone’s calendar</button>
        <p style={{ fontSize: "12.5px", color: "#7c3aed", textAlign: "center", margin: "6px 0 0" }}>Adds your daily check-in times and appointments, with gentle reminders.</p>
      </div>

      <div style={section}>
        <h3 style={sectionTitle}>Your data</h3>
        <p style={{ fontSize: "14px", color: "#581c87", lineHeight: 1.6, margin: "0 0 14px" }}>Only you can read your entries, sessions and plan. Download a copy any time.</p>
        <button style={{ ...S.ghost, width: "100%" }} onClick={onExport}>Download my data</button>
        <button style={{ ...S.ghost, width: "100%", marginTop: "10px" }} onClick={onImportClick}>Import a Second Wind backup</button>
      </div>

      <button onClick={onLogout} style={{ width: "100%", marginTop: "24px", padding: "14px", borderRadius: "12px", border: "1px solid #e9d5ff", background: "white", color: "#7c3aed", fontWeight: 500, fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
        <LogOut size={20} /> Log Out
      </button>
    </div>
  );
}
