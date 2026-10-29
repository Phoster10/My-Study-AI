import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/grading/aiGrader.js", () => ({ aiSemanticGrade: vi.fn() }));
vi.mock("../src/grading/embeddings.js", () => ({ embeddingSimilarity: vi.fn(), cosineSimilarity: vi.fn() }));

import { gradeExam } from "../src/grading/index.js";
import { aiSemanticGrade } from "../src/grading/aiGrader.js";
import { embeddingSimilarity } from "../src/grading/embeddings.js";

const CORRECT = "mitochondria is the powerhouse of the cell";
const PARAPHRASE = "the organelle that generates cellular energy";
const q = (id: string, extra: object = {}) => ({ id, question: `Explain the role of mitochondria (${id}).`, correctAnswer: CORRECT, ...extra });

beforeEach(() => {
  vi.mocked(aiSemanticGrade).mockReset();
  vi.mocked(embeddingSimilarity).mockReset();
  vi.mocked(embeddingSimilarity).mockResolvedValue({ score: 0, available: false });
});

describe("gradeExam orchestrator", () => {
  it("resolves easy answers without calling the AI or embeddings-based fallback", async () => {
    const report = await gradeExam([q("a"), q("b")], { a: CORRECT, b: "idk" });
    expect(aiSemanticGrade).not.toHaveBeenCalled();
    expect(report.results.map((r) => [r.correct, r.gradedBy])).toEqual([[true, "deterministic"], [false, "deterministic"]]);
    expect(report.score).toBe(1);
    expect(report.percentage).toBe(50);
  });

  it("resolves a paraphrase by embedding when similarity is very high", async () => {
    vi.mocked(embeddingSimilarity).mockResolvedValue({ score: 0.96, available: true });
    const report = await gradeExam([q("a")], { a: PARAPHRASE });
    expect(aiSemanticGrade).not.toHaveBeenCalled();
    expect(report.results[0]).toMatchObject({ correct: true, gradedBy: "embedding", confidence: 0.96 });
  });

  it("falls through to the AI judge and fuses confidence", async () => {
    vi.mocked(aiSemanticGrade).mockResolvedValue([
      { id: "a", question: "Explain the role of mitochondria (a).", correct: true, confidence: 0.95, userAnswer: PARAPHRASE, correctAnswer: CORRECT, matchedConcepts: [], missingConcepts: [], contradictions: [], explanation: "" },
    ]);
    const report = await gradeExam([q("a")], { a: PARAPHRASE });
    expect(aiSemanticGrade).toHaveBeenCalledTimes(1);
    expect(report.results[0].gradedBy).toBe("ai");
    expect(report.results[0].correct).toBe(true);
    expect(report.results[0].confidence).toBeGreaterThan(0);
    expect(report.results[0]._debug?.aiConfidence).toBe(0.95);
  });

  it("only sends ambiguous answers to the AI", async () => {
    vi.mocked(aiSemanticGrade).mockResolvedValue([]);
    await gradeExam([q("easy"), q("hard")], { easy: CORRECT, hard: PARAPHRASE });
    const sent = vi.mocked(aiSemanticGrade).mock.calls[0][0];
    expect(sent.map((i) => i.id)).toEqual(["hard"]);
  });

  it("flags for manual review when the AI omits a result", async () => {
    vi.mocked(aiSemanticGrade).mockResolvedValue([]);
    const report = await gradeExam([q("a")], { a: PARAPHRASE });
    expect(report.results[0]).toMatchObject({ gradedBy: "error", needsManualReview: true, correct: false });
    expect(report.needsManualReview).toBe(true);
  });

  it("degrades gracefully when the AI call throws", async () => {
    vi.mocked(aiSemanticGrade).mockRejectedValue(new Error("rate limited"));
    const report = await gradeExam([q("a")], { a: PARAPHRASE });
    expect(report.results[0]).toMatchObject({ gradedBy: "error", needsManualReview: true });
  });

  it("uses the MCQ fast path without any AI call", async () => {
    const mcq = { id: "m", question: "Which is a fruit?", options: { A: "Apple", B: "Car" }, correctAnswer: "A" };
    const report = await gradeExam([mcq], { m: "B" });
    expect(report.results[0]).toMatchObject({ gradedBy: "mcq", correct: false });
    expect(aiSemanticGrade).not.toHaveBeenCalled();
  });

  it("falls back from an ambiguous MCQ answer to the deterministic/AI path", async () => {
    vi.mocked(aiSemanticGrade).mockResolvedValue([]);
    const mcq = { id: "m", question: "Which is a fruit?", options: { A: "Apple", B: "Car" }, correctAnswer: "A" };
    const report = await gradeExam([mcq], { m: "some long ambiguous thing" });
    expect(report.results[0].gradedBy).not.toBe("mcq");
  });

  it("preserves original question order across grading paths", async () => {
    vi.mocked(aiSemanticGrade).mockResolvedValue([
      { id: "b", question: "x", correct: true, confidence: 0.9, userAnswer: PARAPHRASE, correctAnswer: CORRECT, matchedConcepts: [], missingConcepts: [], contradictions: [], explanation: "" },
    ]);
    const report = await gradeExam([q("a"), q("b"), q("c")], { a: CORRECT, b: PARAPHRASE, c: "idk" });
    expect(report.results.map((r) => r.questionId)).toEqual(["a", "b", "c"]);
  });

  it("treats missing user answers as blank", async () => {
    const report = await gradeExam([q("a")], {});
    expect(report.results[0].correct).toBe(false);
  });

  it("returns tiered feedback and a perfect percentage", async () => {
    const perfect = await gradeExam([q("a")], { a: CORRECT });
    expect(perfect.percentage).toBe(100);
    expect(perfect.feedback).toMatch(/perfect/i);
    const zero = await gradeExam([q("a")], { a: "idk" });
    expect(zero.feedback).toMatch(/give up/i);
  });
});
