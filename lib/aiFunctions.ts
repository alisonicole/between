/** The Back4App Cloud Code functions my-mvp used for AI. Nothing else can be called through /api/ai. */
export const AI_FUNCTIONS = [
  "analyzeJournal",
  "analyzePatterns",
  "summarizeSessionNotes",
  "generateMonthlySummary",
  "getEngagementMessage",
] as const;
export type AIFunction = (typeof AI_FUNCTIONS)[number];
