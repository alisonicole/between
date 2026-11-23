export interface Entry {
  parseId: string;
  id: string;
  date: string; // YYYY-MM-DD
  text: string;
  prompt: string;
  timestamp: string; // ISO
  locked: boolean; // still encrypted by the old app
  isWelcomeEntry: boolean;
}

export interface Snapshot {
  parseId: string;
  id: string;
  sessionDate: string;
  timestamp: string;
  notes: string;
  prepNote: string;
  nextSteps: string;
  intention: string;
  avoiding: string[]; // my-mvp stores pattern insights here
  discussedTopics: string[];
  isExampleSnapshot: boolean;
  locked: boolean;
}

/** analyzeJournal's result, kept as my-mvp's `lastAnalysis`. */
export interface Analysis {
  themes: string[];
  avoiding: string[];
  questions: string[];
  sessionDate?: string;
  placeholder?: boolean;
}

/** analyzePatterns' result. Shapes vary by version of the cloud function, so fields are loose. */
export interface PatternsData {
  themes?: (string | { name?: string; mentionCount?: number; exampleWords?: string[] })[];
  contradictions?: Record<string, any>[];
  unfinishedThoughts?: Record<string, any>[];
  unfinished?: Record<string, any>[];
  wordAssociations?: Record<string, any>[];
  associations?: Record<string, any>[];
}

export interface NoteSummary { bullets: string[]; themes: string[] }
export interface Bookmark { parseId: string; text: string; date: string }
export interface Favorite { text: string; favoritedAt: string }
export interface MonthlySummary { monthKey: string; month: string; text: string }

/** The in-progress After form, saved as you type. */
export interface SessionDraft {
  sessionDate: string;
  notes: string;
  nextSteps: string;
  intention: string;
  checkedTopics: string[];
}
