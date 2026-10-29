/** Combines the independent grading signals into one confidence score, and
 * decides whether a graded answer should be flagged for manual review. */

import { GRADING_CONFIG } from "./types.js";

export function fuseConfidence(signals: {
  embeddingScore?: number;
  aiConfidence?: number;
  fuzzyScore?: number;
  keywordCoverage?: number;
}): number {
  const { embeddingWeight, aiWeight, fuzzyWeight, keywordWeight } = GRADING_CONFIG.confidence;
  let totalWeight = 0;
  let weightedSum = 0;

  if (signals.embeddingScore !== undefined) {
    weightedSum += signals.embeddingScore * embeddingWeight;
    totalWeight += embeddingWeight;
  }
  if (signals.aiConfidence !== undefined) {
    weightedSum += signals.aiConfidence * aiWeight;
    totalWeight += aiWeight;
  }
  if (signals.fuzzyScore !== undefined) {
    weightedSum += signals.fuzzyScore * fuzzyWeight;
    totalWeight += fuzzyWeight;
  }
  if (signals.keywordCoverage !== undefined) {
    weightedSum += signals.keywordCoverage * keywordWeight;
    totalWeight += keywordWeight;
  }

  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

export function computeManualReviewFlags(signals: {
  confidence: number;
  embeddingScore?: number;
  aiConfidence?: number;
  contradictions: string[];
  stuffingDetected: boolean;
  gradingError: boolean;
  aiEmbeddingDisagreement?: boolean;
}): { needsReview: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const { manualReviewThreshold, borderlineBand } = GRADING_CONFIG.confidence;

  if (signals.gradingError) reasons.push("Grading error occurred");
  if (signals.contradictions.length > 0) reasons.push("Contradiction signals detected");
  if (signals.stuffingDetected) reasons.push("Answer stuffing detected");
  if (signals.confidence < manualReviewThreshold) reasons.push(`Confidence ${signals.confidence.toFixed(2)} below threshold`);
  if (Math.abs(signals.confidence - manualReviewThreshold) < borderlineBand) reasons.push("Confidence near decision boundary");
  if (signals.aiEmbeddingDisagreement) reasons.push("Embedding and AI scores disagree significantly");

  return { needsReview: reasons.length > 0, reasons };
}
