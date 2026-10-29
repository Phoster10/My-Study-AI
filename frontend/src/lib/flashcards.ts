// study-ai/frontend/src/lib/flashcards.ts
export interface Flashcard {
  front: string;
  back: string;
}

/** Parses the "Front: ... ||| Back: ..." lines the backend produces for the
 * flashcard summary type. The saved summary text uses the same format, so the
 * same parser serves both the Home page and History. Tolerates numbering,
 * bullets and stray markdown, like the backend parser does. */
export function parseFlashcards(raw: string): Flashcard[] {
  const cards: Flashcard[] = [];

  for (const line of raw.split("\n")) {
    const cleaned = line
      .trim()
      .replace(/^(?:[-*•]|\d+[.)])\s*/, "")
      .replace(/\*\*/g, "");

    const match = cleaned.match(/^Front:\s*(.+?)\s*\|\|\|\s*Back:\s*(.+)$/i);
    if (!match) continue;

    const front = match[1].trim();
    const back = match[2].trim();
    if (front && back) cards.push({ front, back });
  }

  return cards;
}