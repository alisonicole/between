"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import Parse from "@/lib/parse";
import * as data from "@/lib/data";
import { requestAI } from "@/lib/ai";
import { getToday } from "@/lib/dates";
import { MIN_ENTRIES, PLACEHOLDER_PATTERNS } from "@/lib/patterns";
import type { Entry, SessionPrep, Snapshot } from "@/lib/types";
import { CaptureTab } from "./CaptureTab";
import { PrepTab } from "./PrepTab";
import { DuringTab } from "./DuringTab";

type Tab = "capture" | "prep" | "during";

const TABS: [Tab, string][] = [
  ["capture", "Capture your thoughts"],
  ["prep", "Prep for your session"],
  ["during", "Use during your session"],
];

export function BetweenApp({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>("capture");
  const [showArchive, setShowArchive] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [prep, setPrep] = useState<SessionPrep | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiOn, setAiOn] = useState(() => data.aiPatternsEnabled());
  const [error, setError] = useState("");

  const report = useCallback((e: unknown, fallback: string) => {
    console.error(e);
    setError(e instanceof Error && e.message ? e.message : fallback);
  }, []);

  /** Entries the model may read: not locked, not my-mvp's welcome entry. */
  const usableEntries = useMemo(() => entries.filter((e) => !e.locked && !e.isWelcomeEntry && e.text.trim()), [entries]);

  const reloadEntries = useCallback(async () => setEntries(await data.fetchEntries()), []);
  const reloadSnapshots = useCallback(async () => setSnapshots(await data.fetchSnapshots()), []);

  useEffect(() => {
    (async () => {
      try {
        const [e, s, p] = await Promise.all([data.fetchEntries(), data.fetchSnapshots(), data.fetchPrep()]);
        setEntries(e);
        setSnapshots(s);
        setPrep(p);
      } catch (err) {
        report(err, "Couldn't load your entries. Check your connection and refresh.");
      } finally {
        setLoaded(true);
      }
    })();
  }, [report]);

  const generate = useCallback(async () => {
    setError("");
    if (usableEntries.length < MIN_ENTRIES) {
      // Same as 1.0: placeholder text, no model call.
      setPrep((p) => ({
        ...PLACEHOLDER_PATTERNS,
        sessionDate: p?.sessionDate ?? getToday(),
        notes: p?.notes ?? "",
        nextSteps: p?.nextSteps ?? "",
        parseId: p?.parseId,
        placeholder: true,
      }));
      return;
    }
    if (!data.aiPatternsEnabled()) return; // Prep shows the consent card instead
    setAnalyzing(true);
    try {
      await requestAI("patterns", prep?.sessionDate);
      setPrep(await data.fetchPrep());
    } catch (err) {
      report(err, "Couldn't analyze your reflections. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }, [usableEntries.length, prep?.sessionDate, report]);

  // A saved placeholder is upgraded once there are enough entries and AI is on.
  const upgradedRef = useRef(false);
  useEffect(() => {
    if (!loaded || upgradedRef.current || !prep?.placeholder) return;
    if (usableEntries.length >= MIN_ENTRIES && aiOn && tab !== "capture") {
      upgradedRef.current = true;
      generate();
    }
  }, [loaded, prep?.placeholder, usableEntries.length, aiOn, tab, generate]);

  function openTab(t: Tab) {
    setTab(t);
    setError("");
    if (t !== "capture" && !prep && loaded) generate();
  }

  /**
   * Saves part of the prep. Saves run one at a time, always with the latest
   * full prep, so quick edits can't race or create two records.
   */
  const latestRef = useRef<SessionPrep | null>(prep);
  useEffect(() => { latestRef.current = prep; }, [prep]);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const updatePrep = useCallback(
    (fields: Partial<SessionPrep>) => {
      if (!latestRef.current) return;
      latestRef.current = { ...latestRef.current, ...fields };
      setPrep((p) => (p ? { ...p, ...fields } : p));
      saveChain.current = saveChain.current.then(async () => {
        try {
          const saved = await data.savePrep(latestRef.current!);
          if (latestRef.current) latestRef.current.parseId = saved.parseId;
        } catch (err) {
          report(err, "Couldn't save. Check your connection.");
        }
      });
    },
    [report],
  );

  async function refreshStarter() {
    setAnalyzing(true);
    setError("");
    try {
      // Finish pending saves first so the server keeps local edits.
      await saveChain.current;
      if (latestRef.current && !latestRef.current.parseId) await data.savePrep(latestRef.current);
      await requestAI("starter");
      setPrep(await data.fetchPrep());
    } catch (err) {
      report(err, "Couldn't refresh your Session Starter.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function turnOnAI() {
    try {
      await data.setAiPatterns(true);
      setAiOn(true);
      setAnalyzing(true);
      await requestAI("patterns", prep?.sessionDate);
      setPrep(await data.fetchPrep());
    } catch (err) {
      report(err, "Couldn't turn on AI Patterns.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function turnOffAI() {
    try {
      await data.setAiPatterns(false);
      setAiOn(false);
    } catch (err) {
      report(err, "Couldn't turn off AI Patterns.");
    }
  }

  async function startWithoutAI() {
    try {
      setPrep(
        await data.savePrep({
          themes: [], avoiding: [], questions: [],
          openingStatement: "I think what I'd like to talk about today is…",
          sessionDate: getToday(), notes: "", nextSteps: "",
        }),
      );
    } catch (err) {
      report(err, "Couldn't start your prep.");
    }
  }

  async function moveToArchive() {
    if (!prep) return;
    try {
      await saveChain.current;
      await data.archivePrep(latestRef.current ?? prep);
      await reloadSnapshots();
      setPrep(null);
      upgradedRef.current = false;
      setTab("capture");
      setShowArchive(true);
    } catch (err) {
      report(err, "Couldn't move this session to the Archive. Your notes are still here.");
    }
  }

  const lastSnapshot = snapshots.find((s) => !s.isExampleSnapshot) ?? null;
  const user = Parse.User.current();

  return (
    <div className="page">
      <div className="container">
        <div className="header">
          <div className="header-row">
            <div style={{ flex: 1 }} />
            <h1 className="wordmark">between</h1>
            <div className="header-side">
              <button className="logout" onClick={onSignOut} title="Log out">
                <LogOut size={18} />
                <span className="desktop-only">Log out</span>
              </button>
            </div>
          </div>
          <p className="tagline">Capture what comes up between sessions and bring it into the room</p>
        </div>

        <div className="tabs" role="tablist">
          {TABS.map(([t, label]) => (
            <button key={t} role="tab" aria-selected={tab === t} className={`tab${tab === t ? " active" : ""}`} onClick={() => openTab(t)}>
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="error-banner" role="alert" style={{ marginBottom: 16 }}>
            <span>{error}</span>
            <button onClick={() => setError("")} aria-label="Dismiss">×</button>
          </div>
        )}

        {tab === "capture" && (
          <CaptureTab
            entries={entries}
            snapshots={snapshots}
            showArchive={showArchive}
            setShowArchive={setShowArchive}
            reloadEntries={reloadEntries}
            reloadSnapshots={reloadSnapshots}
            onError={report}
            canUnlock={Boolean(user?.getUsername())}
          />
        )}

        {tab === "prep" && (
          <PrepTab
            lastSnapshot={lastSnapshot}
            prep={prep}
            analyzing={analyzing}
            aiOn={aiOn}
            usableCount={usableEntries.length}
            onGenerate={generate}
            onTurnOnAI={turnOnAI}
            onTurnOffAI={turnOffAI}
            onStartWithoutAI={startWithoutAI}
          />
        )}

        {tab === "during" && (
          <DuringTab
            prep={prep}
            analyzing={analyzing}
            canRefresh={aiOn && usableEntries.length > 0}
            onGoToPrep={() => openTab("prep")}
            onChange={updatePrep}
            onRefreshStarter={refreshStarter}
            onMoveToArchive={moveToArchive}
          />
        )}
      </div>
    </div>
  );
}
