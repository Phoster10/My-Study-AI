// study-ai/frontend/src/components/TopBar.tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, ChevronDown, UserCog, LogOut, Trash2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";
import { useStudyStore } from "../store/useStudyStore";
import { useDailyGoals } from "../hooks/useDailyGoals";
import { useXP } from "../hooks/useXP";
import { NotificationsMenu } from "./NotificationsMenu";

function initialsOf(email: string | undefined): string {
  if (!email) return "?";
  const name = email.split("@")[0];
  return name.slice(0, 2).toUpperCase();
}

export function TopBar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const setSearchResult = useStudyStore((s) => s.setSearchResult);
  const { complete } = useDailyGoals();
  const { refresh: refreshXP } = useXP();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmingDelete(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    function onShortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("global-search")?.focus();
      }
    }
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

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
      await complete("ai");
      refreshXP();
      if (window.location.pathname !== "/dashboard") navigate("/dashboard");
    } catch {
      setSearchResult("Search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAccount();
      await signOut();
      navigate("/");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account.");
      setDeleting(false);
    }
  }

  return (
    <header className="topbar">
      <div className="topbar__search">
        <Search size={16} className="topbar__search-icon" onClick={handleSearch} aria-hidden />
        <input
          id="global-search"
          type="text"
          placeholder="Ask AI about any topic..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
        />
        <kbd className="topbar__kbd">{searching ? "..." : "Ctrl + K"}</kbd>
      </div>

      <div className="topbar__actions">
        <NotificationsMenu />

        <div className="topbar__avatar-menu" ref={menuRef}>
          <button className="topbar__avatar-button" onClick={() => setMenuOpen((v) => !v)}>
            <span className="topbar__avatar">{initialsOf(user?.email)}</span>
            <span className="topbar__avatar-name">{user?.email?.split("@")[0] ?? "Guest"}</span>
            <ChevronDown size={14} aria-hidden />
          </button>

          {menuOpen && !confirmingDelete && (
            <div className="topbar__dropdown">
              <Link to="/account" onClick={() => setMenuOpen(false)}>
                <UserCog size={14} aria-hidden /> Account settings
              </Link>
              <button
                onClick={async () => {
                  setMenuOpen(false);
                  await signOut();
                  navigate("/");
                }}
              >
                <LogOut size={14} aria-hidden /> Sign out
              </button>
              <button className="topbar__dropdown-danger" onClick={() => setConfirmingDelete(true)}>
                <Trash2 size={14} aria-hidden /> Delete account
              </button>
            </div>
          )}

          {menuOpen && confirmingDelete && (
            <div className="topbar__dropdown topbar__dropdown--confirm">
              <p>Delete your account? This cannot be undone — all your notes, XP and progress will be lost.</p>
              {deleteError && <p className="error-text">{deleteError}</p>}
              <div className="topbar__dropdown-confirm-row">
                <button onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                  Cancel
                </button>
                <button className="topbar__dropdown-danger" onClick={handleDeleteAccount} disabled={deleting}>
                  {deleting ? "Deleting..." : "Yes, delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}