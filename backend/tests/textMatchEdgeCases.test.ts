import { describe, it, expect } from "vitest";
import { safeContainmentCheck, validateConcepts, keywordEvidence, detectAnswerStuffing } from "../src/grading/textMatch.js";

const C = "mitochondria is the powerhouse of the cell";

describe("safeContainmentCheck edge cases", () => {
  it("accepts a correct phrase with modest extra detail", () => {
    expect(safeContainmentCheck(`${C} and it makes energy`, C).verdict).toBe("CORRECT");
  });

  it("asks for verification when the correct phrase is buried in a lot of extra claims", () => {
    const padded = `${C} ` + "and also many other separate unrelated claims about several different topics ".repeat(3);
    const r = safeContainmentCheck(padded, C);
    expect(r.verdict).toBe("NEEDS_VERIFICATION");
    expect(r.confidence).toBeLessThan(0.97);
  });

  it("accepts an answer that is most of the correct answer", () => {
    expect(safeContainmentCheck("mitochondria is the powerhouse of the", C).verdict).toBe("CORRECT");
  });

  it("asks for verification when the answer is only a tiny fragment", () => {
    expect(safeContainmentCheck("cell", C).verdict).toBe("NEEDS_VERIFICATION");
  });
});

describe("validateConcepts", () => {
  it("drops concepts the LLM hallucinated that appear in neither answer", () => {
    const out = validateConcepts(["mitochondria", "quantum"], "the mitochondria makes energy", C);
    expect(out).toContain("mitochondria");
    expect(out).not.toContain("quantum");
  });
});

describe("other edge cases", () => {
  it("keywordEvidence returns zero coverage when the correct answer has no keywords", () => {
    expect(keywordEvidence("anything", "the a of")).toEqual({ matchedConcepts: [], missingConcepts: [], coverage: 0 });
  });

  it("detectAnswerStuffing tolerates empty input", () => {
    expect(detectAnswerStuffing("", "answer").detected).toBe(false);
  });
});
