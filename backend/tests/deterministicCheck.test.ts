import { describe, it, expect } from "vitest";
import { deterministicCheck } from "../src/grading/deterministicCheck.js";

const CORRECT = "mitochondria is the powerhouse of the cell";

describe("deterministicCheck", () => {
  it.each(["", "   ", "idk", "I don't know", "n/a", "?"])("marks blank/skip answer %j incorrect with full confidence", (answer) => {
    const r = deterministicCheck(answer, CORRECT);
    expect(r.verdict).toBe("INCORRECT");
    expect(r.confidence).toBe(1);
    expect(r.debug.gradingPath).toContain("blank_answer");
  });

  it("marks a negated answer incorrect via contradiction detection", () => {
    const r = deterministicCheck("The mitochondria is not the powerhouse of the cell", CORRECT);
    expect(r.verdict).toBe("INCORRECT");
    expect(r.contradictions.length).toBeGreaterThan(0);
  });

  it("accepts an exact match ignoring case and punctuation", () => {
    const r = deterministicCheck("Mitochondria is the powerhouse of the cell!", CORRECT);
    expect(r.verdict).toBe("CORRECT");
    expect(r.confidence).toBe(1);
    expect(r.debug.gradingPath).toContain("exact_match");
  });

  it("accepts an answer that contains the correct phrase", () => {
    const r = deterministicCheck("I think mitochondria is the powerhouse of the cell, yes", CORRECT);
    expect(r.verdict).toBe("CORRECT");
    expect(r.debug.gradingPath).toContain("containment_match");
  });

  it("accepts a near-identical answer via fuzzy match", () => {
    const r = deterministicCheck("mitochondrea is the powerhouse of the cel", CORRECT);
    expect(r.verdict).toBe("CORRECT");
    expect(r.debug.gradingPath).toContain("fuzzy_match");
  });

  it("defers a paraphrase to the AI and returns keyword evidence", () => {
    const r = deterministicCheck("the organelle that generates cellular energy", CORRECT);
    expect(r.verdict).toBe("NEEDS_AI");
    expect(r.debug.gradingPath).toContain("keyword_evidence_gathered");
  });

  it("flags stuffed answers and defers them to the AI", () => {
    const noise = "banana zebra umbrella galaxy sandwich rocket ".repeat(20);
    const r = deterministicCheck(noise, "Mitochondria produce ATP");
    expect(r.verdict).toBe("NEEDS_AI");
    expect(r.debug.stuffingDetected).toBe(true);
  });
});
