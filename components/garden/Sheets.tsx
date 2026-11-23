"use client";

/** Second Wind's sheets, ported with its wording, in Between's look. */
import React, { useEffect, useMemo, useState } from "react";
import {
  helpPeople, lines, MOODS, NEW_SEEDS, PLAN_SECTIONS, parsePerson, SMALL_THINGS,
  type Garden, type Letter, type PlanKey, type SafetyPlan,
} from "@/lib/garden";
import { BoxBreath } from "./Art";
import { S, fmtShortDate } from "../ui";

export type SheetKind =
  | { kind: "help" }
  | { kind: "plan" }
  | { kind: "breathe" }
  | { kind: "checkin"; slot: "am" | "pm" }
  | { kind: "letter"; letter: Letter };

const serif: React.CSSProperties = { fontFamily: "var(--font-serif)" };
const h2: React.CSSProperties = { ...serif, fontSize: "26px", fontWeight: 400, color: "#581c87", margin: "0 0 6px" };
const lead: React.CSSProperties = { fontSize: "14px", color: "#7c3aed", margin: "0 0 14px", lineHeight: 1.5 };
const softBtn: React.CSSProperties = { flex: 1, padding: "13px 16px", borderRadius: "100px", border: "none", background: "#f3e8ff", color: "#581c87", fontSize: "15px", fontWeight: 500, cursor: "pointer" };
const solidBtn: React.CSSProperties = { width: "100%", padding: "13px 16px", borderRadius: "100px", border: "none", background: "#9333ea", color: "white", fontSize: "15.5px", fontWeight: 500, cursor: "pointer" };

export function chip(on: boolean): React.CSSProperties {
  return { border: `1px solid ${on ? "#9333ea" : "#e9d5ff"}`, background: on ? "#9333ea" : "white", color: on ? "white" : "#581c87", borderRadius: "100px", padding: "9px 14px", fontSize: "14px", cursor: "pointer" };
}

// ---- Help now ----------------------------------------------------------------

export function CrisisLinks() {
  const dark: React.CSSProperties = { display: "block", width: "100%", textAlign: "left", background: "#581c87", color: "white", borderRadius: "14px", padding: "14px 16px", margin: "8px 0", textDecoration: "none" };
  const lite: React.CSSProperties = { ...dark, background: "#faf5ff", color: "#581c87", border: "1px solid #e9d5ff" };
  const b: React.CSSProperties = { display: "block", fontWeight: 600, fontSize: "16px" };
  const sp: React.CSSProperties = { fontSize: "13px", opacity: 0.85 };
  return (
    <>
      <a style={dark} href="tel:988"><b style={b}>Call 988</b><span style={sp}>Suicide &amp; Crisis Lifeline · 24/7 · dial 988</span></a>
      <a style={dark} href="sms:988"><b style={b}>Text 988</b><span style={sp}>Text with a trained counselor · text 988</span></a>
      <a style={lite} href="sms:741741&body=HOME"><b style={b}>Text HOME to 741741</b><span style={sp}>Crisis Text Line</span></a>
      <a style={lite} href="tel:911"><b style={b}>Call 911</b><span style={sp}>If you’re in immediate danger, or go to the nearest ER</span></a>
    </>
  );
}

export function HelpNow({ plan, open }: { plan: SafetyPlan; open: (s: SheetKind) => void }) {
  const people = helpPeople(plan);
  return (
    <div>
      <h2 style={h2}>You don’t have to do this alone.</h2>
      <p style={lead}>Reach out now. Any of these is a good choice.</p>
      <CrisisLinks />
      <div style={{ ...S.soft, padding: "16px 18px", margin: "12px 0" }}>
        <div style={{ ...serif, fontSize: "20px", color: "#581c87", marginBottom: "4px" }}>Your people</div>
        {people.length ? people.map((p, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: i < people.length - 1 ? "1px solid #f3e8ff" : "none", color: "#581c87" }}>
            <span>{p.name}</span>
            {p.tel && <a href={`tel:${p.tel}`} style={{ color: "#9333ea", textDecoration: "none", fontWeight: 500 }}>Call {p.phone}</a>}
          </div>
        )) : <p style={{ ...S.muted, margin: 0 }}>Add people in your plan to see them here.</p>}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button style={softBtn} onClick={() => open({ kind: "plan" })}>My safety plan</button>
        <button style={softBtn} onClick={() => open({ kind: "breathe" })}>Breathe with me</button>
      </div>
    </div>
  );
}

