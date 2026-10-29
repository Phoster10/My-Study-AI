import { useState } from "react";
import { api } from "../api/client";
import { useStudyStore } from "../store/useStudyStore";

const XP_PER_CORRECT_ANSWER = 10;

export function ExamPanel() {
  const { sourceText, exam, setExam, userAnswers, setAnswer, report, setReport } = useStudyStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xpAwarded, setXpAwarded] = useState<number | null>(null);

  async function handleGenerate() {
    if (!sourceText.trim()) {
      setError("Add some notes first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { exam } = await api.generateExam(sourceText);
      setExam(exam);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate exam.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      const report = await api.gradeExam(exam, userAnswers);
      setReport(report);

      // Feed each result back into the spaced-repetition scheduler, using
      // the question text as a lightweight "topic" key.
      await Promise.all(
        report.results.map((r) => api.submitReview(r.question.slice(0, 120), r.correct).catch(() => undefined))
      );

      // Award XP for correct answers. Failure here should never block the
      // student from seeing their grading report.
      const earned = report.results.filter((r) => r.correct).length * XP_PER_CORRECT_ANSWER;
      if (earned > 0) {
        try {
          await api.addXP(earned);
          setXpAwarded(earned);
        } catch {
          /* non-critical — the report itself already succeeded */
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grade exam.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>3. Practice exam</h2>

      {exam.length === 0 && (
        <button className="button" onClick={handleGenerate} disabled={busy}>
          {busy ? "Generating..." : "Generate 10-question exam"}
        </button>
      )}

      {error && <p className="error-text">{error}</p>}

      {exam.length > 0 && !report && (
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

              {q.type === "mcq" && q.options ? (
                <div className="exam__options">
                  {Object.entries(q.options).map(([letter, text]) => (
                    <label key={letter} className="exam__option">
                      <input
                        type="radio"
                        name={q.id}
                        value={letter}
                        checked={userAnswers[q.id] === letter}
                        onChange={() => setAnswer(q.id, letter)}
                      />
                      <span>
                        {letter}. {text}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  className="text-input"
                  type="text"
                  placeholder="Your answer"
                  value={userAnswers[q.id] ?? ""}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                />
              )}
            </div>
          ))}

          <button className="button" type="submit" disabled={busy}>
            {busy ? "Grading..." : "Submit exam"}
          </button>
        </form>
      )}

      {report && (
        <div className="report" data-testid="grading-report">
          <h3>
            Score: {report.score}/{report.total} ({report.percentage}%)
          </h3>
          <p>{report.feedback}</p>
          {xpAwarded !== null && <p className="badge badge--xp">+{xpAwarded} XP</p>}
          {report.needsManualReview && <p className="badge badge--warning">Some answers were flagged for manual review.</p>}

          <ul className="report__list">
            {report.results.map((r) => (
              <li key={r.questionId} className={r.correct ? "report__item report__item--correct" : "report__item report__item--incorrect"}>
                <p>{r.question}</p>
                <p className="report__meta">
                  Your answer: {r.userAnswer || "(blank)"} {!r.correct && <>— Correct: {r.correctAnswer}</>}
                </p>
                {r.explanation && <p className="report__explanation">{r.explanation}</p>}
              </li>
            ))}
          </ul>

          <button
            className="button button--secondary"
            onClick={() => {
              setExam([]);
              setReport(null);
              setXpAwarded(null);
            }}
          >
            Start a new exam
          </button>
        </div>
      )}
    </section>
  );
}
