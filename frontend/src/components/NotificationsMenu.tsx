// study-ai/frontend/src/components/NotificationsMenu.tsx
import { useEffect, useRef, useState } from "react";
import { Bell, UploadCloud, Sparkles, Layers, Search, Save, FileQuestion, Star, X } from "lucide-react";
import { DAILY_GOALS } from "../hooks/useDailyGoals";

const SEEN_KEY = "study-ai:guide-seen";

const xpFor = (key: string) => DAILY_GOALS.find((g) => g.key === key)?.xp;

const FUNCTIONS = [
  {
    icon: UploadCloud,
    title: "Add your notes",
    description: "On Home, upload a PDF, DOCX or TXT file or paste your notes straight in.",
    xp: xpFor("upload"),
  },
  {
    icon: Sparkles,
    title: "Summarize with AI",
    description: "Choose bullet points, a short summary or a structured AI summary of your notes.",
    xp: xpFor("summary"),
  },
  {
    icon: Layers,
    title: "Flashcards",
    description: "Turn notes into question & answer cards. Click a card to flip it, then shuffle or step through the deck.",
  },
  {
    icon: Search,
    title: "Ask AI anything",
    description: "Use the search bar (Ctrl + K) to ask about any topic and get an answer on your dashboard.",
    xp: xpFor("ai"),
  },
  {
    icon: Save,
    title: "Save to History",
    description: "Save a summary or flashcard set, then reopen it any time from History.",
  },
  {
    icon: FileQuestion,
    title: "Practice exams",
    description: "From a saved note in History, tap Take Exam for a 5 or 10 question multiple-choice test. Earn XP for each correct answer.",
  },
  {
    icon: Star,
    title: "XP, levels & daily goals",
    description: "Every action earns XP. Fill the level bar (500 XP per level) and finish the daily goals in the XP Hub.",
  },
];

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) === "true";
    } catch {
      return false;
    }
  });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    setOpen((v) => !v);
    if (!seen) {
      setSeen(true);
      try {
        localStorage.setItem(SEEN_KEY, "true");
      } catch {
        /* storage unavailable: the dot just comes back next visit */
      }
    }
  }

  return (
    <div className="notifications" ref={ref}>
      <button
        className="topbar__icon-button"
        aria-label="Notifications"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggle}
      >
        <Bell size={18} aria-hidden />
        {!seen && <span className="topbar__notification-dot" />}
      </button>

      {open && (
        <div className="notifications__panel" role="dialog" aria-label="What you can do in Study AI">
          <div className="notifications__header">
            <div>
              <span className="label-micro">Welcome to Study AI</span>
              <h3>What you can do here</h3>
            </div>
            <button className="topbar__icon-button" aria-label="Close" onClick={() => setOpen(false)}>
              <X size={16} aria-hidden />
            </button>
          </div>

          <ul className="notifications__list">
            {FUNCTIONS.map(({ icon: Icon, title, description, xp }) => (
              <li key={title} className="notifications__item">
                <span className="notifications__icon">
                  <Icon size={16} aria-hidden />
                </span>
                <div>
                  <p className="notifications__title">
                    {title}
                    {xp !== undefined && <span className="pill-badge pill-badge--xp">+{xp} XP</span>}
                  </p>
                  <p className="notifications__desc">{description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}