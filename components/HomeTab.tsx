"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { daysBetween, isMorning, upcomingAppts } from "@/lib/garden";
import type { MonthlySummary } from "@/lib/types";
import type { UserState } from "@/lib/userState";
import { AppointmentBanner, CheckinCard } from "./GreenhouseTab";
import type { SheetKind } from "./garden/Sheets";

export type Go = (tab: "home" | "journal" | "greenhouse" | "sessions" | "you", view?: string) => void;

export function HomeTab({ name, us, today, intention, monthly, onCheckIntention, go, open }: {
  name: string;
  us: UserState;
  today: string;
  intention: string;
  monthly: { loading: boolean; error: string | null; summary: MonthlySummary | null; monthLabel: string };
  onCheckIntention: () => void;
  go: Go;
  open: (s: SheetKind) => void;
}) {
  const isFirstOfMonth = new Date().getDate() === 1;
  const [open1, setOpen1] = useState(isFirstOfMonth);
  const showMonthly = monthly.loading || monthly.summary || monthly.error;
  const showToggle = !isFirstOfMonth && !monthly.loading && !monthly.error;
  const bodyVisible = !showToggle || open1;
  const label = (monthly.summary?.month || monthly.monthLabel).split(" ")[0];
  const checkedIn = us.intentionCheckins.includes(today);
  const slot = isMorning(new Date().getHours()) ? "am" : "pm";
  const nextAp = upcomingAppts(us.appts, today)[0];
  const soon = nextAp && daysBetween(today, nextAp.date) <= 1;

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "24px 24px 0", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "24px", fontWeight: 500, color: "#581c87", margin: 0 }}>Hi {name} 👋</h2>
      </div>

      {soon && <AppointmentBanner appt={nextAp} today={today} />}

      {showMonthly && (
        <div style={{ background: "rgba(255,255,255,0.7)", border: "1px solid #e9d5ff", borderRadius: "20px", overflow: "hidden" }}>
          {showToggle ? (
            <button onClick={() => setOpen1((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              <div style={{ fontSize: "16px", fontWeight: 500, color: "#581c87", fontFamily: "var(--font-serif)" }}>Your {label}</div>
              <ChevronDown size={18} style={{ color: "#9333ea", flexShrink: 0, transition: "transform 0.2s", transform: open1 ? "rotate(180deg)" : "rotate(0deg)" }} />
            </button>
          ) : (
            <div style={{ padding: "18px 22px 0" }}>
              <div style={{ fontSize: "20px", fontWeight: 500, color: "#581c87", fontFamily: "var(--font-serif)", marginBottom: "14px" }}>Your {label}</div>
            </div>
          )}
          {bodyVisible && (
            <div style={{ padding: "0 22px 20px" }}>
              {monthly.loading ? (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#9ca3af", fontSize: "14px", fontStyle: "italic", padding: "8px 0" }}>
                  <Loader2 size={14} className="animate-spin" /> Writing your summary…
                </div>
              ) : monthly.error ? (
                <div style={{ fontSize: "13px", color: "#dc2626", lineHeight: 1.5, padding: "4px 0" }}>Could not load summary: {monthly.error}</div>
              ) : (
                <div style={{ fontSize: "14px", color: "#581c87", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{monthly.summary?.text}</div>
              )}
            </div>
          )}
        </div>
      )}

      {intention && (
        <div style={{ background: "rgba(255,255,255,0.7)", border: "1px solid #e9d5ff", borderRadius: "16px", padding: "16px 20px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#9333ea", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Intention of the Week</div>
          <p style={{ fontSize: "15px", color: "#581c87", margin: "0 0 12px 0", lineHeight: 1.5, fontStyle: "italic" }}>{intention}</p>
          {checkedIn ? (
            <div style={{ fontSize: "12px", color: "#9333ea", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}><span>✓</span> Reflected on today</div>
          ) : (
            <button onClick={onCheckIntention} style={{ padding: "6px 14px", borderRadius: "20px", border: "1px solid #e9d5ff", background: "none", color: "#7c3aed", fontSize: "12px", fontWeight: 500, cursor: "pointer" }}>✓ I reflected on this today</button>
          )}
        </div>
      )}

      {us.gardenOnboarded ? (
        <CheckinCard slot={slot} done={Boolean(us.checkins[today]?.[slot])} onBegin={() => open({ kind: "checkin", slot })} />
      ) : (
        <button onClick={() => go("greenhouse")} style={{ background: "rgba(255,255,255,0.7)", border: "1px solid #e9d5ff", borderRadius: "16px", padding: "16px 20px", textAlign: "left", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#9333ea" }}>🌱 Start your greenhouse</div>
            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>Daily basics, gentle check-ins, and your safety plan</div>
          </div>
          <ChevronRight size={16} style={{ color: "#c4b5fd", flexShrink: 0 }} />
        </button>
      )}

      <div style={{ background: "rgba(255,255,255,0.7)", border: "1px solid #e9d5ff", borderRadius: "16px", overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f3e8ff" }}>
          <span style={{ fontSize: "11px", fontWeight: 600, color: "#9333ea", textTransform: "uppercase", letterSpacing: "0.5px" }}>What do you want to do today?</span>
        </div>
        {[
          { label: "Capture a Thought", subtitle: "Something on your mind?", action: () => go("journal", "write"), primary: true },
          { label: "Prep for Session", subtitle: "Organize your thoughts before your session", action: () => go("sessions", "prep"), primary: false },
          { label: "Reflect on Session", subtitle: "How did your session go?", action: () => go("sessions", "after"), primary: false },
          { label: "View All Thoughts", subtitle: "Review what you've captured", action: () => go("journal", "log"), primary: false },
        ].map(({ label: l, subtitle, action, primary }, idx, arr) => (
          <button key={l} onClick={action} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", border: "none", background: "none", cursor: "pointer", borderBottom: idx < arr.length - 1 ? "1px solid #f3e8ff" : "none", textAlign: "left" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: primary ? 600 : 500, color: primary ? "#9333ea" : "#581c87" }}>{l}</div>
              <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>{subtitle}</div>
            </div>
            <ChevronRight size={16} style={{ color: "#c4b5fd", flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </div>
  );
}
