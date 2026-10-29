// study-ai/frontend/src/pages/Landing.tsx
import { Link } from "react-router-dom";
import { ArrowRight, FileUp, Sparkles, Target, Star, Check } from "lucide-react";

const STEPS = [
  {
    icon: FileUp,
    label: "Step 01",
    title: "Ingest",
    description: "Paste notes or upload a PDF/DOCX/TXT file.",
  },
  {
    icon: Sparkles,
    label: "Step 02",
    title: "Summarize",
    description: "Get key points or flashcards.",
  },
  {
    icon: Target,
    label: "Step 03",
    title: "Practice",
    description: "Take a quick multiple-choice exam on any saved note, graded instantly.",
  },
  {
    icon: Star,
    label: "Step 04",
    title: "Level up",
    description: "Earn XP, finish daily goals and keep your study streak going.",
  },
];

export function Landing() {
  return (
    <main className="landing">
      <section className="landing__hero">
        <span className="pill-badge pill-badge--xp">
          <Sparkles size={12} aria-hidden /> AI-powered studying
        </span>
        <h1>
          Turn your notes into a <span className="landing__gradient">study loop</span>
        </h1>
        <p className="landing__subtitle">
          Upload your notes, get an AI summary and flashcards, save them to your History, quiz yourself with an
          auto-graded exam, and earn XP as you go.
        </p>
        <div className="landing__cta">
          <Link to="/register" className="button landing__button">
            Get started <ArrowRight size={16} aria-hidden />
          </Link>
          <Link to="/login" className="button button--secondary landing__button">
            Log in
          </Link>
        </div>
      </section>

      <section className="landing__steps-section" aria-label="How it works">
        <span className="label-micro label-micro--muted">How it works</span>
        <ol className="landing__steps">
          {STEPS.map(({ icon: Icon, label, title, description }) => (
            <li key={title} className="landing__step">
              <div className="landing__step-icon">
                <Icon size={18} aria-hidden />
              </div>
              <span className="label-micro">{label}</span>
              <h3 className="landing__step-title">{title}</h3>
              <p className="landing__step-desc">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="panel panel--glow landing__final">
        <div>
          <h2>Ready to study smarter?</h2>
          <p className="landing__final-points">
            <span>
              <Check size={14} aria-hidden /> Free to start
            </span>
            <span>
              <Check size={14} aria-hidden /> Works with your own notes
            </span>
          </p>
        </div>
        <Link to="/register" className="button landing__button">
          Create your account <ArrowRight size={16} aria-hidden />
        </Link>
      </section>
    </main>
  );
}