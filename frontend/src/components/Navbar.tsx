import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";
import { useStudyStore } from "../store/useStudyStore";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const setSearchResult = useStudyStore((s) => s.setSearchResult);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    if (!user) {
      navigate("/login");
      return;
    }
    setSearching(true);
    try {
      const { result } = await api.search(query);
      setSearchResult(result);
      if (window.location.pathname !== "/dashboard") navigate("/dashboard");
    } catch {
      setSearchResult("Search failed.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand">
        Study AI
      </Link>

      <div className="navbar__search">
        <span className="navbar__search-icon" onClick={handleSearch} aria-hidden>
          {searching ? "⏳" : "🔍"}
        </span>
        <input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
      </div>

      <nav className="navbar__links">
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            <button
              className="navbar__link-button"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Log in</Link>
            <Link to="/register" className="navbar__cta">
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