// ---- Safety plan -------------------------------------------------------------

export function PlanSections({ plan }: { plan: SafetyPlan }) {
  return (
    <div>
      {PLAN_SECTIONS.map(([k, label], i) => {
        const items = lines(plan[k]);
        const people = k === "help" || k === "pros";
        return (
          <div key={k} style={{ margin: "14px 0 4px" }}>
            <h4 style={{ margin: "0 0 6px", fontWeight: 500, fontSize: "13px", letterSpacing: "0.05em", textTransform: "uppercase", color: "#7c3aed" }}>
              <span style={{ ...serif, color: "#9333ea", fontSize: "18px", marginRight: "6px" }}>{i + 1}</span>{label}
            </h4>
            {items.length ? (
              <ul style={{ margin: 0, paddingLeft: "20px", color: "#581c87" }}>
                {items.map((x, j) => {
                  if (!people) return <li key={j} style={{ margin: "3px 0" }}>{x}</li>;
                  const p = parsePerson(x);
                  return <li key={j} style={{ margin: "3px 0" }}>{p.name}{p.tel && <> · <a href={`tel:${p.tel}`} style={{ color: "#9333ea" }}>{p.phone}</a></>}</li>;
                })}
              </ul>
            ) : <p style={{ ...S.muted, margin: 0 }}>Not filled in yet.</p>}
          </div>
        );
      })}
    </div>
  );
}

export function PlanSheet({ plan, open }: { plan: SafetyPlan; open: (s: SheetKind) => void }) {
  return (
    <div>
      <h2 style={h2}>My safety plan</h2>
      <p style={{ ...S.muted, margin: 0 }}>Take it one step at a time, in order.</p>
      <PlanSections plan={plan} />
      <hr style={{ border: "none", borderTop: "1px solid #f3e8ff", margin: "18px 0" }} />
      <button style={solidBtn} onClick={() => open({ kind: "breathe" })}>Breathe with me</button>
      <div style={{ height: 8 }} />
      <button style={{ ...softBtn, width: "100%" }} onClick={() => open({ kind: "help" })}>Help now</button>
    </div>
  );
}

export function PlanForm({ plan, onChange }: { plan: SafetyPlan; onChange: (p: SafetyPlan) => void }) {
  return (
    <div>
      {PLAN_SECTIONS.map(([k, label, hint], i) => (
        <div key={k}>
          <label htmlFor={`pl-${k}`} style={{ display: "block", fontWeight: 500, fontSize: "14.5px", margin: "16px 0 6px", color: "#581c87" }}>
            <span style={{ ...serif, color: "#9333ea", fontSize: "17px" }}>{i + 1}</span>&nbsp; {label}
          </label>
          <textarea
            id={`pl-${k}`} value={plan[k]} placeholder={hint || "One per line"}
            onChange={(e) => onChange({ ...plan, [k as PlanKey]: e.target.value })}
            style={{ ...S.input, minHeight: "76px", resize: "vertical", fontSize: "15px" }}
          />
        </div>
      ))}
    </div>
  );
}

// ---- Breathing ---------------------------------------------------------------

export function Breathe({ open, onDone }: { open: (s: SheetKind) => void; onDone: () => void }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setT((x) => x + 1), 1000);
    return () => clearInterval(iv);
  }, []);
  const phases = ["Breathe in", "Hold", "Breathe out", "Pause"];
  return (
    <div>
      <h2 style={h2}>Box breathing</h2>
      <p style={{ ...S.muted, margin: 0 }}>Follow the line around the box. Three or four rounds is plenty.</p>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 0" }}>
        <BoxBreath />
        <div aria-live="polite" style={{ ...serif, fontSize: "28px", color: "#581c87", marginTop: "6px", minHeight: "40px" }}>
          {phases[Math.floor(t / 4) % 4]} · {4 - (t % 4)}
        </div>
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button style={softBtn} onClick={() => open({ kind: "help" })}>Help now</button>
        <button style={{ ...solidBtn, flex: 1, width: "auto" }} onClick={onDone}>I’m done</button>
      </div>
    </div>
  );
}

// ---- Check-in ----------------------------------------------------------------

