import { useState } from "react";
import { api } from "../api/client";
import { useStudyStore } from "../store/useStudyStore";

export function IngestPanel() {
  const { sourceText, setSourceText } = useStudyStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const { text } = await api.ingestFile(file);
      setSourceText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h2>1. Add your notes</h2>
      <p className="panel__hint">Paste text, or upload a .pdf / .docx / .txt file.</p>

      <textarea
        className="textarea"
        rows={8}
        placeholder="Paste your notes here..."
        value={sourceText}
        onChange={(e) => setSourceText(e.target.value)}
      />

      <div className="ingest__file-row">
        <input
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        {busy && <span className="badge badge--busy">Extracting text...</span>}
      </div>

      {error && <p className="error-text">{error}</p>}
    </section>
  );
}
