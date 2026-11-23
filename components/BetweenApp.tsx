"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Calendar, Home, Sprout, User } from "lucide-react";
import Parse from "@/lib/parse";
import * as data from "@/lib/data";
import { callAI } from "@/lib/ai";
import { getToday } from "@/lib/dates";
import {
  entriesForAnalysis, entriesForPatterns, entryMilestone, fallbackName, lastSessionContext, MIN_ENTRIES,
  monthlySummaryTarget, patternInsights, PLACEHOLDER_ANALYSIS, realEntries, realHistory,
} from "@/lib/between";
import {
  addSeed, blankGarden, letterOpened, markShowedUp, recordCheckin, toggleRest, toggleTend,
  type Garden,
} from "@/lib/garden";
import { blankDraft, loadUserState, refreshUserState, saveUserState, type UserState } from "@/lib/userState";
import type { LogItem } from "@/lib/archive";
import type { Bookmark, Entry, MonthlySummary, NoteSummary, Snapshot } from "@/lib/types";
import { HomeTab } from "./HomeTab";
import { JournalTab, SnapshotFields, type JournalActions } from "./JournalTab";
import { GreenhouseTab, readBackupFile, type GardenApi } from "./GreenhouseTab";
import { SessionsTab, type SessionView, type SessionsApi } from "./SessionsTab";
import { YouTab } from "./YouTab";
import { Onboarding } from "./Onboarding";
import { Breathe, CheckIn, HelpNow, LetterSheet, PlanSheet, type SheetKind } from "./garden/Sheets";
import { ErrorBanner, Sheet, Toast, downloadFile, formatLongDate } from "./ui";

type Tab = "home" | "journal" | "greenhouse" | "sessions" | "you";
const GARDEN_KEYS = Object.keys(blankGarden()) as (keyof Garden)[];
const randomPick = (a: string[]) => a[Math.floor(Math.random() * a.length)];

