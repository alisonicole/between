"use client";

import React, { useRef, useState } from "react";
import {
  daysBetween, fromSecondWindBackup, greeting, isMorning, pendingLetter, planIsUsable, QUOTES, STARTER,
  stageOf, tendedToday, upcomingAppts, type Appointment, type Garden, type Plant,
} from "@/lib/garden";
import { Bird, GreenhouseFrame, PlantArt, WinterBloom } from "./garden/Art";
import { chip, PlanForm, type SheetKind } from "./garden/Sheets";
import { S, fmtShortDate, fmtTime } from "./ui";

export interface GardenApi {
  garden: Garden;
  today: string;
  name: string;
  update: (fn: (g: Garden) => Garden, toast?: string | null) => void;
  tend: (id: string) => void;
  rest: (id: string) => void;
  open: (s: SheetKind) => void;
  toast: (t: string) => void;
  importBackup: (g: Garden, name: string) => void;
}

const serif: React.CSSProperties = { fontFamily: "var(--font-serif)" };

export function PlantTile({ plant, today, onTend, onRest }: { plant: Plant; today: string; onTend: () => void; onRest: () => void }) {
  const t = tendedToday(plant, today), rest = (plant.rests || []).includes(today);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const long = useRef(false);
  const [drop, setDrop] = useState(0);
  const start = () => { long.current = false; timer.current = setTimeout(() => { long.current = true; onRest(); }, 550); };
  const end = () => clearTimeout(timer.current);
  return (
    <button
      className={`plant${t ? "" : " dormant"}`}
      aria-label={`${plant.name}${t ? " — tended today" : ""}`}
      data-plant={plant.id}
      onPointerDown={start} onPointerUp={end} onPointerLeave={end} onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (long.current) { long.current = false; return; }
        if (!plant.tends.includes(today)) setDrop((d) => d + 1);
        onTend();
      }}
    >
      {drop > 0 && <span key={drop} className="drop go" />}
      <PlantArt plant={plant} />
      <span className="name">{plant.icon} {plant.name}</span>
      <span className="state">{rest ? "resting today" : t ? "tended today" : ""}</span>
    </button>
  );
}

