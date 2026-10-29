/**
 * POST /api/exam/generate  — generates a practice exam from source text.
 *   Defaults to 10 questions (5 MCQ + 5
 *   short answer); pass `count` (5 or 10) and/or `mcqOnly: true` for a
 *   shorter, fully-multiple-choice exam (used by the History page's
 *   per-note "Take Exam" flow).
 * POST /api/exam/grade     — grades a submitted exam via the grading engine.
 */

import { Router } from "express";
import { groq, CHAT_MODEL } from "../lib/groq.js";
import { asyncRoute } from "../middleware/errorHandler.js";
import { gradeExam } from "../grading/index.js";
import type { ExamItem, UserAnswers } from "../grading/types.js";

export const examRouter = Router();

const ALLOWED_COUNTS = [5, 10];

function extractJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
  }
  return null;
}

function fallbackQuestions(source: string, count: number, mcqOnly: boolean) {
  const lines = source.split("\n").filter((l) => l.trim()).slice(0, count);
  const mcqCount = mcqOnly ? count : Math.ceil(count / 2);
  return lines.map((line, i) => ({
    id: `fallback-${i}`,
    question: line.slice(0, 120),
    type: i < mcqCount ? "mcq" : "short_answer",
    options: i < mcqCount ? { A: "A", B: "B", C: "C", D: "D" } : undefined,
    answer: "N/A",
  }));
}

examRouter.post(
  "/generate",
  asyncRoute(async (req, res) => {
    const { text, mcqOnly: rawMcqOnly } = req.body ?? {};

    const count = ALLOWED_COUNTS.includes(req.body?.count) ? req.body.count : 10;
    const mcqOnly = rawMcqOnly === true;

    const source = text;

    if (!source || String(source).trim().length < 10) {
      return res.json({ exam: fallbackQuestions("Not enough source material was provided.", count, mcqOnly) });
    }

    const mcqCount = mcqOnly ? count : Math.ceil(count / 2);
    const shortAnswerCount = count - mcqCount;

    const prompt = `Generate exactly ${count} exam questions from the content below.

Rules:
- ${mcqCount} must be multiple choice (mcq) with an "options" object keyed A-D${
      shortAnswerCount > 0 ? `\n- ${shortAnswerCount} must be short answer` : ""
    }
- Every question needs a unique "id" string
- Return ONLY JSON, no explanations

Format:
{
  "exam": [
    { "id": "q1", "question": "string", "type": "mcq", "options": {"A":"...","B":"...","C":"...","D":"..."}, "answer": "A" }${
      shortAnswerCount > 0 ? ',\n    { "id": "q2", "question": "string", "type": "short_answer", "answer": "string" }' : ""
    }
  ]
}

CONTENT:
${source}`;

    const response = await groq.chat.completions.create({
      model: CHAT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const raw = response.choices[0]?.message?.content ?? "";
    const parsed = extractJSON(raw);
    let exam = parsed?.exam ?? (Array.isArray(parsed) ? parsed : null);

    if (!exam || !Array.isArray(exam) || exam.length === 0) {
      exam = fallbackQuestions(source, count, mcqOnly);
    }

    exam = exam.slice(0, count);
    while (exam.length < count) {
      exam.push({ id: `fallback-${exam.length}`, question: "Fallback generated question", type: "short_answer", answer: "N/A" });
    }

    res.json({ exam });
  })
);

examRouter.post(
  "/grade",
  asyncRoute(async (req, res) => {
    const { exam, userAnswers }: { exam: ExamItem[]; userAnswers: UserAnswers } = req.body ?? {};

    if (!Array.isArray(exam) || exam.length === 0) {
      return res.status(400).json({ error: "`exam` must be a non-empty array." });
    }

    const report = await gradeExam(exam, userAnswers ?? {});
    res.json(report);
  })
);
