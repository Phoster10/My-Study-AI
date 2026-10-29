/** Multiple-choice detection and deterministic grading (no AI call needed
 * for the common cases: letter answers or exact option-text answers). */

import { semanticNormalize } from "./normalize.js";

const MCQ_QUESTION_RE = /\b(which|choose|select|pick|option|answer is)\b/i;

export function isMCQQuestion(question: string, options?: Record<string, string>): boolean {
  if (options && Object.keys(options).length >= 2) return true;
  return MCQ_QUESTION_RE.test(question);
}

export function gradeMCQ(
  userAnswer: string,
  correctAnswer: string,
  options?: Record<string, string>
): { correct: boolean; confidence: number; explanation: string } {
  const userTrimmed = userAnswer.trim().toLowerCase();
  const correctTrimmed = correctAnswer.trim().toLowerCase();

  const userLetter = userTrimmed.replace(/[).:\-\s]/g, "");
  const correctLetter = correctTrimmed.replace(/[).:\-\s]/g, "");

  if (userLetter.length === 1 && correctLetter.length === 1) {
    const correct = userLetter === correctLetter;
    return {
      correct,
      confidence: 1,
      explanation: correct ? "" : `Selected ${userLetter.toUpperCase()}, correct was ${correctLetter.toUpperCase()}.`,
    };
  }

  if (options) {
    for (const [letter, text] of Object.entries(options)) {
      const normText = semanticNormalize(text);
      const normUser = semanticNormalize(userAnswer);
      if (normUser === normText || normUser.includes(normText)) {
        const correct = letter.toLowerCase() === correctLetter || normText === semanticNormalize(correctAnswer);
        return { correct, confidence: 0.95, explanation: correct ? "" : `Chose "${text}" which is not correct.` };
      }
    }
  }

  const u = semanticNormalize(userAnswer);
  const c = semanticNormalize(correctAnswer);
  if (u === c) return { correct: true, confidence: 1, explanation: "" };

  // Ambiguous — caller should fall back to the AI grader.
  return { correct: false, confidence: 0, explanation: "MCQ answer is ambiguous — requires AI fallback." };
}
