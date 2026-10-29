import { describe, it, expect } from "vitest";
import { isMCQQuestion, gradeMCQ } from "../src/grading/mcq.js";

describe("isMCQQuestion", () => {
  it("detects an options map as MCQ", () => {
    expect(isMCQQuestion("What is the capital of France?", { A: "Paris", B: "Rome" })).toBe(true);
  });

  it("detects MCQ phrasing without an options map", () => {
    expect(isMCQQuestion("Which of these is a mammal?")).toBe(true);
  });

  it("treats a plain open question as not MCQ", () => {
    expect(isMCQQuestion("Explain how photosynthesis works.")).toBe(false);
  });
});

describe("gradeMCQ", () => {
  it("grades a correct letter answer", () => {
    const result = gradeMCQ("A", "A");
    expect(result.correct).toBe(true);
    expect(result.confidence).toBe(1);
  });

  it("grades an incorrect letter answer with an explanation", () => {
    const result = gradeMCQ("B", "A");
    expect(result.correct).toBe(false);
    expect(result.explanation).toMatch(/correct was A/i);
  });

  it("matches by option text when the student typed the answer out", () => {
    const result = gradeMCQ("Paris", "A", { A: "Paris", B: "Rome" });
    expect(result.correct).toBe(true);
  });

  it("falls back to AI for genuinely ambiguous input", () => {
    const result = gradeMCQ("maybe C or D?", "A", { A: "Paris", B: "Rome", C: "Berlin", D: "Madrid" });
    expect(result.confidence).toBe(0);
  });
});
