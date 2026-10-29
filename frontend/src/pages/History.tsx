// study-ai/frontend/src/pages/History.tsx
import { useEffect, useState } from "react";
import { Clock, FileText, Trash2, FileQuestion, ChevronDown, ChevronUp } from "lucide-react";
import { api, type SummaryListItem, type SavedSummary } from "../api/client";
import { ExamModal } from "../components/ExamModal";
import { FlashcardDeck } from "../components/FlashcardDeck";
import { parseFlashcards } from "../lib/flashcards";

/** Saved flashcard sets come back as animated cards; every other type is plain text. */
function HistoryOutput({ summaryType, text }: { summaryType: string; text: string }) {
  const cards = summaryType === "flashcard" ? parseFlashcards(text) : [];
  if (cards.length > 0) return <FlashcardDeck cards={cards} />;
  return <pre className="summary__output">{text}</pre>;
}

export function History() {
  const [items, setItems] = useState<SummaryListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SavedSummary | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [examTarget, setExamTarget] = useState<SavedSummary | null>(null);

  useEffect(() => {
    api
      .listSummaries()
      .then((res) => setItems(res.summaries))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load history."));
  }, []);

  async function toggleOpen(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    setDetail(null);
    setDetailError(null);
    try {
      const full = await api.getSummary(id);
      setDetail(full);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load this note.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.deleteSummary(id);
      setItems((prev) => (prev ?? []).filter((i) => i.id !== id));
      if (openId === id) {
        setOpenId(null);
        setDetail(null);
      }
    } catch {
      /* leave the item in place; the list refetch on next visit will reconcile */
    }
  }

  if (examTarget) {
    return <ExamModal title={examTarget.title} sourceText={examTarget.source_text} onClose={() => setExamTarget(null)} />;
  }

  return (
    <div className="page-header-wrap">
      <h1 className="page-title">History</h1>

      {error && <p className="error-text">{error}</p>}

      {items && items.length === 0 && (
        <div className="panel coming-soon">
          <Clock size={40} aria-hidden />
          <h2>No saved summaries yet</h2>
          <p>Generate a summary on the Home page and click "Save Summary" to see it here.</p>
        </div>
      )}

      <div className="history-list">
        {items?.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div key={item.id} className="panel history-item">
              <button className="history-item__header" onClick={() => toggleOpen(item.id)}>
                <FileText size={18} aria-hidden />
                <div className="history-item__meta">
                  <p className="history-item__title">{item.title}</p>
                  <p className="panel__hint">
                    {item.summary_type} · {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                {isOpen ? <ChevronUp size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
              </button>

              {isOpen && (
                <div className="history-item__detail">
                  {detailError && <p className="error-text">{detailError}</p>}
                  {!detail && !detailError && <p className="panel__hint">Loading...</p>}
                  {detail && (
                    <>
                      <HistoryOutput summaryType={detail.summary_type} text={detail.summary_text} />
                      <div className="history-item__actions">
                        <button className="button" onClick={() => setExamTarget(detail)}>
                          <FileQuestion size={16} aria-hidden /> Take Exam
                        </button>
                        <button className="button button--secondary" onClick={() => handleDelete(item.id)}>
                          <Trash2 size={16} aria-hidden /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}