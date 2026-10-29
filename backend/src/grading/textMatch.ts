/**
 * Deterministic text-similarity signals used before falling back to the AI
 * grader. Each function is pure and independently unit-testable.
 */

import { GRADING_CONFIG } from "./types.js";
import { semanticNormalize, keywordNormalize } from "./normalize.js";

// ---------------------------------------------------------------------------
// Dice coefficient fuzzy matching (bigram overlap, no external dependency)
// ---------------------------------------------------------------------------
function getBigrams(str: string): Map<string, number> {
  const bigrams = new Map<string, number>();
  for (let i = 0; i < str.length - 1; i++) {
    const bigram = str.slice(i, i + 2);
    bigrams.set(bigram, (bigrams.get(bigram) ?? 0) + 1);
  }
  return bigrams;
}

export function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const aGrams = getBigrams(a);
  const bGrams = getBigrams(b);

  let intersectionCount = 0;
  for (const [bigram, count] of aGrams) {
    intersectionCount += Math.min(count, bGrams.get(bigram) ?? 0);
  }
  return (2 * intersectionCount) / (a.length - 1 + (b.length - 1));
}

export function fuzzyMatch(
  userAnswer: string,
  correctAnswer: string,
  threshold = GRADING_CONFIG.fuzzy.threshold
): { matched: boolean; score: number } {
  const u = semanticNormalize(userAnswer);
  const c = semanticNormalize(correctAnswer);
  const score = diceCoefficient(u, c);
  return { matched: score >= threshold, score };
}

// ---------------------------------------------------------------------------
// Keyword / concept evidence — evidence only, never auto-passes an answer
// ---------------------------------------------------------------------------
export function extractKeywords(text: string): string[] {
  return keywordNormalize(text)
    .split(" ")
    .filter((t) => t.length > 2);
}

export interface KeywordEvidence {
  matchedConcepts: string[];
  missingConcepts: string[];
  coverage: number;
}

export function keywordEvidence(userAnswer: string, correctAnswer: string): KeywordEvidence {
  const correctKeywords = extractKeywords(correctAnswer);
  const userNormalized = keywordNormalize(userAnswer);

  if (correctKeywords.length === 0) {
    return { matchedConcepts: [], missingConcepts: [], coverage: 0 };
  }

  const matchedConcepts: string[] = [];
  const missingConcepts: string[] = [];
  const userTokens = userNormalized.split(" ");

  for (const kw of correctKeywords) {
    const found = userNormalized.includes(kw) || userTokens.some((ut) => diceCoefficient(ut, kw) >= 0.8);
    (found ? matchedConcepts : missingConcepts).push(kw);
  }

  return { matchedConcepts, missingConcepts, coverage: matchedConcepts.length / correctKeywords.length };
}

/** Filters AI-returned concept lists down to tokens that actually appear in
 * the answers, to remove LLM hallucinations before showing them to a user. */
export function validateConcepts(concepts: string[], userAnswer: string, correctAnswer: string): string[] {
  const combined = `${keywordNormalize(userAnswer)} ${keywordNormalize(correctAnswer)}`;
  const tokens = combined.split(" ");
  return concepts.filter((c) => {
    const cn = keywordNormalize(c);
    return tokens.some((t) => t === cn || diceCoefficient(t, cn) >= 0.75);
  });
}

// ---------------------------------------------------------------------------
// Contradiction detection — looks for a negation word near a correct keyword
// ---------------------------------------------------------------------------
const NEGATION_PATTERNS = [
  /\bnot\b/i, /\bnever\b/i, /\bno\b/i,
  /\bisn'?t\b/i, /\baren'?t\b/i, /\bwasn'?t\b/i, /\bweren'?t\b/i,
  /\bdoesn'?t\b/i, /\bdon'?t\b/i, /\bdidn'?t\b/i,
  /\bwon'?t\b/i, /\bcan'?t\b/i, /\bcannot\b/i,
  /\bwouldn'?t\b/i, /\bshouldn'?t\b/i, /\bhasn'?t\b/i,
  /\bhaven'?t\b/i, /\bhadn'?t\b/i,
];