export function GreenhouseTab({ api, onImportClick }: { api: GardenApi; onImportClick: () => void }) {
  const { garden: g, today } = api;
  if (!g.gardenOnboarded) return <GardenSetup api={api} onImportClick={onImportClick} />;

  const hour = new Date().getHours();
  const n = g.days.length, season = Math.min(n, 90);
  const slot = isMorning(hour) ? "am" : "pm";
  const done = Boolean(g.checkins[today]?.[slot]);
  const nextAp = upcomingAppts(g.appts, today)[0];
  const soon = nextAp && daysBetween(today, nextAp.date) <= 1;
  const q = QUOTES[Math.max(0, n - 1) % QUOTES.length];
  const letter = pendingLetter(g, today);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "8px 8px 0", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h2 style={{ ...serif, fontSize: "30px", fontWeight: 400, color: "#581c87", margin: 0 }}>{greeting(hour, api.name)}.</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
          <span style={{ fontSize: "13px", color: "#7c3aed", whiteSpace: "nowrap" }}>Day {n} of your first season</span>
          <span style={{ flex: 1, height: "4px", background: "#ede9fe", borderRadius: "4px", overflow: "hidden" }}>
            <i style={{ display: "block", height: "100%", width: `${(season / 90) * 100}%`, background: "#9333ea", borderRadius: "4px", transition: "width 1s ease" }} />
          </span>
        </div>
      </div>

      {soon && <AppointmentBanner appt={nextAp} today={today} />}

      <div className="greenhouse">
        <GreenhouseFrame />
        {letter && (
          <button className="bird-wrap arrive" aria-label={`${g.bird || "Your bird"} brought you a letter`} onClick={() => api.open({ kind: "letter", letter })}>
            <Bird /><span className="envelope" />
          </button>
        )}
        <div className="plants">
          {g.plants.map((p) => <PlantTile key={p.id} plant={p} today={today} onTend={() => api.tend(p.id)} onRest={() => api.rest(p.id)} />)}
        </div>
        {g.hardy.length > 0 && (
          <div className="hardy">
            {g.hardy.map((d) => <WinterBloom key={d} />)}
            <span>{g.hardy.length === 1 ? "A winter bloom" : `${g.hardy.length} winter blooms`}, grown on hard days you showed up for.</span>
          </div>
        )}
      </div>
      <p style={{ fontSize: "13px", color: "#7c3aed", textAlign: "center", margin: 0 }}>Tap a plant when you’ve done it. Press and hold for a rest day.</p>

      <CheckinCard slot={slot} done={done} onBegin={() => api.open({ kind: "checkin", slot })} />

      {nextAp && !soon && (
        <div style={{ ...S.soft, padding: "16px 20px" }}>
          <div style={{ fontSize: "12px", color: "#7c3aed" }}>Next appointment</div>
          <div style={{ ...serif, fontSize: "20px", color: "#581c87" }}>{nextAp.what}</div>
          <div style={{ fontSize: "13px", color: "#581c87" }}>{fmtShortDate(nextAp.date)}{nextAp.time ? ` · ${fmtTime(nextAp.time)}` : ""}</div>
        </div>
      )}

      <Jar api={api} />

      <div style={{ ...S.soft, padding: "18px 20px" }}>
        <div style={{ ...serif, fontStyle: "italic", fontSize: "20px", lineHeight: 1.35, color: "#581c87" }}>
          “{q[0]}”<small style={{ display: "block", fontStyle: "normal", fontFamily: "var(--font-sans)", fontSize: "12.5px", color: "#7c3aed", marginTop: "6px" }}>{q[1]}</small>
        </div>
      </div>
    </div>
  );
}

export function CheckinCard({ slot, done, onBegin }: { slot: "am" | "pm"; done: boolean; onBegin: () => void }) {
  return (
    <div style={{ ...S.soft, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
      <div>
        <div style={{ ...serif, fontSize: "21px", color: "#581c87" }}>{slot === "am" ? "Morning check-in" : "Evening check-in"}</div>
        <div style={{ fontSize: "13px", color: "#7c3aed" }}>{done ? "Done. Thank you for showing up." : "About two minutes."}</div>
      </div>
      <button onClick={onBegin} style={{ ...S.pill, padding: "10px 20px", fontSize: "14px", ...(done ? { background: "#f3e8ff", color: "#581c87" } : {}) }}>{done ? "Again" : "Begin"}</button>
    </div>
  );
}

export function AppointmentBanner({ appt, today }: { appt: Appointment; today: string }) {
  return (
    <div style={{ background: "#ede9fe", borderRadius: "12px", padding: "10px 14px", fontSize: "13.5px", color: "#581c87" }}>
      <b style={{ fontWeight: 600 }}>{daysBetween(today, appt.date) === 0 ? "Today" : "Tomorrow"}:</b> {appt.what}{appt.time ? ` at ${fmtTime(appt.time)}` : ""}
    </div>
  );
}

function Jar({ api }: { api: GardenApi }) {
  const [text, setText] = useState("");
  const jar = api.garden.jar;
  return (
    <div style={{ ...S.soft, padding: "18px 20px" }}>
      <div style={{ ...serif, fontSize: "22px", color: "#581c87" }}>The good stuff</div>
      <p style={{ fontSize: "13px", color: "#7c3aed", margin: "2px 0 12px" }}>Small good things, kept somewhere safe.</p>
      <textarea style={{ ...S.input, minHeight: "64px", resize: "vertical" }} placeholder="Something good, however small" value={text} onChange={(e) => setText(e.target.value)} />
      <button
        style={{ ...S.primary, width: "100%", marginTop: "10px", ...(text.trim() ? {} : { opacity: 0.5, cursor: "not-allowed" }) }}
        disabled={!text.trim()}
        onClick={() => { api.update((g) => ({ ...g, jar: [{ date: api.today, text: text.trim() }, ...g.jar] }), "Kept."); setText(""); }}
      >
        Add to the jar
      </button>
      {jar.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "14px" }}>
          {jar.map((j, i) => (
            <div key={i} style={{ padding: "10px 14px", background: "rgba(237,233,254,0.5)", borderRadius: "10px", border: "1px solid rgba(147,51,234,0.1)" }}>
              <div style={{ fontSize: "12px", color: "#7c3aed" }}>{fmtShortDate(j.date)}</div>
              <div style={{ ...serif, fontSize: "19px", color: "#581c87" }}>{j.text}</div>
            </div>
          ))}
        </div>
      ) : <p style={{ ...S.muted, textAlign: "center", marginTop: "14px" }}>Your jar is waiting for its first good thing.</p>}
    </div>
  );
}