export interface CheckinApi {
  garden: Garden;
  today: string;
  toggleBasic: (id: string) => void;
  addJar: (text: string) => void;
  record: (slot: "am" | "pm", ci: { mood: number | null; small: string | null }) => void;
  open: (s: SheetKind) => void;
  close: () => void;
}

function pickN<T>(a: T[], n: number): T[] {
  const c = a.slice();
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c.slice(0, n);
}

export function CheckIn({ slot, api }: { slot: "am" | "pm"; api: CheckinApi }) {
  const steps = slot === "am" ? ["mood", "basics", "small", "close"] : ["basics", "good", "mood", "close"];
  const basics = slot === "am" ? ["water", "meds", "dressed"] : ["meds", "shower", "outside", "ate"];
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<number | null>(null);
  const [small, setSmall] = useState<string | null>(null);
  const [own, setOwn] = useState("");
  const [good, setGood] = useState("");
  const [recorded, setRecorded] = useState(false);
  const options = useMemo(() => pickN(SMALL_THINGS, 5), []);
  const k = steps[step];
  const mine = api.garden.plants.filter((p) => basics.includes(p.id));
  const next = () => {
    if (k === "small" && own.trim()) setSmall(own.trim());
    if (k === "good" && good.trim()) api.addJar(good.trim());
    setStep((s) => s + 1);
  };

  useEffect(() => {
    if (k === "close" && !recorded) {
      api.record(slot, { mood, small: k === "close" ? (own.trim() || small) : small });
      setRecorded(true);
    }
  }, [k, recorded, api, slot, mood, small, own]);

  if (k === "mood") return (
    <div>
      <h2 style={h2}>{slot === "am" ? "How are you arriving today?" : "How was today?"}</h2>
      <p style={{ ...S.muted, margin: 0 }}>There’s no wrong answer.</p>
      <div style={{ display: "flex", gap: "8px", margin: "14px 0" }}>
        {MOODS.map(([n, l]) => (
          <button key={n} aria-pressed={mood === n} onClick={() => setMood(n)} style={{ flex: 1, border: `1px solid ${mood === n ? "#9333ea" : "#e9d5ff"}`, background: mood === n ? "#f3e8ff" : "white", borderRadius: "14px", padding: "12px 2px", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", fontSize: "11.5px", color: "#581c87", cursor: "pointer" }}>
            <span style={{ ...serif, fontSize: "24px", lineHeight: 1 }}>{n}</span>{l}
          </button>
        ))}
      </div>
      <button style={{ ...solidBtn, ...(mood ? {} : { opacity: 0.4, cursor: "not-allowed" }) }} disabled={!mood} onClick={next}>Continue</button>
    </div>
  );

  if (k === "basics") return (
    <div>
      <h2 style={h2}>{slot === "am" ? "A few basics" : "Tending the greenhouse"}</h2>
      <p style={{ ...S.muted, margin: 0 }}>Tap what you’ve done. Anything left can wait.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "12px 0" }}>
        {mine.length ? mine.map((p) => {
          const on = p.tends.includes(api.today);
          return <button key={p.id} aria-pressed={on} style={chip(on)} onClick={() => api.toggleBasic(p.id)}>{p.icon} {p.name}</button>;
        }) : <span style={S.muted}>No basics planted for now.</span>}
      </div>
      <button style={solidBtn} onClick={next}>Continue</button>
    </div>
  );

  if (k === "small") return (
    <div>
      <h2 style={h2}>One small thing for today</h2>
      <p style={{ ...S.muted, margin: 0 }}>Pick one, or write your own. Small is the point.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "12px 0" }}>
        {options.map((o) => <button key={o} aria-pressed={small === o} style={chip(small === o)} onClick={() => setSmall(o)}>{o}</button>)}
      </div>
      <input style={S.input} placeholder="Something else" value={own} onChange={(e) => setOwn(e.target.value)} />
      <button style={{ ...solidBtn, marginTop: "14px" }} onClick={next}>Continue</button>
    </div>
  );

  if (k === "good") return (
    <div>
      <h2 style={h2}>One thing that happened today</h2>
      <p style={{ ...S.muted, margin: 0 }}>However small. It goes in your Good stuff jar.</p>
      <textarea style={{ ...S.input, minHeight: "76px", marginTop: "12px" }} placeholder="I made tea. I went outside. I texted Maria." value={good} onChange={(e) => setGood(e.target.value)} />
      <button style={{ ...solidBtn, marginTop: "14px" }} onClick={next}>Continue</button>
    </div>
  );

  // close
  const hard = mood !== null && mood <= 2;
  const chosen = own.trim() || small;
  if (hard) return (
    <div>
      <h2 style={h2}>I’m sorry today {slot === "am" ? "is" : "was"} hard.</h2>
      <p style={{ color: "#581c87" }}>This is temporary. Let’s take it one step at a time, starting with your plan.</p>
      <p style={{ fontSize: "13.5px", color: "#581c87" }}>If you’re thinking about hurting yourself, call or text <a href="tel:988" style={{ color: "#9333ea", fontWeight: 600 }}>988</a> now. You can also reach your people below.</p>
      <div style={{ ...S.soft, padding: "4px 18px 12px", margin: "12px 0" }}><PlanSections plan={api.garden.plan} /></div>
      <CrisisLinks />
      <button style={{ ...softBtn, width: "100%", marginTop: "6px" }} onClick={() => api.open({ kind: "breathe" })}>Breathe with me</button>
      <p style={{ ...S.muted, marginTop: "16px" }}>You showed up on a hard day. A winter bloom is growing in your greenhouse.</p>
      <button style={solidBtn} onClick={api.close}>Back to my greenhouse</button>
    </div>
  );
  return (
    <div>
      <h2 style={{ ...h2, marginTop: "6px" }}>{slot === "am" ? "One step at a time." : "Thank you for tending today."}</h2>
      <p style={{ ...serif, fontSize: "20px", color: "#581c87", lineHeight: 1.35, margin: "14px 0" }}>
        {slot === "am" ? (chosen ? `Today’s small thing: ${chosen}.` : "Go gently today.") : "Rest well. I’ll see you in the morning."}
      </p>
      <button style={solidBtn} onClick={api.close}>Done</button>
    </div>
  );
}

