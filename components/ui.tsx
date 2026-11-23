"use client";

import React, { useEffect, useState } from "react";

/** my-mvp's recurring inline styles, named. Values are copied from its App.jsx. */
export const S = {
  glass: { background: "rgba(255,255,255,0.7)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: "24px", padding: "32px", boxShadow: "0 10px 40px rgba(0,0,0,0.1)" } as React.CSSProperties,
  soft: { background: "rgba(255,255,255,0.7)", border: "1px solid #e9d5ff", borderRadius: "16px" } as React.CSSProperties,
  prep: { background: "rgba(255,255,255,0.7)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid #e9d5ff", borderRadius: "24px", padding: "28px 32px", boxShadow: "0 4px 16px rgba(147,51,234,0.06)" } as React.CSSProperties,
  label: { fontSize: "12px", fontWeight: 600, color: "#9333ea", textTransform: "uppercase", letterSpacing: "0.05em" } as React.CSSProperties,
  smallLabel: { fontSize: "11px", fontWeight: 600, color: "#9333ea", textTransform: "uppercase", letterSpacing: "0.5px" } as React.CSSProperties,
  faintLabel: { fontSize: "11px", fontWeight: 600, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px" } as React.CSSProperties,
  input: { width: "100%", padding: "12px 16px", borderRadius: "12px", border: "2px solid #e9d5ff", outline: "none", fontSize: "16px", background: "rgba(255,255,255,0.8)", color: "#581c87" } as React.CSSProperties,
  primary: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px 20px", borderRadius: "12px", border: "none", fontWeight: 500, fontSize: "16px", cursor: "pointer", background: "#9333ea", color: "white" } as React.CSSProperties,
  pill: { padding: "6px 14px", borderRadius: "20px", border: "none", background: "#9333ea", color: "white", fontSize: "12px", fontWeight: 500, cursor: "pointer" } as React.CSSProperties,
  ghostPill: { padding: "6px 14px", borderRadius: "20px", border: "1px solid #e9d5ff", background: "transparent", color: "#7c3aed", fontSize: "12px", fontWeight: 500, cursor: "pointer" } as React.CSSProperties,
  ghost: { padding: "12px 20px", borderRadius: "12px", border: "1px solid #e9d5ff", background: "white", color: "#7c3aed", fontWeight: 500, fontSize: "15px", cursor: "pointer" } as React.CSSProperties,
  h2: { fontSize: "24px", fontWeight: 300, color: "#581c87", marginBottom: "12px" } as React.CSSProperties,
  body: { fontSize: "14px", color: "#581c87", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 } as React.CSSProperties,
  muted: { fontSize: "13px", color: "#9ca3af" } as React.CSSProperties,
  bigCenter: { background: "rgba(255,255,255,0.7)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: "24px", padding: "48px", boxShadow: "0 10px 40px rgba(0,0,0,0.1)", textAlign: "center" } as React.CSSProperties,
  bigButton: { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "16px 32px", borderRadius: "12px", border: "none", fontWeight: 500, fontSize: "16px", cursor: "pointer", background: "#9333ea", color: "white", boxShadow: "0 4px 12px rgba(147,51,234,0.3)" } as React.CSSProperties,
};

export function disabledStyle(on: boolean): React.CSSProperties {
  return on ? {} : { background: "#d1d5db", opacity: 0.5, cursor: "not-allowed" };
}

export function LockNote({ text = "Your data is private and secure." }: { text?: string }) {
  return (
    <div style={{ marginTop: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#6b7280", fontSize: "12px" }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      <span>{text}</span>
    </div>
  );
}

/** my-mvp's bottom sheet modal (white, rounded top), also used for Second Wind's sheets. */
export function Sheet({ onClose, children, label = "Dialog" }: { onClose: () => void; children: React.ReactNode; label?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 10000 }}>
      <div
        role="dialog" aria-modal="true" aria-label={label}
        onClick={(e) => e.stopPropagation()}
        style={{ background: "white", borderRadius: "24px 24px 0 0", padding: "20px 24px 40px", width: "100%", maxWidth: "600px", maxHeight: "88vh", overflowY: "auto", animation: "slideUp 0.3s ease-out" }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", fontSize: "24px", color: "#9ca3af", cursor: "pointer", padding: "4px", lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [text, onDone]);
  return (
    <div role="status" style={{ position: "fixed", left: "50%", bottom: "96px", transform: "translateX(-50%)", background: "#581c87", color: "white", padding: "10px 18px", borderRadius: "100px", fontSize: "14px", zIndex: 10001, whiteSpace: "nowrap", maxWidth: "92vw", overflow: "hidden", textOverflow: "ellipsis", boxShadow: "0 4px 16px rgba(88,28,135,0.3)" }}>
      {text}
    </div>
  );
}

export function ErrorBanner({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div role="alert" style={{ maxWidth: "600px", margin: "0 auto 16px", padding: "12px 14px", borderRadius: "12px", background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", fontSize: "14px", display: "flex", justifyContent: "space-between", gap: "12px" }}>
      <span>{text}</span>
      <button onClick={onClose} aria-label="Dismiss" style={{ background: "none", border: "none", color: "#991b1b", cursor: "pointer", fontSize: "16px", lineHeight: 1 }}>×</button>
    </div>
  );
}

/** my-mvp's EngagementMessage, unchanged. */
export function EngagementMessage({ message, type, onDismiss }: { message: string; type: string; onDismiss: () => void }) {
  const [visible, setVisible] = useState(true);
  const isMilestone = type === "entry5" || type === "sessionSnapshot";
  if (!visible || !message) return null;
  return (
    <div style={{ background: isMilestone ? "linear-gradient(135deg, #6B4C93 0%, #9B6BB5 100%)" : "linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)", border: isMilestone ? "1px solid rgba(255,255,255,0.2)" : "1px solid #ddd6fe", borderRadius: "16px", padding: "20px 24px", margin: "0 0 16px 0", color: isMilestone ? "#fff" : "#581c87", position: "relative" }}>
      {isMilestone && <div style={{ fontSize: "20px", marginBottom: "8px" }}>{type === "entry5" ? "✨" : "🌿"}</div>}
      <p style={{ margin: 0, fontSize: "15px", lineHeight: 1.6, fontStyle: "italic", color: isMilestone ? "#fff" : "#581c87", paddingRight: "20px" }}>{message}</p>
      <button onClick={() => { setVisible(false); onDismiss(); }} aria-label="Dismiss" style={{ position: "absolute", top: "12px", right: "16px", background: "none", border: "none", color: isMilestone ? "rgba(255,255,255,0.6)" : "#9ca3af", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: 0 }}>×</button>
    </div>
  );
}

export const formatDate = (d: string) =>
  new Date(d + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const formatLongDate = (d: string) =>
  new Date(d + "T12:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
export const fmtShortDate = (d: string) =>
  new Date(d + "T12:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
export function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** Saves a text file through the browser (calendar file, backups). */
export function downloadFile(name: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