// ---- First-time setup (Second Wind's onboarding, minus the parts Between already has) ----

const SETUP_STEPS = 6;

function GardenSetup({ api, onImportClick }: { api: GardenApi; onImportClick: () => void }) {
  const [step, setStep] = useState(0);
  const [seeds, setSeeds] = useState<string[]>(STARTER.map((p) => p.id));
  const [plan, setPlan] = useState(api.garden.plan);
  const [planErr, setPlanErr] = useState("");
  const [times, setTimes] = useState(api.garden.times);
  const [appt, setAppt] = useState({ what: "", date: "", time: "", where: "" });
  const [bird, setBird] = useState(api.garden.bird);
  const [watered, setWatered] = useState(false);
  const g = api.garden;

  const wrap = (inner: React.ReactNode, actions: React.ReactNode) => (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "8px" }}>
      <div style={{ ...S.glass, padding: "28px" }}>
        <div style={{ display: "flex", gap: "5px", marginBottom: "8px" }}>
          {Array.from({ length: SETUP_STEPS }, (_, i) => <i key={i} style={{ height: "3px", flex: 1, borderRadius: "3px", background: i <= step ? "#9333ea" : "#ede9fe" }} />)}
        </div>
        <div style={{ fontSize: "12.5px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#7c3aed", marginBottom: "18px" }}>Step {step + 1} of {SETUP_STEPS}</div>
        {inner}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "center", marginTop: "20px" }}>{actions}</div>
      </div>
    </div>
  );
  const h: React.CSSProperties = { ...serif, fontSize: "28px", fontWeight: 400, color: "#581c87", margin: 0 };
  const leadS: React.CSSProperties = { ...serif, fontSize: "21px", lineHeight: 1.35, color: "#581c87", margin: "14px 0" };
  const next = <button style={{ ...S.primary, width: "100%", borderRadius: "100px" }} onClick={() => setStep((s) => s + 1)}>Continue</button>;
  const link: React.CSSProperties = { background: "none", border: "none", color: "#7c3aed", textDecoration: "underline", padding: "8px", fontSize: "14px", cursor: "pointer" };

  switch (step) {
    case 0:
      return wrap(
        <>
          <h2 style={h}>Your greenhouse</h2>
          <p style={leadS}>A gentle place for the small things between appointments. It isn’t a therapist or a crisis line.</p>
          <p style={{ color: "#581c87", margin: "0 0 10px" }}>Each morning and evening, I’ll ask a few gentle questions. About two minutes each. If you miss a day, nothing bad happens: your plants rest and wait for you. Growth only adds up.</p>
          <p style={{ color: "#581c87", margin: 0 }}>If you ever need help right now, the <b style={{ fontWeight: 600 }}>Help now</b> button is always at the top of the screen.</p>
          <button style={{ ...S.ghost, width: "100%", marginTop: "14px", borderRadius: "100px" }} onClick={() => api.open({ kind: "help" })}>Open Help now</button>
        </>,
        <>{next}<button style={link} onClick={onImportClick}>I used Second Wind: import my backup</button></>,
      );
    case 1:
      return wrap(
        <>
          <h2 style={h}>Plant your seeds</h2>
          <p style={leadS}>Each seed is one small way of treating yourself well.</p>
          <p style={S.muted}>Plant all six, or start with fewer. You can add more later.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", margin: "12px 0" }}>
            {STARTER.map((p) => {
              const on = seeds.includes(p.id);
              return <button key={p.id} aria-pressed={on} style={chip(on)} onClick={() => setSeeds((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id]))}>{p.icon} {p.name}</button>;
            })}
          </div>
        </>,
        <button style={{ ...S.primary, width: "100%", borderRadius: "100px" }} onClick={() => {
          if (!seeds.length) { api.toast("Choose at least one seed."); return; }
          api.update((x) => ({ ...x, plants: STARTER.filter((p) => seeds.includes(p.id)).map((p) => ({ ...p, tends: [], rests: [] })) }));
          setStep(2);
        }}>Plant these</button>,
      );
    case 2:
      return wrap(
        <>
          <h2 style={h}>Keep your plan close</h2>
          <p style={leadS}>Did your care team give you a safety plan? Let’s keep it here, so it’s always with you.</p>
          <p style={S.muted}>If you don’t have one yet, that’s okay. Let’s start one together, and finish it with your care team. One item per line.</p>
          <PlanForm plan={plan} onChange={setPlan} />
          {planErr && <p style={{ fontSize: "12.5px", color: "#b91c1c", marginTop: "8px" }}>{planErr}</p>}
        </>,
        <>
          <button style={{ ...S.primary, width: "100%", borderRadius: "100px" }} onClick={() => {
            if (!planIsUsable(plan)) { setPlanErr("To keep you safe, please add at least one thing you can do on your own (step 4) and one person or professional you can reach (step 6 or 7). You can fill in the rest later."); return; }
            api.update((x) => ({ ...x, plan }));
            setStep(3);
          }}>Keep my plan here</button>
          <button style={link} onClick={() => { api.update((x) => ({ ...x, plan })); setStep(3); }}>I’ll finish this later</button>
        </>,
      );
    case 3:
      return wrap(
        <>
          <h2 style={h}>Your care and your times</h2>
          <p style={leadS}>When should I check in with you?</p>
          <div style={{ display: "flex", gap: "10px" }}>
            <label style={{ flex: 1, fontSize: "14px", color: "#581c87" }}>Morning<input type="time" style={{ ...S.input, marginTop: "6px" }} value={times.am} onChange={(e) => setTimes({ ...times, am: e.target.value })} /></label>
            <label style={{ flex: 1, fontSize: "14px", color: "#581c87" }}>Evening<input type="time" style={{ ...S.input, marginTop: "6px" }} value={times.pm} onChange={(e) => setTimes({ ...times, pm: e.target.value })} /></label>
          </div>
          <hr style={{ border: "none", borderTop: "1px solid #f3e8ff", margin: "18px 0" }} />
          <div style={{ ...serif, fontSize: "20px", color: "#581c87" }}>Your next appointment</div>
          <p style={S.muted}>Optional. You can add more under My Sessions → Care.</p>
          <AppointmentFields value={appt} onChange={setAppt} />
        </>,
        <button style={{ ...S.primary, width: "100%", borderRadius: "100px" }} onClick={() => {
          api.update((x) => ({
            ...x,
            times: { am: times.am || "08:30", pm: times.pm || "20:30" },
            appts: appt.what && appt.date ? [...x.appts, { id: Date.now(), ...appt, note: "" }] : x.appts,
          }));
          setStep(4);
        }}>Continue</button>,
      );
    case 4:
      return wrap(
        <>
          <h2 style={h}>A visitor</h2>
          <p style={leadS}>Someone came to meet you.</p>
          <div style={{ display: "flex", justifyContent: "center", margin: "26px 0 30px" }}>
            <div style={{ transform: "scale(1.8)" }}><div className="bird-wrap arrive" style={{ position: "relative", top: 0, right: 0 }}><Bird /></div></div>
          </div>
          <p style={{ color: "#581c87" }}>This little bird arrives on the wind now and then. It brings letters, good news and seeds. It never needs anything from you.</p>
          <label htmlFor="ob-bird" style={{ display: "block", fontSize: "14.5px", margin: "16px 0 6px", color: "#581c87" }}>What would you like to name it?</label>
          <input id="ob-bird" style={S.input} placeholder="A name" value={bird} onChange={(e) => setBird(e.target.value)} />
        </>,
        <button style={{ ...S.primary, width: "100%", borderRadius: "100px" }} onClick={() => { api.update((x) => ({ ...x, bird: bird.trim() || "Wren" })); setStep(5); }}>Continue</button>,
      );
    default:
      return wrap(
        <>
          <h2 style={h}>Let’s water one together</h2>
          <p style={leadS}>Tap a plant to water it.</p>
          <div className="greenhouse" style={{ paddingTop: "22px" }}>
            <GreenhouseFrame />
            <div className="plants">
              {g.plants.slice(0, 3).map((p) => (
                <PlantTile key={p.id} plant={p} today={api.today} onRest={() => {}} onTend={() => {
                  if (tendedToday(p, api.today)) return;
                  api.update((x) => ({ ...x, plants: x.plants.map((q) => (q.id === p.id ? { ...q, tends: [...q.tends, api.today] } : q)) }));
                  setWatered(true);
                }} />
              ))}
            </div>
          </div>
          <p style={{ ...serif, fontSize: "20px", minHeight: "28px", color: "#581c87" }}>{watered ? "That’s one small way of treating yourself well." : ""}</p>
        </>,
        <button
          style={{ ...S.primary, width: "100%", borderRadius: "100px", ...(watered ? {} : { opacity: 0.4, cursor: "not-allowed" }) }}
          disabled={!watered}
          onClick={() => api.update((x) => ({ ...x, gardenOnboarded: true, gardenStart: api.today, birdDay: api.today, days: x.days.includes(api.today) ? x.days : [...x.days, api.today] }), "I’ll see you this evening.")}
        >
          That’s enough for today
        </button>,
      );
  }
}

