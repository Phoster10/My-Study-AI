// study-ai/frontend/src/pages/Home.tsx
import { useMemo, useRef, useState } from "react";
import { UploadCloud, FileText, Sparkles, Zap, Brain, Target, List, AlignLeft, Layers, Save, Check } from "lucide-react";
import { api } from "../api/client";
import { useStudyStore } from "../store/useStudyStore";
import { useDailyGoals } from "../hooks/useDailyGoals";
import { useXP } from "../hooks/useXP";
import { incrementNotesSummarized } from "../hooks/useActivityStats";
import { SearchResults } from "../components/SearchResults";
import { FlashcardDeck } from "../components/FlashcardDeck";
import { parseFlashcards } from "../lib/flashcards";

const SUMMARY_TYPES = [
  { value: "bullet", label: "Bullet Points", description: "Key points in a clear list.", icon: List },
  { value: "compressed", label: "Short Summary", description: "A concise overview.", icon: AlignLeft },
  { value: "detailed", label: "AI Summary", description: "Smart and structured.", icon: Sparkles },
  { value: "flashcard", label: "Flashcards", description: "Question & answer pairs.", icon: Layers },
];

const MAX_CHARS = 10000;

function defaultTitle(sourceText: string): string {
  const firstLine = sourceText.trim().split("\n")[0]?.slice(0, 60);
  return firstLine || "Untitled note";
}

export function Home() {
  const { sourceText, setSourceText, summary, setSummary } = useStudyStore();
  const { complete } = useDailyGoals();
  const { refresh: refreshXP } = useXP();
  const outputRef = useRef<HTMLElement>(null);

  const [type, setType] = useState("bullet");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // What type the current output was generated as (the radio can change afterwards).
  const [generatedType, setGeneratedType] = useState<string | null>(null);

  // Always starts empty — only ever holds what the user types.
  const [saveTitle, setSaveTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const cards = useMemo(() => parseFlashcards(summary), [summary]);
  const isFlashcards = cards.length > 0;

  async function ingestFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { text } = await api.ingestFile(file);
      setSourceText(text.slice(0, MAX_CHARS));
      await complete("upload");
      refreshXP();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate() {
    if (!sourceText.trim()) {
      setError("Upload or paste your notes first.");
      return;
    }
    setGenerating(true);
    setError(null);
    setSaved(false);
    setSaveError(null);
    setSaveTitle("");
    // Scroll to the output panel right away, so the loading state (and then
    // the result) is visible without the user having to scroll manually.
    outputRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    try {
      const { summary } = await api.summarize(sourceText, type);
      setSummary(summary);
      setGeneratedType(type);
      incrementNotesSummarized();
      await complete("summary");
      refreshXP();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await api.saveSummary({
        // The field itself stays empty; if the user never named the note,
        // History still gets a meaningful title taken from the notes.
        title: saveTitle.trim() || defaultTitle(sourceText),
        summaryType: isFlashcards ? "flashcard" : generatedType ?? type,
        sourceText,
        summaryText: summary,
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save summary.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="home-page">
      <SearchResults />
      <div className="home">
        <div className="home__main">
          <section className="panel">
            <h2>Choose Summary Type</h2>
            <p className="panel__hint">Select how you want your notes to be summarized.</p>

            <div className="summary-type-grid">
              {SUMMARY_TYPES.map(({ value, label, description, icon: Icon }) => (
                <label key={value} className={`summary-type-card${type === value ? " summary-type-card--selected" : ""}`}>
                  <input type="radio" name="summary-type" value={value} checked={type === value} onChange={() => setType(value)} />
                  <Icon size={16} aria-hidden />
                  <span className="summary-type-card__label">{label}</span>
                  <span className="summary-type-card__desc">{description}</span>
                  <span className="summary-type-card__radio" aria-hidden />
                </label>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="home__upload-header">
              <UploadCloud size={18} aria-hidden />
              <div>
                <h2>Upload or paste your notes</h2>
                <p className="panel__hint">You can upload a file (PDF, DOCX, TXT) or paste your text below.</p>
              </div>
            </div>

            <label
              className={`dropzone${dragOver ? " dropzone--active" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) ingestFile(file);
              }}
            >
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) ingestFile(file);
                }}
              />
              <UploadCloud size={28} aria-hidden />
              <p className="dropzone__title">{uploading ? "Extracting text..." : "Upload or paste your notes"}</p>
              <p className="dropzone__subtitle">Drag and drop, or click to browse</p>
              <div className="dropzone__badges">
                <span>
                  <FileText size={12} aria-hidden /> PDF
                </span>
                <span>
                  <FileText size={12} aria-hidden /> DOCX
                </span>
                <span>
                  <FileText size={12} aria-hidden /> TXT
                </span>
              </div>
            </label>

            <div className="home__divider">
              <span>OR</span>
            </div>

            <div className="home__paste-wrap">
              <textarea
                className="textarea"
                placeholder="Paste your notes here..."
                value={sourceText}
                maxLength={MAX_CHARS}
                onChange={(e) => setSourceText(e.target.value)}
                rows={7}
              />
              <span className="home__char-count">
                {sourceText.length}/{MAX_CHARS}
              </span>
            </div>

            {error && <p className="error-text">{error}</p>}

            <button className="button button--full" onClick={handleGenerate} disabled={generating}>
              <Sparkles size={16} aria-hidden /> {generating ? "Generating..." : "Generate Summary"}
            </button>
          </section>

          <div className="tip-card">
            <Zap size={16} aria-hidden />
            <div>
              <p>Small steps</p>
              <p>create big results.</p>
            </div>
          </div>
        </div>

        <aside className="home__output panel" ref={outputRef}>
          {generating ? (
            <div className="home__output-empty">
              <Sparkles size={56} aria-hidden className="home__output-spinner" />
              <h3>Generating your summary...</h3>
            </div>
          ) : summary ? (
            <>
              <h2>{isFlashcards ? "Your flashcards" : "Your summary"}</h2>
              {isFlashcards ? (
                <FlashcardDeck key={summary} cards={cards} />
              ) : (
                <pre className="summary__output" data-testid="summary-output">
                  {summary}
                </pre>
              )}

              <div className="home__save-row">
                <input
                  className="text-input"
                  type="text"
                  placeholder="Name this note..."
                  autoComplete="off"
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  disabled={saved}
                />
                <button className="button button--secondary" onClick={handleSave} disabled={saving || saved}>
                  {saved ? (
                    <>
                      <Check size={16} aria-hidden /> Saved
                    </>
                  ) : (
                    <>
                      <Save size={16} aria-hidden /> {saving ? "Saving..." : "Save Summary"}
                    </>
                  )}
                </button>
              </div>
              {saved && <p className="info-text">Saved — find it in History.</p>}
              {saveError && <p className="error-text">{saveError}</p>}
            </>
          ) : (
            <div className="home__output-empty">
              <FileText size={56} aria-hidden />
              <h3>Your summary will appear here</h3>
              <p>Upload your notes or paste your text, choose a summary type, and click "Generate Summary" to get started.</p>

              <div className="home__output-features">
                <div>
                  <Zap size={16} aria-hidden />
                  <p className="label-micro">Save time</p>
                  <p className="home__output-feature-desc">Focus on learning, not reading.</p>
                </div>
                <div>
                  <Brain size={16} aria-hidden />
                  <p className="label-micro">Better retention</p>
                  <p className="home__output-feature-desc">Key points, clear and structured.</p>
                </div>
                <div>
                  <Target size={16} aria-hidden />
                  <p className="label-micro">Achieve more</p>
                  <p className="home__output-feature-desc">Turn your notes into progress.</p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}