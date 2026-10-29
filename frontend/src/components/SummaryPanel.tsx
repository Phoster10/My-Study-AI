import { useState } from "react";
import { api } from "../api/client";
import { useStudyStore } from "../store/useStudyStore";

const SUMMARY_TYPES = [
  { value: "bullet", label: "Bullet points" },
  { value: "detailed", label: "Detailed" },
  { value: "compressed", label: "Compressed" },
  { value: "flashcard", label: "Flashcards" },
];

export function SummaryPanel() {
  const { sourceText, summary, setSummary } = useStudyStore();
  const [type, setType] = useState("bullet");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSummarize() {
    if (!sourceText.trim()) {
      setError("Add some notes first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { summary } = await api.summarize(sourceText, type);
      setSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>2. Summarize</h2>

      <div className="summary__controls">
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {SUMMARY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button className="button" onClick={handleSummarize} disabled={busy}>
          {busy ? "Summarizing..." : "Summarize"}
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      {summary && (
        <pre className="summary__output" data-testid="summary-output">
          {summary}
        </pre>
      )}
    </section>
  );
}