// ---- Bird letters ------------------------------------------------------------

export function LetterSheet({ letter, bird, garden, onKeep, onPlant }: {
  letter: Letter; bird: string; garden: Garden; onKeep: () => void; onPlant: (seedId: string) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const paper: React.CSSProperties = { background: "#FFFCF7", border: "1px solid #e9d5ff", borderRadius: "6px", padding: "26px 22px", boxShadow: "0 8px 30px rgba(88,28,135,.08)", ...serif, fontSize: "21px", lineHeight: 1.4, color: "#581c87", margin: "10px 0 16px" };
  const from = <div style={{ fontFamily: "var(--font-sans)", fontSize: "12.5px", color: "#7c3aed", marginTop: "14px" }}>— {bird || "your bird"}</div>;
  if (letter.type === "seed") {
    const avail = NEW_SEEDS.filter((s) => !garden.plants.some((p) => p.id === s.id)).slice(0, 6);
    return (
      <div>
        <div style={paper}>I found a seed packet on the wind. Ready to plant something new? Only if it feels right.{from}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "12px 0" }}>
          {avail.map((s) => <button key={s.id} aria-pressed={sel === s.id} style={chip(sel === s.id)} onClick={() => setSel(s.id)}>{s.icon} {s.name}</button>)}
        </div>
        <button style={{ ...solidBtn, ...(sel ? {} : { opacity: 0.4 }) }} disabled={!sel} onClick={() => sel && onPlant(sel)}>Plant it</button>
        <div style={{ textAlign: "center" }}><button onClick={onKeep} style={{ background: "none", border: "none", color: "#7c3aed", textDecoration: "underline", padding: "8px", fontSize: "14px", cursor: "pointer" }}>Not yet</button></div>
      </div>
    );
  }
  return (
    <div>
      <div style={paper}>
        {letter.type === "milestone" && letter.text}
        {letter.type === "quote" && (<div style={{ fontStyle: "italic", fontSize: "20px" }}>“{letter.q[0]}”<small style={{ display: "block", fontStyle: "normal", fontFamily: "var(--font-sans)", fontSize: "12.5px", color: "#7c3aed", marginTop: "6px" }}>{letter.q[1]}</small></div>)}
        {letter.type === "jar" && (<>I found this in your jar. You wrote it on {fmtShortDate(letter.item.date)}:<br /><br /><i>“{letter.item.text}”</i></>)}
        {from}
      </div>
      <button style={solidBtn} onClick={onKeep}>Keep it</button>
    </div>
  );
}
