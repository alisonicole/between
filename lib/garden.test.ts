import { describe, it, expect } from "vitest";
import {
  addSeed, blankGarden, buildICS, fromSecondWindBackup, helpPeople, markShowedUp, parsePerson, pendingLetter,
  planIsUsable, plantSeeds, recordCheckin, stageOf, summarizeSince, toggleRest, toggleTend, type Garden,
} from "./garden";

const T = "2026-11-22";
const seeded = (): Garden => ({ ...plantSeeds(blankGarden(), ["water", "meds"]), gardenStart: "2026-11-01" });

describe("growth", () => {
  it("tending grows a plant and never shrinks it across days", () => {
    let g = seeded();
    g = toggleTend(g, "water", "2026-11-20").garden;
    g = toggleTend(g, "water", "2026-11-21").garden;
    expect(stageOf(g.plants[0])).toBe(1);
    g = toggleTend(g, "water", T).garden;
    expect(stageOf(g.plants[0])).toBe(2);
  });
  it("a second tap the same day untends, and says nothing", () => {
    let g = seeded();
    g = toggleTend(g, "water", T).garden;
    const r = toggleTend(g, "water", T);
    expect(r.garden.plants[0].tends).toEqual([]);
    expect(r.message).toBeNull();
  });
  it("announces growth", () => {
    const r = toggleTend(seeded(), "water", T);
    expect(r.message).toBe("Your water grew a little.");
  });
  it("rest days count as care, but not on a day already tended", () => {
    let g = seeded();
    const r = toggleRest(g, "meds", T);
    expect(r.message).toBe("Rest counts as tending.");
    expect(stageOf(r.garden.plants[1])).toBe(1);
    g = toggleTend(g, "meds", T).garden;
    expect(toggleRest(g, "meds", T).garden).toBe(g);
  });
  it("does not mutate the input", () => {
    const g = seeded();
    toggleTend(g, "water", T);
    expect(g.plants[0].tends).toEqual([]);
  });
});

describe("check-ins", () => {
  it("a mood of 1 or 2 grows a winter bloom, once per day", () => {
    let g = recordCheckin(seeded(), T, "am", { mood: 2, small: null }, 1);
    g = recordCheckin(g, T, "pm", { mood: 1, small: null }, 2);
    expect(g.hardy).toEqual([T]);
    expect(g.checkins[T].am?.mood).toBe(2);
    expect(g.checkins[T].pm?.mood).toBe(1);
  });
  it("summarizes the time since the last session for Prep", () => {
    let g = recordCheckin(seeded(), "2026-11-10", "am", { mood: 5, small: null }, 1);
    g = recordCheckin(g, "2026-11-20", "am", { mood: 2, small: null }, 1);
    g = recordCheckin(g, "2026-11-21", "pm", { mood: 4, small: null }, 1);
    g = toggleTend(g, "water", "2026-11-21").garden;
    const s = summarizeSince(g, "2026-11-18", T);
    expect(s).toEqual({ checkins: 2, averageMood: 3, hardDays: 1, daysTended: 1, moods: [{ date: "2026-11-20", mood: 2 }, { date: "2026-11-21", mood: 4 }] });
  });
});

describe("letters", () => {
  it("brings the 3-day milestone first", () => {
    let g = seeded();
    ["2026-11-20", "2026-11-21", T].forEach((d) => (g = markShowedUp(g, d)));
    expect(pendingLetter(g, T)).toEqual({ type: "milestone", key: "m3", text: "Three days in your greenhouse. Something is taking root." });
  });
  it("offers a seed after the first week, and nothing twice in a day", () => {
    const g = { ...seeded(), seen: ["m3"], days: ["a", "b", "c"] };
    expect(pendingLetter(g, T)).toEqual({ type: "seed", key: "w3" });
    expect(pendingLetter({ ...g, birdSeen: { [T]: true } }, T)).toBeNull();
  });
  it("adds a new seed once", () => {
    const g = addSeed(seeded(), "pottery");
    expect(g.plants.map((p) => p.id)).toEqual(["water", "meds", "pottery"]);
    expect(addSeed(g, "pottery")).toBe(g);
  });
});

describe("safety plan", () => {
  it("parses people the same way as Second Wind", () => {
    expect(parsePerson("Maria, 555-123-4567")).toEqual({ name: "Maria", phone: "555-123-4567", tel: "5551234567" });
    expect(parsePerson("Dr. Lee")).toEqual({ name: "Dr. Lee", phone: "", tel: "" });
  });
  it("lists helpers and professionals, but not 988 twice", () => {
    const plan = { ...blankGarden().plan, help: "Mom, 555 111 2222", pros: "988 Suicide & Crisis Lifeline, 988\nDr. Kim, 212-555-0100" };
    expect(helpPeople(plan).map((p) => p.name)).toEqual(["Mom", "Dr. Kim"]);
  });
  it("needs a coping step and a person", () => {
    expect(planIsUsable(blankGarden().plan)).toBe(false);
    expect(planIsUsable({ ...blankGarden().plan, coping: "Walk" })).toBe(true);
  });
});

describe("reminders and import", () => {
  it("builds a calendar with daily check-ins and upcoming appointments only", () => {
    const g = { ...seeded(), appts: [
      { id: 1, what: "Therapy, weekly", date: "2026-11-25", time: "15:00", where: "", note: "Ask about sleep" },
      { id: 2, what: "Old", date: "2026-11-01", time: "", where: "", note: "" },
    ] };
    const ics = buildICS(g, T, new Date("2026-11-22T12:00:00Z"));
    expect(ics).toContain("RRULE:FREQ=DAILY");
    expect(ics).toContain("DTSTART:20261125T150000");
    expect(ics).toContain("SUMMARY:Therapy\\, weekly");
    expect(ics).not.toContain("SUMMARY:Old");
  });
  it("imports a Second Wind backup and rejects other files", () => {
    const backup = { onboarded: true, name: "Alison", bird: "Wren", startDate: "2026-11-10", plants: [{ id: "water", name: "water", icon: "💧", color: "#7FA7B8", tends: ["2026-11-11"] }], plan: { coping: "Walk" }, jar: [{ date: "2026-11-12", text: "Tea" }] };
    const { garden, name } = fromSecondWindBackup(backup);
    expect(name).toBe("Alison");
    expect(garden.plants[0].rests).toEqual([]);
    expect(garden.plan.coping).toBe("Walk");
    expect(garden.plan.pros).toBe("988 Suicide & Crisis Lifeline, 988");
    expect(garden.times).toEqual({ am: "08:30", pm: "20:30" });
    expect(() => fromSecondWindBackup({ hello: 1 })).toThrow();
  });
});