export function BetweenApp({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [sessionView, setSessionView] = useState<SessionView>("prep");
  const [journalView, setJournalView] = useState<"write" | "log">("write");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [us, setUs] = useState<UserState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [modal, setModal] = useState<{ kind: "snapshot"; s: Snapshot } | { kind: "bookmark"; b: Bookmark } | { kind: "import"; garden: Garden; name: string } | null>(null);
  const [engagement, setEngagement] = useState<{ text: string; type: string } | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [patternsError, setPatternsError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [monthly, setMonthly] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [schedule, setSchedule] = useState<{ start: number } | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const usRef = useRef<UserState | null>(null);
  usRef.current = us;
  const today = getToday();
  const user = Parse.User.current();

  const report = useCallback((e: unknown, fallback: string) => {
    console.error(e);
    setError(e instanceof Error && e.message ? e.message : fallback);
  }, []);

  /** Optimistic: the screen updates at once, the save follows in order. */
  const save = useCallback(async (patch: Partial<UserState>) => {
    const base = usRef.current;
    if (!base) return;
    const next = { ...base, ...patch };
    usRef.current = next;
    setUs(next);
    try {
      await saveUserState(patch, base);
    } catch (e) {
      report(e, "Couldn't save. Check your connection.");
    }
  }, [report]);

  // ---- Load ------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const [e, s, st] = await Promise.all([data.fetchEntries(), data.fetchSnapshots(), loadUserState()]);
        const withWelcome = await data.ensureWelcomeEntry(e);
        setEntries(withWelcome);
        setHistory(s);
        const ready = st.gardenOnboarded ? { ...st, ...markShowedUp(st, getToday()) } : st;
        usRef.current = ready;
        setUs(ready);
        if (ready.days.length !== st.days.length) saveUserState({ days: ready.days }, st).catch(() => {});
      } catch (err) {
        console.error(err);
        setLoadError(err instanceof Error ? err.message : "Couldn't load your data.");
      }
    })();
  }, []);

  // Another device may have changed things while this one was in the background.
  useEffect(() => {
    const onVis = async () => {
      if (document.hidden) return;
      const fresh = await refreshUserState();
      if (fresh) { usRef.current = fresh; setUs(fresh); }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // my-mvp's install prompt: once per phone.
  useEffect(() => {
    try {
      const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const installed = window.matchMedia("(display-mode: standalone)").matches;
      if (mobile && !installed && !localStorage.getItem("hasSeenInstallPrompt")) {
        const t = setTimeout(() => setShowInstall(true), 3000);
        return () => clearTimeout(t);
      }
    } catch { /* storage blocked */ }
  }, []);

  const real = useMemo(() => realEntries(entries), [entries]);
  const reloadEntries = useCallback(async () => setEntries(await data.fetchEntries()), []);
  const reloadSnapshots = useCallback(async () => setHistory(await data.fetchSnapshots()), []);

  // ---- AI ----------------------------------------------------------------------
  const genAnalysis = useCallback(async () => {
    const st = usRef.current;
    if (!st) return;
    if (real.length < MIN_ENTRIES) {
      // my-mvp shows placeholder text and makes no AI call.
      const next = { ...st, lastAnalysis: { ...PLACEHOLDER_ANALYSIS, sessionDate: st.draft.sessionDate } };
      usRef.current = next; setUs(next);
      return;
    }
    if (!st.aiEnabled) return;
    setAnalysisLoading(true);
    try {
      const checked = st.draft.checkedTopics;
      const result = await callAI<{ themes?: string[]; avoiding?: string[]; questions?: string[] }>("analyzeJournal", {
        entries: entriesForAnalysis(entries, history),
        discussedTopics: checked.length ? checked : undefined,
        lastSessionContext: lastSessionContext(realHistory(history)[0]),
      });
      await save({
        lastAnalysis: { themes: result.themes || [], avoiding: result.avoiding || [], questions: result.questions || [], sessionDate: st.draft.sessionDate },
        draft: { ...usRef.current!.draft, checkedTopics: [] },
      });
    } catch (e) {
      report(e, "Couldn't analyze your reflections. Please try again.");
    } finally {
      setAnalysisLoading(false);
    }
  }, [real.length, entries, history, save, report]);
  const genAnalysisRef = useRef(genAnalysis);
  genAnalysisRef.current = genAnalysis;

  const loadPatterns = useCallback(async () => {
    if (!real.length) return;
    setPatternsLoading(true);
    setPatternsError(null);
    try {
      const result = await callAI("analyzePatterns", { entries: entriesForPatterns(entries, history) });
      await save({ patternsData: result, patternsLastEntryId: real[0].parseId });
    } catch (e) {
      setPatternsError(e instanceof Error ? e.message : String(e));
    } finally {
      setPatternsLoading(false);
    }
  }, [real, entries, history, save]);

  const summarize = useCallback(async (snaps: Snapshot[]) => {
    const st = usRef.current;
    if (!st?.aiEnabled) return;
    const todo = snaps.filter((s) => s.notes && !s.locked && s.parseId && st.sessionNotesSummary[s.parseId] === undefined);
    if (!todo.length) return;
    setSummaryLoading(true);
    const results = await Promise.all(todo.map(async (s) => {
      try {
        const r = await callAI<{ bullets?: string[]; themes?: string[] }>("summarizeSessionNotes", { notes: s.notes });
        return [s.parseId, { bullets: r?.bullets ?? [], themes: r?.themes ?? [] }] as const;
      } catch {
        return [s.parseId, { bullets: [], themes: [] }] as const;
      }
    }));
    setSummaryLoading(false);
    const merged: Record<string, NoteSummary> = { ...usRef.current!.sessionNotesSummary, ...Object.fromEntries(results) };
    await save({ sessionNotesSummary: merged });
  }, [save]);

  // Before: auto-analyze once; summarize the last session. Progress: summarize all.
  const autoRan = useRef(false);
  useEffect(() => {
    if (!us || tab !== "sessions") return;
    if (sessionView === "prep") {
      if (!us.lastAnalysis && !analysisLoading && real.length >= MIN_ENTRIES && us.aiEnabled && !autoRan.current) {
        autoRan.current = true;
        genAnalysis();
      }
      const last = realHistory(history)[0] ?? history[0];
      if (last) summarize([last]);
    }
    if (sessionView === "progress") summarize(realHistory(history));
  }, [tab, sessionView, history, us?.aiEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  // Home: last month's summary, once per month.
  const monthTarget = useMemo(() => monthlySummaryTarget(entries, new Date()), [entries]);
  useEffect(() => {
    const st = usRef.current;
    if (tab !== "home" || !st?.aiEnabled || monthly.loading) return;
    if (!monthTarget.entries.length || st.monthlySummary?.monthKey === monthTarget.monthKey) return;
    setMonthly({ loading: true, error: null });
    callAI<any>("generateMonthlySummary", { entries: monthTarget.entries, month: monthTarget.month })
      .then((r) => {
        const text = r?.summary || r?.text || r;
        const summary: MonthlySummary = { monthKey: monthTarget.monthKey, month: monthTarget.month, text: String(text) };
        return save({ monthlySummary: summary });
      })
      .then(() => setMonthly({ loading: false, error: null }))
      .catch((e) => setMonthly({ loading: false, error: e instanceof Error ? e.message : String(e) }));
  }, [tab, us?.aiEnabled, monthTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  const engage = useCallback(async (key: string, type: string, params: Record<string, unknown>) => {
    const st = usRef.current;
    if (!st?.aiEnabled || st.milestones.includes(key)) return;
    try {
      const r = await callAI<{ message?: string }>("getEngagementMessage", { type, ...params });
      await save({ milestones: [...usRef.current!.milestones, key] });
      if (r?.message) setEngagement({ text: r.message, type });
    } catch (e) {
      console.warn("Engagement message failed", e);
    }
  }, [save]);

  const afterEntrySaved = useCallback((all: Entry[]) => {
    const r = realEntries(all);
    const m = entryMilestone(r.length);
    if (!m) return;
    const n = { entry1: 1, entry2: 2, entry3: 3, entry5: 5 }[m];
    engage(m, m, { entries: r.slice(0, n).map((e) => ({ text: e.text, timestamp: e.timestamp })) });
  }, [engage]);

  // ---- Journal ------------------------------------------------------------------
  const journal: JournalActions = {
    saveEntry: async ({ date, text, prompt, bookmark }) => {
      try {
        const created = await data.createEntry({ date, text, prompt });
        const all = await data.fetchEntries();
        setEntries(all);
        if (bookmark) await save({ bookmarks: [...usRef.current!.bookmarks, { parseId: created.parseId, text, date }] });
        afterEntrySaved(all);
        return true;
      } catch (e) {
        report(e, "Couldn't save your entry. It's still here; please try again.");
        return false;
      }
    },
    updateEntry: async (parseId, patch) => {
      try {
        await data.updateEntry(parseId, patch);
        await reloadEntries();
        const st = usRef.current!;
        if (st.bookmarks.some((b) => b.parseId === parseId)) await save({ bookmarks: st.bookmarks.map((b) => (b.parseId === parseId ? { ...b, ...patch } : b)) });
      } catch (e) { report(e, "Couldn't save your changes. Please try again."); }
    },
    deleteItem: async (item: LogItem) => {
      try {
        if (item.type === "entry") {
          await data.deleteEntry(item.data.parseId);
          await reloadEntries();
          const st = usRef.current!;
          if (st.bookmarks.some((b) => b.parseId === item.data.parseId)) await save({ bookmarks: st.bookmarks.filter((b) => b.parseId !== item.data.parseId) });
        } else {
          await data.deleteSnapshot(item.data.parseId);
          await reloadSnapshots();
        }
      } catch (e) { report(e, "Couldn't delete that. Please try again."); }
    },
    toggleBookmark: (e) => {
      const st = usRef.current!;
      const on = st.bookmarks.some((b) => b.parseId === e.parseId);
      save({ bookmarks: on ? st.bookmarks.filter((b) => b.parseId !== e.parseId) : [...st.bookmarks, { parseId: e.parseId, text: e.text, date: e.date }] });
    },
    removeBookmark: (id) => save({ bookmarks: usRef.current!.bookmarks.filter((b) => b.parseId !== id) }),
    removeFavorite: (text) => save({ favoritedPatterns: usRef.current!.favoritedPatterns.filter((f) => f.text !== text) }),
    reloadAll: async () => { await reloadEntries(); await reloadSnapshots(); },
  };

  // ---- Sessions -----------------------------------------------------------------
  const logSession = useCallback(async () => {
    const st = usRef.current!;
    const d = st.draft;
    try {
      await data.createSnapshot({
        sessionDate: d.sessionDate || getToday(),
        notes: d.notes,
        prepNote: st.sessionPrepNote,
        nextSteps: d.nextSteps,
        intention: d.intention,
        avoiding: patternInsights(st.patternsData),
        discussedTopics: d.checkedTopics,
      });
      await reloadSnapshots();
      await save({ draft: blankDraft(), sessionPrepNote: "", keyTopics: [], patternsData: null, patternsLastEntryId: null });
      setTab("journal");
      setJournalView("log");
      engage(`sessionSnapshot_${getToday()}`, "sessionSnapshot", {
        entries: realEntries(entries).slice(0, 10).map((e) => ({ text: e.text, timestamp: e.timestamp })),
        prepNotes: d.notes,
      });
    } catch (e) {
      report(e, "Couldn't log this session. Your notes are still here.");
    }
  }, [entries, save, reloadSnapshots, engage, report]);

  // ---- Garden ---------------------------------------------------------------------
  const updateGarden = useCallback((fn: (g: Garden) => Garden, msg?: string | null) => {
    const st = usRef.current;
    if (!st) return;
    const next = fn(st);
    const patch: Partial<UserState> = {};
    for (const k of GARDEN_KEYS) if (next[k] !== st[k]) (patch as Record<string, unknown>)[k] = next[k];
    if (Object.keys(patch).length) save(patch);
    if (msg) setToast(msg);
  }, [save]);

  const open = useCallback((s: SheetKind) => setSheet(s), []);

  if (loadError) return <div style={{ padding: 32 }}><ErrorBanner text={`${loadError} Please refresh.`} onClose={() => setLoadError("")} /></div>;
  if (!us) return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#7c3aed" }}>Loading your space…</div>;

  const username = user?.getUsername() ?? "";
  const email = (user?.get("email") as string) || (username.includes("@") ? username : "");
  const name = us.displayName || fallbackName(email || username);
  const lastSnap = realHistory(history)[0] ?? history[0] ?? null;
  const go = (t: Tab, view?: string) => {
    setTab(t);
    if (t === "journal" && view) setJournalView(view as "write" | "log");
    if (t === "journal" && !view) setJournalView("write");
    if (t === "sessions") setSessionView((view as SessionView) || "prep");
    if (t === "greenhouse" && us.gardenOnboarded && !us.days.includes(today)) updateGarden((g) => markShowedUp(g, today));
    window.scrollTo(0, 0);
  };

  const gardenApi: GardenApi = {
    garden: us, today, name,
    update: updateGarden,
    tend: (id) => updateGarden((g) => { const r = toggleTend(g, id, today, randomPick); if (r.message) setToast(r.message); return r.garden; }),
    rest: (id) => updateGarden((g) => { const r = toggleRest(g, id, today); if (r.message) setToast(r.message); return r.garden; }),
    open, toast: setToast,
    importBackup: (g, n) => setModal({ kind: "import", garden: g, name: n }),
  };

  const sessionsApi: SessionsApi = {
    us, today, entries, history, analysisLoading, patternsLoading, patternsError, summaryLoading,
    genAnalysis, loadPatterns, save, logSession,
    openSnapshot: (s) => setModal({ kind: "snapshot", s }),
    openBookmark: (b) => setModal({ kind: "bookmark", b }),
    turnOnAI: async () => { await save({ aiEnabled: true }); autoRan.current = true; setTimeout(() => genAnalysisRef.current(), 0); },
  };

  const onImportFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      const { garden, name: n } = await readBackupFile(f);
      setModal({ kind: "import", garden, name: n });
    } catch (e) {
      report(e, "That file couldn’t be read.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const NAV: { id: Tab; label: string; Icon: typeof Home }[] = [
    { id: "home", label: "Home", Icon: Home },
    { id: "journal", label: "Journal", Icon: BookOpen },
    { id: "greenhouse", label: "Greenhouse", Icon: Sprout },
    { id: "sessions", label: "My Sessions", Icon: Calendar },
    { id: "you", label: "You", Icon: User },
  ];

  const showOnboarding = !us.onboardingComplete && real.length === 0 && realHistory(history).length === 0 && !entries.some((e) => e.locked);

  return (
    <div className="app-wrapper">
      <div className="main-container">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ width: "88px" }} />
          <div style={{ textAlign: "center", flex: 1 }}>
            <h1 style={{ fontSize: "22px", fontWeight: 300, color: "#581c87", margin: 0 }}>between</h1>
          </div>
          <div style={{ width: "88px", display: "flex", justifyContent: "flex-end" }}>
            <button className="help-pill" onClick={() => open({ kind: "help" })}>Help now</button>
          </div>
        </div>
        {tab === "home" && <p style={{ color: "#7c3aed", fontSize: "13px", margin: "-12px 0 20px", textAlign: "center" }}>Capture what comes up between sessions and bring it into the room</p>}

        {error && <ErrorBanner text={error} onClose={() => setError("")} />}

        <div style={{ paddingBottom: "100px" }}>
          {tab === "home" && (
            <HomeTab
              name={name} us={us} today={today} go={go} open={open}
              intention={lastSnap?.intention || us.draft.intention}
              monthly={{ ...monthly, summary: us.monthlySummary?.monthKey === monthTarget.monthKey ? us.monthlySummary : null, monthLabel: monthTarget.month }}
              onCheckIntention={() => save({ intentionCheckins: [...us.intentionCheckins, today] })}
            />
          )}
          {tab === "journal" && (
            <JournalTab view={journalView} setView={setJournalView} entries={entries} history={history} us={us}
              engagement={engagement} onDismissEngagement={() => setEngagement(null)} actions={journal} canUnlock={Boolean(username)} />
          )}
          {tab === "greenhouse" && <GreenhouseTab api={gardenApi} onImportClick={() => fileRef.current?.click()} />}
          {tab === "sessions" && <SessionsTab view={sessionView} setView={setSessionView} api={sessionsApi} />}
          {tab === "you" && (
            <YouTab us={us} today={today} email={email} memberSince={user?.createdAt} entryCount={entries.length} sessionCount={history.length}
              save={save} onEditSchedule={() => setSchedule({ start: 2 })} onLogout={onSignOut} open={open} toast={setToast}
              onImportClick={() => fileRef.current?.click()}
              onExport={() => downloadFile(`between-${today}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), entries, sessions: history, state: us }, null, 2), "application/json")} />
          )}
        </div>
      </div>

      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImportFile(e.target.files?.[0])} />

      <nav className="bottom-nav" aria-label="Main">
        <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", justifyContent: "space-around" }}>
          {NAV.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => go(id)} aria-current={active ? "page" : undefined}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "8px 2px", border: "none", cursor: "pointer", background: "none", color: active ? "#9333ea" : "#9ca3af" }}>
                <Icon size={22} />
                <span style={{ fontSize: "11px", fontWeight: active ? 600 : 400, whiteSpace: "nowrap" }}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {sheet && (
        <Sheet onClose={() => setSheet(null)} label={sheet.kind}>
          {sheet.kind === "help" && <HelpNow plan={us.plan} open={open} />}
          {sheet.kind === "plan" && <PlanSheet plan={us.plan} open={open} />}
          {sheet.kind === "breathe" && <Breathe open={open} onDone={() => setSheet(null)} />}
          {sheet.kind === "checkin" && (
            <CheckIn slot={sheet.slot} api={{
              garden: us, today, open, close: () => setSheet(null),
              toggleBasic: (id) => updateGarden((g) => {
                const p = g.plants.find((x) => x.id === id);
                if (!p) return g;
                const on = p.tends.includes(today);
                return { ...g, plants: g.plants.map((x) => (x.id === id ? { ...x, tends: on ? x.tends.filter((d) => d !== today) : [...x.tends, today], rests: on ? x.rests : x.rests.filter((d) => d !== today) } : x)) };
              }),
              addJar: (t) => updateGarden((g) => ({ ...g, jar: [{ date: today, text: t }, ...g.jar] })),
              record: (slot, ci) => updateGarden((g) => recordCheckin(g, today, slot, ci, Date.now())),
            }} />
          )}
          {sheet.kind === "letter" && (
            <LetterSheet letter={sheet.letter} bird={us.bird} garden={us}
              onKeep={() => { updateGarden((g) => letterOpened(g, sheet.letter.key, today)); setSheet(null); }}
              onPlant={(id) => { updateGarden((g) => letterOpened(addSeed(g, id), sheet.letter.key, today), "A new seed is in the soil."); setSheet(null); }} />
          )}
        </Sheet>
      )}

      {modal?.kind === "snapshot" && (
        <Sheet onClose={() => setModal(null)} label="Session">
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#9333ea", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Session</div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#581c87" }}>{formatLongDate(modal.s.sessionDate)}</div>
          <SnapshotFields s={modal.s} />
        </Sheet>
      )}
      {modal?.kind === "bookmark" && (
        <Sheet onClose={() => setModal(null)} label="Bookmarked entry">
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#9333ea", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Flagged journal entry</div>
          <div style={{ fontSize: "18px", fontWeight: 600, color: "#581c87", marginBottom: "20px" }}>{modal.b.date ? formatLongDate(modal.b.date) : "Journal Entry"}</div>
          <p style={{ fontSize: "15px", color: "#581c87", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>{modal.b.text}</p>
        </Sheet>
      )}
      {modal?.kind === "import" && (
        <Sheet onClose={() => setModal(null)} label="Import backup">
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "26px", fontWeight: 400, color: "#581c87", margin: "0 0 8px" }}>Bring in your Second Wind greenhouse?</h2>
          <p style={{ fontSize: "14px", color: "#581c87", lineHeight: 1.6 }}>
            This brings over {modal.garden.plants.length} plants, {Object.keys(modal.garden.checkins).length} days of check-ins, {modal.garden.jar.length} good things, {modal.garden.appts.length} appointments and your safety plan.
            {us.gardenOnboarded ? " It replaces the greenhouse you have here now." : ""}
          </p>
          <button style={{ width: "100%", padding: "13px", borderRadius: "100px", border: "none", background: "#9333ea", color: "white", fontSize: "15.5px", fontWeight: 500, cursor: "pointer" }} onClick={async () => {
            const g = { ...modal.garden, gardenOnboarded: true, gardenStart: modal.garden.gardenStart || today };
            const patch: Partial<UserState> = { ...g };
            if (!us.displayName && modal.name) patch.displayName = modal.name;
            await save(patch);
            setModal(null);
            setToast("Welcome back.");
            setTab("greenhouse");
          }}>Bring it in</button>
          <div style={{ textAlign: "center" }}><button onClick={() => setModal(null)} style={{ background: "none", border: "none", color: "#7c3aed", textDecoration: "underline", padding: "8px", cursor: "pointer" }}>Not now</button></div>
        </Sheet>
      )}

      {(showOnboarding || schedule) && (
        <Onboarding
          startStep={schedule?.start ?? 1}
          days0={us.sessionDays} time0={us.sessionTime}
          hasEntries={schedule ? true : real.length > 0}
          onSaveSchedule={(d, t) => save({ sessionDays: d, sessionTime: t })}
          onFinish={async (first) => {
            if (first.trim()) {
              try {
                await data.createEntry({ date: today, text: first.trim() });
                const all = await data.fetchEntries();
                setEntries(all);
                afterEntrySaved(all);
              } catch (e) { report(e, "Couldn't save your first entry."); }
            }
            if (!usRef.current?.onboardingComplete) await save({ onboardingComplete: true });
            setSchedule(null);
          }}
        />
      )}

      {showInstall && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "white", padding: "24px", boxShadow: "0 -4px 20px rgba(0,0,0,0.2)", zIndex: 9999, borderTopLeftRadius: "24px", borderTopRightRadius: "24px", animation: "slideUp 0.3s ease-out" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>📱</div>
            <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#581c87", marginBottom: "8px" }}>Add Between to Your Home Screen</h3>
            <p style={{ fontSize: "15px", color: "#7c3aed", marginBottom: "16px", lineHeight: 1.5 }}>Get quick access to your journal anytime</p>
            {/iPhone|iPad|iPod/i.test(navigator.userAgent) && (
              <div style={{ background: "#faf5ff", padding: "16px", borderRadius: "12px", textAlign: "left", fontSize: "14px", color: "#581c87", lineHeight: 1.6 }}>
                <p style={{ margin: "0 0 8px 0", fontWeight: 600 }}>How to install:</p>
                <p style={{ margin: "4px 0" }}>1. Tap the Share button ⬆️</p>
                <p style={{ margin: "4px 0" }}>2. Click &apos;...&apos; and tap &quot;Add to Home Screen&quot;</p>
                <p style={{ margin: "4px 0" }}>3. Tap &quot;Add&quot; in the top right</p>
              </div>
            )}
            <button onClick={() => { setShowInstall(false); try { localStorage.setItem("hasSeenInstallPrompt", "true"); } catch { /* ignore */ } }}
              style={{ marginTop: "16px", padding: "12px 24px", background: "transparent", border: "1px solid #e9d5ff", borderRadius: "12px", color: "#7c3aed", fontSize: "14px", fontWeight: 500, cursor: "pointer", width: "100%" }}>
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {toast && <Toast text={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