export function contradictionCheck(
  userAnswer: string,
  correctAnswer: string
): { hasContradiction: boolean; contradictions: string[] } {
  const userLower = userAnswer.toLowerCase();
  const contradictions: string[] = [];
  const correctKeywords = extractKeywords(correctAnswer).filter((k) => k.length > 3);

  for (const kw of correctKeywords) {
    const kwIndex = userLower.indexOf(kw);
    if (kwIndex === -1) continue;
    const precedingText = userLower.slice(Math.max(0, kwIndex - 50), kwIndex);
    const precedingWords = precedingText.split(/\s+/).slice(-6).join(" ");
    for (const pattern of NEGATION_PATTERNS) {
      if (pattern.test(precedingWords)) {
        contradictions.push(`"${precedingWords.trim()} ${kw}" contradicts correct answer`);
        break;
      }
    }
  }

  const correctCore = semanticNormalize(correctAnswer);
  const words = correctCore.split(" ").filter((w) => w.length > 3);
  if (words.length >= 2) {
    const phrase = words.slice(0, 3).join(" ");
    if (userLower.includes(phrase)) {
      const idx = userLower.indexOf(phrase);
      const around = userLower.slice(Math.max(0, idx - 30), idx + phrase.length + 30);
      for (const pattern of NEGATION_PATTERNS) {
        if (pattern.test(around)) {
          contradictions.push(`User answer appears to negate: "${phrase}"`);
          break;
        }
      }
    }
  }

  return { hasContradiction: contradictions.length > 0, contradictions: [...new Set(contradictions)] };
}

// ---------------------------------------------------------------------------
// Answer-stuffing detection — very long, low-relevance answers submitted to
// try to "cover all bases" are flagged rather than trusted.
// ---------------------------------------------------------------------------
export interface StuffingResult {
  detected: boolean;
  reason?: string;
  densityScore: number;
}

export function detectAnswerStuffing(userAnswer: string, correctAnswer: string): StuffingResult {
  const userWords = userAnswer.trim().split(/\s+/).filter(Boolean);
  const correctWords = correctAnswer.trim().split(/\s+/).filter(Boolean);

  if (correctWords.length === 0 || userWords.length === 0) {
    return { detected: false, densityScore: 1 };
  }

  const lengthRatio = userWords.length / correctWords.length;
  if (lengthRatio <= GRADING_CONFIG.stuffing.maxLengthRatio) {
    return { detected: false, densityScore: 1 };
  }

  const correctKeywords = new Set(extractKeywords(correctAnswer));
  const userKeywords = extractKeywords(userAnswer);
  const overlap = userKeywords.filter((k) => correctKeywords.has(k));
  const density = overlap.length / userKeywords.length;

  if (density < GRADING_CONFIG.stuffing.minDensityRatio) {
    return {
      detected: true,
      reason: `Answer is ${lengthRatio.toFixed(1)}x longer than expected with only ${Math.round(
        density * 100
      )}% relevant content density.`,
      densityScore: density,
    };
  }

  return { detected: false, densityScore: density };
}

// ---------------------------------------------------------------------------
// Safe containment check — handles "correct answer is a substring of the
// user's answer" (and vice versa) without over-trusting long free text.
// ---------------------------------------------------------------------------
export function safeContainmentCheck(
  userAnswer: string,
  correctAnswer: string
): { verdict: "CORRECT" | "NEEDS_VERIFICATION" | "NO_MATCH"; confidence: number; reason?: string } {
  const u = semanticNormalize(userAnswer);
  const c = semanticNormalize(correctAnswer);

  if (u === c) return { verdict: "CORRECT", confidence: 1.0 };

  if (u.includes(c) && c.length > 3) {
    const extraLength = u.length - c.length;
    const extraRatio = extraLength / c.length;

    if (extraRatio > 0.5) {
      const { hasContradiction } = contradictionCheck(userAnswer, correctAnswer);
      if (hasContradiction) {
        return { verdict: "NEEDS_VERIFICATION", confidence: 0.4, reason: "Correct phrase found but surrounded by contradictory content." };
      }
      if (extraRatio > 1.5) {
        return { verdict: "NEEDS_VERIFICATION", confidence: 0.7, reason: "Correct phrase found but answer contains substantial additional claims." };
      }
    }
    return { verdict: "CORRECT", confidence: 0.97 };
  }

  if (c.includes(u) && u.length > 0) {
    const coverageRatio = u.length / c.length;
    if (coverageRatio >= 0.6) return { verdict: "CORRECT", confidence: 0.94 };
    return { verdict: "NEEDS_VERIFICATION", confidence: 0.5, reason: "User answer is a very short subset of the correct answer." };
  }

  return { verdict: "NO_MATCH", confidence: 0 };
}
