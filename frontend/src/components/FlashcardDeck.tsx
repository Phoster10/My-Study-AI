// study-ai/frontend/src/components/FlashcardDeck.tsx
import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle } from "lucide-react";
import type { Flashcard } from "../lib/flashcards";

interface Props {
  cards: Flashcard[];
}

/**
 * An animated flashcard deck: click (or press Enter/Space on) the card to flip
 * it in 3D, step through with Prev/Next or the arrow keys, shuffle, and watch
 * the progress bar fill. Animations are plain CSS (see .flashcard* in
 * styles.css) and are switched off for users who prefer reduced motion.
 */
export function FlashcardDeck({ cards }: Props) {
  const [order, setOrder] = useState(() => cards.map((_, i) => i));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  if (cards.length === 0) return null;

  const total = order.length;
  const cardIndex = order[position];
  const card = cards[cardIndex];

  function go(delta: 1 | -1) {
    const next = position + delta;
    if (next < 0 || next >= total) return;
    setDirection(delta === 1 ? "next" : "prev");
    setFlipped(false);
    setPosition(next);
  }

  function restart() {
    setDirection("prev");
    setFlipped(false);
    setPosition(0);
  }

  function shuffle() {
    const next = cards.map((_, i) => i);
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOrder(next);
    setDirection("next");
    setFlipped(false);
    setPosition(0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    }
  }

  return (
    <div className="flashcard-deck" data-testid="flashcard-deck" role="group" aria-label="Flashcards" onKeyDown={handleKeyDown}>
      <div className="flashcard-deck__progress" aria-hidden>
        <div className="flashcard-deck__progress-bar" style={{ width: `${((position + 1) / total) * 100}%` }} />
      </div>
      <p className="flashcard-deck__count" aria-live="polite">
        Card {position + 1} of {total}
      </p>

      {/* Keyed by card so each new card mounts fresh (unflipped) and plays the slide-in. */}
      <div key={`${position}-${cardIndex}`} className={`flashcard-stage flashcard-stage--${direction}`}>
        <button
          type="button"
          className={`flashcard${flipped ? " flashcard--flipped" : ""}`}
          onClick={() => setFlipped((f) => !f)}
          aria-pressed={flipped}
        >
          <span className="flashcard__inner">
            <span className="flashcard__face flashcard__face--front" aria-hidden={flipped}>
              <span className="flashcard__label">Question</span>
              <span className="flashcard__text">{card.front}</span>
              <span className="flashcard__hint">Click to flip</span>
            </span>
            <span className="flashcard__face flashcard__face--back" aria-hidden={!flipped}>
              <span className="flashcard__label">Answer</span>
              <span className="flashcard__text">{card.back}</span>
              <span className="flashcard__hint">Click to flip back</span>
            </span>
          </span>
        </button>
      </div>

      <div className="flashcard-deck__controls">
        <button type="button" className="button button--secondary" onClick={() => go(-1)} disabled={position === 0}>
          <ChevronLeft size={16} aria-hidden /> Prev
        </button>
        <button type="button" className="button button--secondary" onClick={shuffle}>
          <Shuffle size={16} aria-hidden /> Shuffle
        </button>
        <button type="button" className="button button--secondary" onClick={restart} disabled={position === 0}>
          <RotateCcw size={16} aria-hidden /> Restart
        </button>
        <button type="button" className="button" onClick={() => go(1)} disabled={position === total - 1}>
          Next <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}