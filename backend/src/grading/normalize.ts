/**
 * Text normalization.
 *
 * Two separate pipelines are exposed on purpose:
 *  - semanticNormalize: unicode/case/whitespace cleanup only. Preserves
 *    stopwords, so it is safe for exact-match and fuzzy comparisons where
 *    word order and small words still carry meaning.
 *  - keywordNormalize: additionally strips English stopwords and very short
 *    tokens. Use this ONLY for keyword/concept extraction — never for
 *    fuzzy or exact-match comparisons, since stripping words there would
 *    create false positives (e.g. "is not correct" -> "correct").
 */

import { GRADING_CONFIG } from "./types.js";

class SimpleCache<V> {
  private map = new Map<string, V>();
  constructor(private maxSize: number) {}

  get(key: string): V | undefined {
    return this.map.get(key);
  }

  set(key: string, value: V): void {
    if (this.map.size >= this.maxSize) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    this.map.set(key, value);
  }
}

const normCache = new SimpleCache<string>(GRADING_CONFIG.cache.maxSize);

export function semanticNormalize(str: string): string {
  if (!str || typeof str !== "string") return "";
  const key = `sn:${str}`;
  const cached = normCache.get(key);
  if (cached !== undefined) return cached;

  const result = str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  normCache.set(key, result);
  return result;
}

const STOPWORDS =
  /\b(the|a|an|is|are|was|were|of|in|on|at|to|for|and|or|but|it|its|this|that|these|those|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|shall|can|am)\b/g;

export function keywordNormalize(str: string): string {
  return semanticNormalize(str).replace(STOPWORDS, " ").replace(/\s+/g, " ").trim();
}

/** Redacts common prompt-injection patterns from untrusted student input
 * before it is embedded in an LLM prompt. */
const INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all|prior)\s+(instructions?|prompts?|rules?)/gi,
  /mark\s+(this|my)\s+answer\s+(as\s+)?(correct|right|true)/gi,
  /you\s+(are|should|must|have\s+to)\s+(now\s+)?(grade|mark|score)/gi,
  /system\s*:\s*/gi,
  /\[INST\]/gi,
  /<\|im_start\|>/gi,
];

export function sanitizeUserAnswer(answer: string): string {
  let sanitized = answer;
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
}
