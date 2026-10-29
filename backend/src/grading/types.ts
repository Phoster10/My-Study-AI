/**
 * Shared types for the exam-grading engine.
 *
 * The grader combines several independent signals (deterministic text
 * matching, fuzzy matching, keyword coverage, optional embeddings, and an
 * LLM semantic judge) and fuses them into one confidence score per answer.
 * See grading/index.ts for the orchestration and docs/architecture.md for
 * the high-level flow diagram.
 */

export interface ExamItem {
  id: string;
  question: string;
  /** Optional MCQ options, e.g. { A: "Paris", B: "London", ... } */
  options?: Record<string, string>;
  correctAnswer?: string;
  answer?: string;
}

export interface UserAnswers {
  [questionId: string]: string;
}

export type GradedBy = "deterministic" | "embedding" | "ai" | "mcq" | "error";

export interface QuestionResult {
  questionId: string;
  question: string;
  correct: boolean;
  confidence: number;
  userAnswer: string;
  correctAnswer: string;
  matchedConcepts: string[];
  missingConcepts: string[];
  contradictions: string[];
  explanation: string;
  gradedBy: GradedBy;
  needsManualReview: boolean;
  _debug?: GradingDebug;
}

export interface GradingReport {
  score: number;
  total: number;
  percentage: number;
  feedback: string;
  results: QuestionResult[];
  needsManualReview: boolean;
}

export interface GradingDebug {
  fuzzyScore?: number;
  embeddingScore?: number;
  aiConfidence?: number;
  keywordCoverage?: number;
  finalConfidence?: number;
  stuffingDetected?: boolean;
  manualReviewReasons?: string[];
  gradingPath?: string[];
}

export const GRADING_CONFIG = {
  fuzzy: { threshold: 0.82 },
  keyword: { coverageThreshold: 0.65 },
  embedding: {
    baseUrl: "https://api.voyageai.com/v1",
    model: "voyage-3-lite",
    similarityThreshold: 0.82,
    highConfidenceThreshold: 0.92,
  },
  confidence: {
    embeddingWeight: 0.4,
    aiWeight: 0.4,
    fuzzyWeight: 0.1,
    keywordWeight: 0.1,
    manualReviewThreshold: 0.65,
    borderlineBand: 0.05,
  },
  stuffing: {
    maxLengthRatio: 4,
    minDensityRatio: 0.15,
  },
  cache: { maxSize: 512 },
} as const;
