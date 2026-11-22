import { STARTER_PREFIX } from "./archive";
import type { Patterns } from "./types";

export const MIN_ENTRIES = 3;
export const DEFAULT_STARTER = `${STARTER_PREFIX}…`;

/** What 1.0 showed with fewer than 3 entries. Never sent to the model. */
export const PLACEHOLDER_PATTERNS: Patterns = {
  themes: ["Add at least 3 journal entries to see patterns"],
  avoiding: ["Begin your journaling journey"],
  questions: ["What would you like to explore?"],
  openingStatement: `${STARTER_PREFIX} just getting started.`,
};

// Prompts are 1.0's, word for word.
export function buildPatternsPrompt(texts: string[]): string {
  return `Based on these journal entries:\n${texts.join("\n\n")}\n\nReturn JSON ONLY:\n{\n  "themes": ["..."],\n  "avoiding": ["..."],\n  "questions": ["..."],\n  "openingStatement": "I think what I'd like to talk about today is..."\n}\n\nRules:\n- Use the user's words.\n- Be specific.\n- Avoid diagnosis or advice.\n- openingStatement must start with: "I think what I'd like to talk about today is"`;
}

export function buildStarterPrompt(texts: string[]): string {
  return `Based on these journal entries:\n${texts.join("\n\n")}\n\nCreate a conversational opening statement that:\n- Sounds natural\n- Uses the user's vocabulary\n- Is 15 seconds or less\n- MUST start with: "I think what I'd like to talk about today is"\n- Gets straight to a main theme\n- Never invents topics\n\nReturn ONLY the opening statement.`;
}

function stripQuotes(s: string): string {
  return s.trim().replace(/^["'“]|["'”]$/g, "");
}

function stringList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
}

/** Parses the model's reply. Tolerates code fences and text around the JSON. */
export function parsePatterns(raw: string | null | undefined): Patterns | null {
  if (!raw) return null;
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
  const stmt = typeof parsed.openingStatement === "string" ? stripQuotes(parsed.openingStatement) : "";
  return {
    themes: stringList(parsed.themes),
    avoiding: stringList(parsed.avoiding),
    questions: stringList(parsed.questions),
    openingStatement: stmt || DEFAULT_STARTER,
  };
}

export function cleanStarter(raw: string | null | undefined): string | null {
  const s = stripQuotes(raw ?? "");
  return s || null;
}
