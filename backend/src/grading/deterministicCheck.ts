/**
 * Deterministic pre-checker.
 *
 * Runs cheap, explainable checks (blank answer, contradiction, stuffing,
 * exact match, containment, fuzzy match) before anything ever needs to be
 * sent to the LLM. Only ambiguous answers ("NEEDS_AI") fall through to the
 * embedding + AI passes in grading/index.ts. This keeps grading fast and
 * cheap for the majority of answers, and keeps the AI's role auditable.
 */

import type { GradingDebug } from "./types.js";
import { semanticNormalize } from "./normalize.js";
import {
  contradictionCheck,
  detectAnswerStuffing,
  safeContainmentCheck,
  fuzzyMatch,
  keywordEvidence,
  extractKeywords,
} from "./textMatch.js";

type PreCheckVerdict =
  | { verdict: "CORRECT"; confidence: number; matchedConcepts: string[]; missingConcepts: string[]; contradictions: string[]; debug: GradingDebug }
  | { verdict: "INCORRECT"; confidence: number; matchedConcepts: string[]; missingConcepts: string[]; contradictions: string[]; reason: string; debug: GradingDebug }
  | { verdict: "NEEDS_AI"; confidence: number; matchedConcepts: string[]; missingConcepts: string[]; contradictions: string[]; debug: GradingDebug };

export function deterministicCheck(userAnswer: string, correctAnswer: string): PreCheckVerdict {
  const debug: GradingDebug = { gradingPath: [] };

  const trimmed = userAnswer.trim().toLowerCase();
  if (!trimmed || ["n/a", "none", "skip", "i don't know", "idk", "no idea", "?", "-", ""].includes(trimmed)) {
    debug.gradingPath!.push("blank_answer");
    return {
      verdict: "INCORRECT",
      confidence: 1,
      matchedConcepts: [],
      missingConcepts: extractKeywords(correctAnswer),
      contradictions: [],
      reason: "No answer provided.",
      debug,
    };
  }

  const { hasContradiction, contradictions } = contradictionCheck(userAnswer, correctAnswer);
  if (hasContradiction) {
    debug.gradingPath!.push("contradiction_detected");
    return {
      verdict: "INCORRECT",
      confidence: 0.92,
      matchedConcepts: [],
      missingConcepts: [],
      contradictions,
      reason: "Answer contains a contradiction of the correct answer.",
      debug,
    };
  }

  const stuffing = detectAnswerStuffing(userAnswer, correctAnswer);
  if (stuffing.detected) {
    debug.gradingPath!.push("stuffing_detected");
    debug.stuffingDetected = true;
    const kw = keywordEvidence(userAnswer, correctAnswer);
    return { verdict: "NEEDS_AI", confidence: 0.3, matchedConcepts: kw.matchedConcepts, missingConcepts: kw.missingConcepts, contradictions: [], debug };
  }

  const u = semanticNormalize(userAnswer);
  const c = semanticNormalize(correctAnswer);
  if (u === c) {
    debug.gradingPath!.push("exact_match");
    return { verdict: "CORRECT", confidence: 1, matchedConcepts: extractKeywords(correctAnswer), missingConcepts: [], contradictions: [], debug };
  }

  const containment = safeContainmentCheck(userAnswer, correctAnswer);
  if (containment.verdict === "CORRECT") {
    debug.gradingPath!.push("containment_match");
    return { verdict: "CORRECT", confidence: containment.confidence, matchedConcepts: extractKeywords(correctAnswer), missingConcepts: [], contradictions: [], debug };
  }

  const { matched: fuzzyMatched, score: fuzzyScore } = fuzzyMatch(userAnswer, correctAnswer);
  debug.fuzzyScore = fuzzyScore;
  if (fuzzyMatched) {
    debug.gradingPath!.push("fuzzy_match");
    const kw = keywordEvidence(userAnswer, correctAnswer);
    return { verdict: "CORRECT", confidence: Math.max(fuzzyScore, 0.85), matchedConcepts: kw.matchedConcepts, missingConcepts: kw.missingConcepts, contradictions: [], debug };
  }

  const kw = keywordEvidence(userAnswer, correctAnswer);
  debug.keywordCoverage = kw.coverage;
  debug.gradingPath!.push("keyword_evidence_gathered");

  return { verdict: "NEEDS_AI", confidence: fuzzyScore, matchedConcepts: kw.matchedConcepts, missingConcepts: kw.missingConcepts, contradictions: [], debug };
}