export function AppointmentFields({ value, onChange }: { value: { what: string; date: string; time: string; where: string }; onChange: (v: { what: string; date: string; time: string; where: string }) => void }) {
  const lbl: React.CSSProperties = { display: "block", fontSize: "14px", color: "#581c87", margin: "12px 0 6px" };
  return (
    <div>
      <label style={lbl}>What<input style={{ ...S.input, marginTop: "6px" }} placeholder="e.g. DBT intake" value={value.what} onChange={(e) => onChange({ ...value, what: e.target.value })} /></label>
      <div style={{ display: "flex", gap: "10px" }}>
        <label style={{ ...lbl, flex: 1 }}>Date<input type="date" style={{ ...S.input, marginTop: "6px" }} value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value })} /></label>
        <label style={{ ...lbl, flex: 1 }}>Time<input type="time" style={{ ...S.input, marginTop: "6px" }} value={value.time} onChange={(e) => onChange({ ...value, time: e.target.value })} /></label>
      </div>
      <label style={lbl}>Where or phone (optional)<input style={{ ...S.input, marginTop: "6px" }} value={value.where} onChange={(e) => onChange({ ...value, where: e.target.value })} /></label>
    </div>
  );
}

/** Reads a Second Wind backup file chosen by the user. */
export async function readBackupFile(file: File) {
  return fromSecondWindBackup(JSON.parse(await file.text()));
}

export { stageOf };
