import { useStudyStore } from "../store/useStudyStore";

/** Restored from the original's search mode: a free-form "ask anything"
 * result, distinct from the notes summarizer. Triggered from the search
 * bar in the Navbar (see components/Navbar.tsx), which is why this reads
 * from the shared store rather than owning its own state. */
export function SearchResults() {
  const { searchResult, setSearchResult } = useStudyStore();

  if (!searchResult) return null;

  return (
    <section className="panel panel--glow">
      <div className="search-results__header">
        <h2>Search result</h2>
        <button className="navbar__link-button" onClick={() => setSearchResult(null)}>
          ✕ Dismiss
        </button>
      </div>
      <p className="search-results__body">{searchResult}</p>
    </section>
  );
}
