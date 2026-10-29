import { useState } from "react";
import { X, FileQuestion } from "lucide-react";
import { api, type ExamQuestion, type GradingReport } from "../api/client";
import { useXP } from "../hooks/useXP";

const XP_PER_CORRECT_ANSWER = 10;

interface ExamModalProps {
  title: string;
  sourceText: string;
  onClose: () => void;
}

type Step = "choose" | "generating" | "taking" | "grading" | "graded";

/** Full-screen exam flow launched from a History entry. Always
 * multiple-choice (per request), and the student picks 5 or 10 questions
 * up front rather than always getting a fixed 10 mixed-format exam (that's
 * still what the standalone /exam route does, for a different flow). */
export function ExamModal({ title, sourceText, onClose }: ExamModalProps) {
  const { refresh: refreshXP } = useXP();
  const [step, setStep] = useState<Step>("choose");
  const [count, setCount] = useState<5 | 10>(5);
  const [exam, setExam] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [report, setReport] = useState<GradingReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setStep("generating");
    setError(null);
    try {
      const { exam } = await api.generateExam(sourceText, { count, mcqOnly: true });
      setExam(exam);
      setAnswers({});
      setStep("taking");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate exam.");
      setStep("choose");
    }
  }

  async function handleSubmit() {
    setStep("grading");
    setError(null);
    try {
      const report = await api.gradeExam(exam, answers);
      setReport(report);
      setStep("graded");

      const earned = report.results.filter((r) => r.correct).length * XP_PER_CORRECT_ANSWER;
      if (earned > 0) {
        await api.addXP(earned).catch(() => undefined);
        refreshXP();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grade exam.");
      setStep("taking");
    }
  }

  return (
    <div className="exam-modal" role="dialog" aria-modal="true" aria-label={`Exam on ${title}`}>
      <div className="exam-modal__header">
        <div className="xp-hub__title-row">
          <FileQuestion size={20} aria-hidden />
          <div>
            <h2>Exam: {title}</h2>
          </div>
        </div>
        <button className="topbar__icon-button" onClick={onClose} aria-label="Close exam">
          <X size={22} aria-hidden />
        </button>
      </div>

      <div className="exam-modal__body">
        {step === "choose" && (
          <div className="exam-modal__choose">
            <p>How many questions?</p>
            <div className="exam-modal__count-options">
              {([5, 10] as const).map((n) => (
                <button key={n} className={`button button--secondary${count === n ? " exam-modal__count--selected" : ""}`} onClick={() => setCount(n)}>
                  {n} questions
                </button>
              ))}
            </div>
            {error && <p className="error-text">{error}</p>}
            <button className="button" onClick={handleStart}>
              Start Exam
            </button>
          </div>
        )}

        {step === "generating" && <p className="page-loading">Generating your exam...</p>}

        {step === "taking" && (
          <form
            className="exam__form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            {exam.map((q, i) => (
              <div className="exam__question" key={q.id}>
                <p className="exam__question-text">
                  {i + 1}. {q.question}
                </p>
                <div className="exam__options">
                  {Object.entries(q.options ?? {}).map(([letter, text]) => (
                    <label key={letter} className="exam__option">
                      <input
                        type="radio"
                        name={q.id}
                        value={letter}
                        checked={answers[q.id] === letter}
                        onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: letter }))}
                      />
                      <span>
                        {letter}. {text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {error && <p className="error-text">{error}</p>}
            <button className="button" type="submit">
              Submit exam
            </button>
          </form>
        )}

        {step === "grading" && <p className="page-loading">Grading your answers...</p>}

        {step === "graded" && report && (
          <div className="report">
            <h3>
              Score: {report.score}/{report.total} ({report.percentage}%)
            </h3>
            <p>{report.feedback}</p>
            <ul className="report__list">
              {report.results.map((r) => (
                <li key={r.questionId} className={r.correct ? "report__item report__item--correct" : "report__item report__item--incorrect"}>
                  <p>{r.question}</p>
                  <p className="report__meta">
                    Your answer: {r.userAnswer || "(blank)"} {!r.correct && <>— Correct: {r.correctAnswer}</>}
                  </p>
                </li>
              ))}
            </ul>
            <button className="button" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
