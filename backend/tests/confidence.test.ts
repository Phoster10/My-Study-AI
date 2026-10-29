import { describe, it, expect } from "vitest";
import { fuseConfidence, computeManualReviewFlags } from "../src/grading/confidence.js";

describe("fuseConfidence", () => {
  it("averages by configured weight when all signals are present", () => {
    const score = fuseConfidence({ embeddingScore: 1, aiConfidence: 1, fuzzyScore: 1, keywordCoverage: 1 });
    expect(score).toBeCloseTo(1);
  });

  it("re-normalizes weights when some signals are missing", () => {
    const score = fuseConfidence({ aiConfidence: 0.9 });
    expect(score).toBeCloseTo(0.9);
  });

  it("returns 0 when no signals are available", () => {
    expect(fuseConfidence({})).toBe(0);
  });
});

describe("computeManualReviewFlags", () => {
  it("flags low confidence for manual review", () => {
    const { needsReview, reasons } = computeManualReviewFlags({
      confidence: 0.3,
      contradictions: [],
      stuffingDetected: false,
      gradingError: false,
    });
    expect(needsReview).toBe(true);
    expect(reasons.length).toBeGreaterThan(0);
  });

  it("does not flag a confident, clean result", () => {
    const { needsReview } = computeManualReviewFlags({
      confidence: 0.95,
      contradictions: [],
      stuffingDetected: false,
      gradingError: false,
    });
    expect(needsReview).toBe(false);
  });

  it("flags a contradiction even at high confidence", () => {
    const { needsReview, reasons } = computeManualReviewFlags({
      confidence: 0.95,
      contradictions: ["negates correct answer"],
      stuffingDetected: false,
      gradingError: false,
    });
    expect(needsReview).toBe(true);
    expect(reasons.some((r) => /contradiction/i.test(r))).toBe(true);
  });
});
