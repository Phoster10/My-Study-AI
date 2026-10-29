import { useState } from "react";
import { Brain, FileText, Search, Star, Clock, X } from "lucide-react";

const SEEN_KEY = "study-ai:onboarding-seen";

const STEPS = [
  {
    icon: Brain,
    title: "Welcome to Study AI",
    body: "Turn your notes into a study loop: summarize, test yourself with a quick exam, and earn XP as you study.",
  },
  {
    icon: FileText,
    title: "Add notes and summarize",
    body: "On the Home page, upload a PDF/DOCX/TXT file or paste text, pick a summary style — Bullet Points, Short Summary, AI Summary, or Flashcards — and click Generate Summary.",
  },
  {
    icon: Search,
    title: "Ask AI anything",
    body: "The search bar at the top isn't for your notes — it's a free-form AI Q&A. Ask about any topic and get a quick, clear answer.",
  },
  {
    icon: Star,
    title: "Earn XP and level up",
    body: "Uploading files, generating summaries, and using AI search all earn XP, every time. Check the XP tab to see your level and daily goals.",
  },
  {
    icon: Clock,
    title: "Build your History",
    body: "Save a summary and it shows up in History, where you can revisit it later or take a multiple-choice exam on it any time.",
  },
];

export function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "true";
  } catch {
    return true; // if storage is unavailable, don't block the UI with an onboarding modal
  }
}

function markOnboardingSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "true");
  } catch {
    /* ignore */
  }
}

export function OnboardingModal({ onDone }: { onDone: () => void }) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const Icon = step.icon;

  function finish() {
    markOnboardingSeen();
    onDone();
  }

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Welcome tour">
      <div className="onboarding-card">
        <button className="onboarding-card__close" onClick={finish} aria-label="Skip tour">
          <X size={18} aria-hidden />
        </button>

        <Icon size={40} aria-hidden className="onboarding-card__icon" />
        <h2>{step.title}</h2>
        <p>{step.body}</p>

        <div className="onboarding-card__dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`onboarding-card__dot${i === stepIndex ? " onboarding-card__dot--active" : ""}`} />
          ))}
        </div>

        <div className="onboarding-card__actions">
          {stepIndex > 0 ? (
            <button className="button button--secondary" onClick={() => setStepIndex((i) => i - 1)}>
              Back
            </button>
          ) : (
            <button className="button button--secondary" onClick={finish}>
              Skip
            </button>
          )}
          <button className="button" onClick={isLast ? finish : () => setStepIndex((i) => i + 1)}>
            {isLast ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
