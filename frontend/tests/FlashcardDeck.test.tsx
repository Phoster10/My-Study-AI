// study-ai/frontend/tests/FlashcardDeck.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlashcardDeck } from "../src/components/FlashcardDeck";
import { parseFlashcards } from "../src/lib/flashcards";

const cards = [
  { front: "What is ATP?", back: "The cell's energy currency." },
  { front: "Where is ATP made?", back: "Mostly in the mitochondria." },
  { front: "What is a ribosome?", back: "A protein-building structure." },
];

describe("FlashcardDeck", () => {
  it("renders nothing for an empty deck", () => {
    const { container } = render(<FlashcardDeck cards={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("starts on the first card, unflipped, with progress shown", () => {
    render(<FlashcardDeck cards={cards} />);
    expect(screen.getByText("Card 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("What is ATP?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /question/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("flips to the answer (and back) when the card is clicked", () => {
    render(<FlashcardDeck cards={cards} />);
    const card = screen.getByRole("button", { name: /question/i });
    fireEvent.click(card);
    expect(card).toHaveClass("flashcard--flipped");
    expect(card).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(card);
    expect(card).not.toHaveClass("flashcard--flipped");
  });

  it("moves with Next/Prev, shows each card unflipped, and disables the ends", () => {
    render(<FlashcardDeck cards={cards} />);
    const prev = screen.getByRole("button", { name: /prev/i });
    const next = screen.getByRole("button", { name: /next/i });
    expect(prev).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /question/i })); // flip card 1
    fireEvent.click(next);
    expect(screen.getByText("Card 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("Where is ATP made?")).toBeInTheDocument();
    expect(document.querySelector(".flashcard")).not.toHaveClass("flashcard--flipped");

    fireEvent.click(next);
    expect(screen.getByText("Card 3 of 3")).toBeInTheDocument();
    expect(next).toBeDisabled();

    fireEvent.click(prev);
    expect(screen.getByText("Card 2 of 3")).toBeInTheDocument();
  });

  it("supports the arrow keys", () => {
    render(<FlashcardDeck cards={cards} />);
    const group = screen.getByRole("group", { name: "Flashcards" });
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(screen.getByText("Card 2 of 3")).toBeInTheDocument();
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(screen.getByText("Card 1 of 3")).toBeInTheDocument();
  });

  it("restarts at the first card", () => {
    render(<FlashcardDeck cards={cards} />);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    fireEvent.click(screen.getByRole("button", { name: /restart/i }));
    expect(screen.getByText("Card 1 of 3")).toBeInTheDocument();
  });

  it("shuffles without losing or duplicating cards", () => {
    render(<FlashcardDeck cards={cards} />);
    fireEvent.click(screen.getByRole("button", { name: /shuffle/i }));
    expect(screen.getByText("Card 1 of 3")).toBeInTheDocument();
    const seen = new Set<string>();
    for (let i = 0; i < 3; i++) {
      seen.add(document.querySelector(".flashcard__face--front .flashcard__text")!.textContent!);
      if (i < 2) fireEvent.click(screen.getByRole("button", { name: /next/i }));
    }
    expect(seen).toEqual(new Set(cards.map((c) => c.front)));
  });

  it("fills the progress bar as you advance", () => {
    render(<FlashcardDeck cards={cards} />);
    const bar = document.querySelector(".flashcard-deck__progress-bar") as HTMLElement;
    expect(bar.style.width).toBe(`${(1 / 3) * 100}%`);
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(bar.style.width).toBe(`${(2 / 3) * 100}%`);
  });
});

describe("parseFlashcards", () => {
  it("parses Front/Back lines, tolerating numbering, bullets and bold", () => {
    const raw = [
      "Front: What is ATP? ||| Back: Energy currency.",
      "2. Front: Where is it made? ||| Back: Mitochondria.",
      "- **Front:** nope",
      "- Front: Who? ||| Back: Me.",
      "random chatter",
    ].join("\n");
    expect(parseFlashcards(raw)).toEqual([
      { front: "What is ATP?", back: "Energy currency." },
      { front: "Where is it made?", back: "Mitochondria." },
      { front: "Who?", back: "Me." },
    ]);
  });

  it("returns an empty list for non-flashcard text", () => {
    expect(parseFlashcards("- a bullet\n- another bullet")).toEqual([]);
  });
});