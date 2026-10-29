// study-ai/frontend/tests/Home.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Home } from "../src/pages/Home";
import { useStudyStore } from "../src/store/useStudyStore";
import { api } from "../src/api/client";

vi.mock("../src/api/client", () => ({
  api: { ingestFile: vi.fn(), summarize: vi.fn(), addXP: vi.fn(), getXP: vi.fn(), saveSummary: vi.fn() },
}));

beforeEach(() => {
  useStudyStore.getState().reset();
  localStorage.clear();
  vi.mocked(api.ingestFile).mockReset();
  vi.mocked(api.summarize).mockReset();
  vi.mocked(api.addXP).mockReset().mockResolvedValue({ success: true, xp: 20 });
  vi.mocked(api.getXP).mockReset().mockResolvedValue({ xp: 20 });
  vi.mocked(api.saveSummary).mockReset().mockResolvedValue({ id: "sum-1", title: "x", summary_type: "bullet", created_at: "2026-01-01" });
  Element.prototype.scrollIntoView = vi.fn(); // not implemented in jsdom
});

describe("Home", () => {
  it("shows the empty-state placeholder with the three feature bullets when there is no summary yet", () => {
    render(<Home />);
    expect(screen.getByText("Your summary will appear here")).toBeInTheDocument();
    expect(screen.getByText("Save time")).toBeInTheDocument();
    expect(screen.getByText("Better retention")).toBeInTheDocument();
    expect(screen.getByText("Achieve more")).toBeInTheDocument();
  });

  it("offers all four summary types including Flashcards", () => {
    render(<Home />);
    for (const label of ["Bullet Points", "Short Summary", "AI Summary", "Flashcards"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("defaults to the Bullet Points summary type selected", () => {
    render(<Home />);
    const bulletInput = screen.getByDisplayValue("bullet") as HTMLInputElement;
    expect(bulletInput.checked).toBe(true);
  });

  it("switches the selected summary type on click, including Flashcards", () => {
    render(<Home />);
    fireEvent.click(screen.getByText("Flashcards"));
    const flashcardInput = screen.getByDisplayValue("flashcard") as HTMLInputElement;
    expect(flashcardInput.checked).toBe(true);
  });

  it("requires notes before generating a summary", async () => {
    render(<Home />);
    fireEvent.click(screen.getByText("Generate Summary"));
    expect(await screen.findByText(/upload or paste your notes first/i)).toBeInTheDocument();
    expect(api.summarize).not.toHaveBeenCalled();
  });

  it("scrolls the output panel into view as soon as Generate is clicked", async () => {
    useStudyStore.getState().setSourceText("Mitochondria are the powerhouse of the cell.");
    vi.mocked(api.summarize).mockResolvedValue({ summary: "- Mitochondria produce energy" });
    render(<Home />);
    fireEvent.click(screen.getByText("Generate Summary"));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId("summary-output")).toBeInTheDocument());
  });

  it("generates a summary, awards XP every time (not just once), and shows the result", async () => {
    useStudyStore.getState().setSourceText("Mitochondria are the powerhouse of the cell.");
    vi.mocked(api.summarize).mockResolvedValue({ summary: "- Mitochondria produce energy" });
    render(<Home />);
    fireEvent.click(screen.getByText("Generate Summary"));
    await waitFor(() => expect(screen.getByTestId("summary-output")).toHaveTextContent("Mitochondria produce energy"));
    expect(api.addXP).toHaveBeenCalledWith(20);
  });

  it("uploads a file via the dropzone input and awards the upload XP", async () => {
    vi.mocked(api.ingestFile).mockResolvedValue({ text: "Extracted notes text", source: "pdf" });
    const { container } = render(<Home />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "notes.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(useStudyStore.getState().sourceText).toBe("Extracted notes text"));
    expect(api.addXP).toHaveBeenCalledWith(25);
  });

  it("shows an error and does not award XP when upload fails", async () => {
    vi.mocked(api.ingestFile).mockRejectedValue(new Error("Unsupported file type"));
    const { container } = render(<Home />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(["x"], "a.png", { type: "image/png" })] } });
    expect(await screen.findByText("Unsupported file type")).toBeInTheDocument();
    expect(api.addXP).not.toHaveBeenCalled();
  });

  it("enforces the 10000-character textarea limit", () => {
    render(<Home />);
    const textarea = screen.getByPlaceholderText("Paste your notes here...") as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(10000);
  });

  it("leaves the note name empty after generating, until the user types something", async () => {
    useStudyStore.getState().setSourceText("Mitochondria are the powerhouse of the cell.");
    vi.mocked(api.summarize).mockResolvedValue({ summary: "- Mitochondria produce energy" });
    render(<Home />);
    fireEvent.click(screen.getByText("Generate Summary"));
    await waitFor(() => expect(screen.getByTestId("summary-output")).toBeInTheDocument());

    const titleInput = screen.getByPlaceholderText("Name this note...") as HTMLInputElement;
    expect(titleInput.value).toBe("");

    fireEvent.change(titleInput, { target: { value: "Cell biology" } });
    expect(titleInput.value).toBe("Cell biology");
  });

  it("clears a typed note name when a new summary is generated", async () => {
    useStudyStore.getState().setSourceText("Mitochondria are the powerhouse of the cell.");
    vi.mocked(api.summarize).mockResolvedValue({ summary: "- Mitochondria produce energy" });
    render(<Home />);
    fireEvent.click(screen.getByText("Generate Summary"));
    await waitFor(() => expect(screen.getByTestId("summary-output")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Name this note..."), { target: { value: "Cell biology" } });

    fireEvent.click(screen.getByText("Generate Summary"));
    await waitFor(() => expect((screen.getByPlaceholderText("Name this note...") as HTMLInputElement).value).toBe(""));
  });

  it("saves under the name the user typed", async () => {
    useStudyStore.getState().setSourceText("Mitochondria are the powerhouse of the cell.");
    vi.mocked(api.summarize).mockResolvedValue({ summary: "- Mitochondria produce energy" });
    render(<Home />);
    fireEvent.click(screen.getByText("Generate Summary"));
    await waitFor(() => expect(screen.getByTestId("summary-output")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText("Name this note..."), { target: { value: "  Cell biology  " } });
    fireEvent.click(screen.getByText("Save Summary"));
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    expect(api.saveSummary).toHaveBeenCalledWith({
      title: "Cell biology",
      summaryType: "bullet",
      sourceText: "Mitochondria are the powerhouse of the cell.",
      summaryText: "- Mitochondria produce energy",
    });
    expect(screen.getByText(/find it in history/i)).toBeInTheDocument();
  });

  it("falls back to a title from the notes when saving without typing a name (field stays empty)", async () => {
    useStudyStore.getState().setSourceText("Mitochondria are the powerhouse of the cell.");
    vi.mocked(api.summarize).mockResolvedValue({ summary: "- Mitochondria produce energy" });
    render(<Home />);
    fireEvent.click(screen.getByText("Generate Summary"));
    await waitFor(() => expect(screen.getByTestId("summary-output")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Save Summary"));
    await waitFor(() => expect(screen.getByText("Saved")).toBeInTheDocument());
    expect(api.saveSummary).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Mitochondria are the powerhouse of the cell." })
    );
    expect((screen.getByPlaceholderText("Name this note...") as HTMLInputElement).value).toBe("");
  });

  it("renders flashcard output as an animated deck instead of raw text, and saves it as a flashcard note", async () => {
    useStudyStore.getState().setSourceText("Mitochondria are the powerhouse of the cell.");
    vi.mocked(api.summarize).mockResolvedValue({
      summary: "Front: What do mitochondria make? ||| Back: ATP.\nFront: What are they called? ||| Back: The powerhouse of the cell.",
    });
    render(<Home />);
    fireEvent.click(screen.getByText("Flashcards"));
    fireEvent.click(screen.getByText("Generate Summary"));

    expect(await screen.findByTestId("flashcard-deck")).toBeInTheDocument();
    expect(screen.queryByTestId("summary-output")).not.toBeInTheDocument();
    expect(screen.getByText("Card 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("What do mitochondria make?")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Save Summary"));
    await waitFor(() => expect(api.saveSummary).toHaveBeenCalledWith(expect.objectContaining({ summaryType: "flashcard" })));
  });

  it("saves with the type the summary was generated as, even if the selection changed afterwards", async () => {
    useStudyStore.getState().setSourceText("Mitochondria are the powerhouse of the cell.");
    vi.mocked(api.summarize).mockResolvedValue({ summary: "A short summary." });
    render(<Home />);
    fireEvent.click(screen.getByText("Short Summary"));
    fireEvent.click(screen.getByText("Generate Summary"));
    await waitFor(() => expect(screen.getByTestId("summary-output")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Bullet Points")); // changed after generating
    fireEvent.click(screen.getByText("Save Summary"));
    await waitFor(() => expect(api.saveSummary).toHaveBeenCalledWith(expect.objectContaining({ summaryType: "compressed" })));
  });

  it("shows an error and does not get stuck if saving fails", async () => {
    useStudyStore.getState().setSourceText("notes");
    vi.mocked(api.summarize).mockResolvedValue({ summary: "a summary" });
    vi.mocked(api.saveSummary).mockRejectedValue(new Error("db down"));
    render(<Home />);
    fireEvent.click(screen.getByText("Generate Summary"));
    await waitFor(() => expect(screen.getByTestId("summary-output")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Save Summary"));
    expect(await screen.findByText("db down")).toBeInTheDocument();
    expect(screen.getByText("Save Summary")).toBeInTheDocument(); // button reverted, not stuck on "Saving..."
  });
});