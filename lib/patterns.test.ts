import { describe, it, expect } from "vitest";
import { buildPatternsPrompt, cleanStarter, DEFAULT_STARTER, parsePatterns } from "./patterns";

describe("parsePatterns", () => {
  it("parses fenced JSON", () => {
    const raw = '```json\n{"themes":["work"],"avoiding":["mom"],"questions":["why?"],"openingStatement":"\\"I think what I\'d like to talk about today is work.\\""}\n```';
    expect(parsePatterns(raw)).toEqual({
      themes: ["work"], avoiding: ["mom"], questions: ["why?"],
      openingStatement: "I think what I'd like to talk about today is work.",
    });
  });
  it("tolerates text around the JSON and fills a default starter", () => {
    const out = parsePatterns('Sure! {"themes":["a"],"avoiding":[],"questions":[]} Hope that helps');
    expect(out?.themes).toEqual(["a"]);
    expect(out?.openingStatement).toBe(DEFAULT_STARTER);
  });
  it("returns null for junk", () => {
    expect(parsePatterns("not json")).toBeNull();
    expect(parsePatterns(null)).toBeNull();
  });
  it("drops non-string list items", () => {
    expect(parsePatterns('{"themes":["a",3,null,""]}')?.themes).toEqual(["a"]);
  });
});

describe("prompts", () => {
  it("keeps 1.0's rules", () => {
    const p = buildPatternsPrompt(["one", "two"]);
    expect(p).toContain("one\n\ntwo");
    expect(p).toContain("Avoid diagnosis or advice.");
  });
  it("cleanStarter strips quotes and rejects empty", () => {
    expect(cleanStarter('"I think what I\'d like to talk about today is x"')).toBe("I think what I'd like to talk about today is x");
    expect(cleanStarter("  ")).toBeNull();
  });
});
