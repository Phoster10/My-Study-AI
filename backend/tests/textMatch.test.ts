import { describe, it, expect } from "vitest";
import {
  diceCoefficient,
  fuzzyMatch,
  keywordEvidence,
  contradictionCheck,
  detectAnswerStuffing,
  safeContainmentCheck,
} from "../src/grading/textMatch.js";

describe("diceCoefficient", () => {
  it("is 1 for identical strings", () => {
    expect(diceCoefficient("mitochondria", "mitochondria")).toBe(1);
  });

  it("is close to 1 for a near-identical spelling", () => {
    expect(diceCoefficient("mitochondrea", "mitochondria")).toBeGreaterThan(0.8);
  });

  it("is low for unrelated strings", () => {
    expect(diceCoefficient("mitochondria", "photosynthesis")).toBeLessThan(0.4);
  });
});

describe("fuzzyMatch", () => {
  it("matches a minor typo above threshold", () => {
    const { matched } = fuzzyMatch("The mitochondrea is the powerhouse", "The mitochondria is the powerhouse");
    expect(matched).toBe(true);
  });
});

describe("keywordEvidence", () => {
  it("reports full coverage when all keywords are present", () => {
    const { coverage } = keywordEvidence("mitochondria powerhouse cell energy", "mitochondria is the powerhouse of the cell");
    expect(coverage).toBeGreaterThan(0.9);
  });

  it("reports partial coverage when some keywords are missing", () => {
    const { coverage, missingConcepts } = keywordEvidence("mitochondria", "mitochondria is the powerhouse of the cell");
    expect(coverage).toBeLessThan(1);
    expect(missingConcepts.length).toBeGreaterThan(0);
  });
});

describe("contradictionCheck", () => {
  it("flags a direct negation of the correct concept", () => {
    const { hasContradiction } = contradictionCheck("The mitochondria is not the powerhouse of the cell", "mitochondria is the powerhouse of the cell");
    expect(hasContradiction).toBe(true);
  });

  it("does not flag an answer with no negation", () => {
    const { hasContradiction } = contradictionCheck("The mitochondria is the powerhouse of the cell", "mitochondria is the powerhouse of the cell");
    expect(hasContradiction).toBe(false);
  });
});

describe("detectAnswerStuffing", () => {
  it("does not flag a normally-sized, relevant answer", () => {
    const result = detectAnswerStuffing("Mitochondria produce ATP via oxidative phosphorylation.", "Mitochondria produce ATP");
    expect(result.detected).toBe(false);
  });

  it("flags a very long, low-relevance answer", () => {
    const noise = "banana zebra umbrella galaxy sandwich rocket ".repeat(10);
    const result = detectAnswerStuffing(noise, "Mitochondria produce ATP");
    expect(result.detected).toBe(true);
  });
});

describe("safeContainmentCheck", () => {
  it("accepts the correct answer as a substring of a longer answer", () => {
    const result = safeContainmentCheck("mitochondria is the powerhouse of the cell", "mitochondria is the powerhouse of the cell");
    expect(result.verdict).toBe("CORRECT");
  });

  it("returns NO_MATCH for unrelated text", () => {
    const result = safeContainmentCheck("completely unrelated answer", "mitochondria is the powerhouse of the cell");
    expect(result.verdict).toBe("NO_MATCH");
  });
});
