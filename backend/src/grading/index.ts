/**
 * Grading orchestrator.
 *
 * Three passes, each only doing as much work as the previous pass left
 * unresolved:
 *   1. MCQ fast-path + deterministic text checks (no network call)
 *   2. Optional embedding similarity, in parallel, for whatever is left
 *   3. LLM semantic grading for whatever is still ambiguous
 *
 * Every answer ends up with a fused confidence score and a `gradedBy` tag,
 * so the grading path is auditable rather than a single opaque "AI says so".
 */

import type { ExamItem, UserAnswers, QuestionResult, GradingReport, GradingDebug } from "./types.js";
import { isMCQQuestion, gradeMCQ } from "./mcq.js";
import { deterministicCheck } from "./deterministicCheck.js";
import { embeddingSimilarity } from "./embeddings.js";
import { aiSemanticGrade } from "./aiGrader.js";
import { fuseConfidence, computeManualReviewFlags } from "./confidence.js";
import { keywordEvidence, validateConcepts } from "./textMatch.js";
import { GRADING_CONFIG } from "./types.js";

export * from "./types.js";

export async function gradeExam(exam: ExamItem[], userAnswers: UserAnswers): Promise<GradingReport> {
  const preDecided: QuestionResult[] = [];
  const needsAI: Array<{
    id: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    preMatchedConcepts: string[];
    preMissingConcepts: string[];
    preDebug: GradingDebug;
  }> = [];

  // ── Pass 1: MCQ fast-path + deterministic checks ──────────────────────
  for (const item of exam) {
    const correctAnswer = (item.correctAnswer ?? item.answer ?? "").trim();
    const rawUserAnswer = (userAnswers[item.id] ?? "").trim();

    if (isMCQQuestion(item.question, item.options)) {
      const mcqResult = gradeMCQ(rawUserAnswer, correctAnswer, item.options);
      if (mcqResult.confidence > 0) {
        preDecided.push({
          questionId: item.id,
          question: item.question,
          correct: mcqResult.correct,
          confidence: mcqResult.confidence,
          userAnswer: rawUserAnswer,
          correctAnswer,
          matchedConcepts: mcqResult.correct ? [correctAnswer] : [],
          missingConcepts: mcqResult.correct ? [] : [correctAnswer],
          contradictions: [],
          explanation: mcqResult.explanation,
          gradedBy: "mcq",
          needsManualReview: false,
          _debug: { gradingPath: ["mcq_deterministic"] },
        });
        continue;
      }
    }

    const check = deterministicCheck(rawUserAnswer, correctAnswer);

    if (check.verdict === "CORRECT" || check.verdict === "INCORRECT") {
      preDecided.push({
        questionId: item.id,
        question: item.question,
        correct: check.verdict === "CORRECT",
        confidence: check.confidence,
        userAnswer: rawUserAnswer,
        correctAnswer,
        matchedConcepts: check.matchedConcepts,
        missingConcepts: check.missingConcepts,
        contradictions: check.contradictions,
        explanation: "reason" in check ? check.reason : "",
        gradedBy: "deterministic",
        needsManualReview: false,
        _debug: check.debug,
      });
    } else {
      needsAI.push({
        id: item.id,
        question: item.question,
        userAnswer: rawUserAnswer,
        correctAnswer,
        preMatchedConcepts: check.matchedConcepts,
        preMissingConcepts: check.missingConcepts,
        preDebug: check.debug,
      });
    }
  }

  // ── Pass 2: embedding similarity for whatever is left, in parallel ────
  const embeddingScores = new Map<string, number>();
  await Promise.all(
    needsAI.map(async (pending) => {
      const { score, available } = await embeddingSimilarity(pending.userAnswer, pending.correctAnswer);
      if (available) embeddingScores.set(pending.id, score);
    })
  );

  const resolvedByEmbedding: QuestionResult[] = [];
  const stillNeedsAI: typeof needsAI = [];

  for (const pending of needsAI) {
    const embScore = embeddingScores.get(pending.id);
    if (embScore !== undefined && embScore >= GRADING_CONFIG.embedding.highConfidenceThreshold) {
      const kw = keywordEvidence(pending.userAnswer, pending.correctAnswer);
      resolvedByEmbedding.push({
        questionId: pending.id,
        question: pending.question,
        correct: true,
        confidence: embScore,
        userAnswer: pending.userAnswer,
        correctAnswer: pending.correctAnswer,
        matchedConcepts: kw.matchedConcepts,
        missingConcepts: kw.missingConcepts,
        contradictions: [],
        explanation: "",
        gradedBy: "embedding",
        needsManualReview: false,
        _debug: { ...pending.preDebug, embeddingScore: embScore },
      });
    } else {
      stillNeedsAI.push(pending);
    }
  }

  // ── Pass 3: LLM semantic grading ───────────────────────────────────────
  const aiResults: QuestionResult[] = [];

  if (stillNeedsAI.length > 0) {
    try {
      const rawAI = await aiSemanticGrade(stillNeedsAI);
      const aiMap = new Map(rawAI.map((r) => [r.id, r]));

      for (const pending of stillNeedsAI) {
        const embScore = embeddingScores.get(pending.id);
        const ai = aiMap.get(pending.id);

        if (!ai) {
          aiResults.push({
            questionId: pending.id,
            question: pending.question,
            correct: false,
            confidence: 0,
            userAnswer: pending.userAnswer,
            correctAnswer: pending.correctAnswer,
            matchedConcepts: pending.preMatchedConcepts,
            missingConcepts: pending.preMissingConcepts,
            contradictions: [],
            explanation: "Grading could not be completed — please review manually.",
            gradedBy: "error",
            needsManualReview: true,
            _debug: { ...pending.preDebug, embeddingScore: embScore },
          });
          continue;
        }

        const fused = fuseConfidence({
          embeddingScore: embScore,
          aiConfidence: ai.confidence,
          fuzzyScore: pending.preDebug.fuzzyScore,
          keywordCoverage: pending.preDebug.keywordCoverage,
        });

        const aiEmbeddingDisagreement =
          embScore !== undefined && Math.abs((ai.correct ? ai.confidence : 1 - ai.confidence) - embScore) > 0.3;

        const validatedMatched = validateConcepts(ai.matchedConcepts ?? [], pending.userAnswer, pending.correctAnswer);
        const validatedMissing = validateConcepts(ai.missingConcepts ?? [], pending.userAnswer, pending.correctAnswer);

        const { needsReview, reasons } = computeManualReviewFlags({
          confidence: fused,
          embeddingScore: embScore,
          aiConfidence: ai.confidence,
          contradictions: ai.contradictions ?? [],
          stuffingDetected: !!pending.preDebug.stuffingDetected,
          gradingError: false,
          aiEmbeddingDisagreement,
        });

        aiResults.push({
          questionId: ai.id,
          question: ai.question,
          correct: ai.correct,
          confidence: fused,
          userAnswer: ai.userAnswer,
          correctAnswer: ai.correctAnswer,
          matchedConcepts: validatedMatched,
          missingConcepts: validatedMissing,
          contradictions: ai.contradictions ?? [],
          explanation: ai.explanation ?? "",
          gradedBy: "ai",
          needsManualReview: needsReview,
          _debug: { ...pending.preDebug, embeddingScore: embScore, aiConfidence: ai.confidence, finalConfidence: fused, manualReviewReasons: reasons },
        });
      }
    } catch (err) {
      console.error("[grader] AI grading pass failed:", err);
      for (const pending of stillNeedsAI) {
        aiResults.push({
          questionId: pending.id,
          question: pending.question,
          correct: false,
          confidence: 0,
          userAnswer: pending.userAnswer,
          correctAnswer: pending.correctAnswer,
          matchedConcepts: pending.preMatchedConcepts,
          missingConcepts: pending.preMissingConcepts,
          contradictions: [],
          explanation: "AI grading failed — please review manually.",
          gradedBy: "error",
          needsManualReview: true,
          _debug: pending.preDebug,
        });
      }
    }
  }

  // ── Merge in original question order ───────────────────────────────────
  const allResultsMap = new Map<string, QuestionResult>();
  for (const r of [...preDecided, ...resolvedByEmbedding, ...aiResults]) allResultsMap.set(r.questionId, r);

  const allResults: QuestionResult[] = [];
  for (const item of exam) {
    const result = allResultsMap.get(item.id);
    if (result) allResults.push(result);
  }

  const score = allResults.filter((r) => r.correct).length;
  const total = allResults.length;
  const pct = total > 0 ? score / total : 0;
  const anyManualReview = allResults.some((r) => r.needsManualReview);

  const feedback =
    pct === 1
      ? "Perfect score — outstanding work!"
      : pct >= 0.8
      ? "Great job — you really know your stuff!"
      : pct >= 0.6
      ? "Good effort — a little more revision and you'll nail it!"
      : pct >= 0.4
      ? "Keep going — you're building solid foundations!"
      : "Don't give up — every attempt makes you stronger!";

  return { score, total, percentage: Math.round(pct * 100), feedback, results: allResults, needsManualReview: anyManualReview };
}
