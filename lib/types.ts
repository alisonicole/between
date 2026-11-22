export interface Entry {
  parseId: string;
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  text: string;
  timestamp: string; // ISO
  locked: boolean; // still encrypted by the old app
  isWelcomeEntry?: boolean;
}

export interface Patterns {
  themes: string[];
  avoiding: string[];
  questions: string[];
  openingStatement: string;
}

export interface Snapshot extends Patterns {
  parseId: string;
  id: string;
  sessionDate: string;
  timestamp: string;
  notes: string;
  nextSteps: string;
  // Fields only my-mvp wrote; shown when present so nothing is hidden
  prepNote?: string;
  intention?: string;
  locked: boolean;
  isExampleSnapshot?: boolean;
}

/** The in-progress prep for the next session. Saved, so a reload keeps it. */
export interface SessionPrep extends Patterns {
  parseId?: string;
  sessionDate: string;
  notes: string;
  nextSteps: string;
  generatedAt?: string;
  placeholder?: boolean; // built from fewer than 3 entries, without the model
}
