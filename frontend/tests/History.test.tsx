// study-ai/frontend/tests/History.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { History } from "../src/pages/History";
import { api } from "../src/api/client";

vi.mock("../src/api/client", () => ({
  api: { listSummaries: vi.fn(), getSummary: vi.fn(), deleteSummary: vi.fn(), getXP: vi.fn().mockResolvedValue({ xp: 0 }) },
}));

const listItem = { id: "sum-1", title: "Biology notes", summary_type: "bullet", created_at: "2026-01-15T00:00:00.000Z" };
const fullRecord = { ...listItem, source_text: "mitochondria are the powerhouse of the cell", summary_text: "- mitochondria produce ATP" };

beforeEach(() => {
  vi.mocked(api.listSummaries).mockReset();
  vi.mocked(api.getSummary).mockReset();
  vi.mocked(api.deleteSummary).mockReset();
});

describe("History", () => {
  it("shows an error if the list fails to load", async () => {
    vi.mocked(api.listSummaries).mockRejectedValue(new Error("network down"));
    render(<History />);
    expect(await screen.findByText("network down")).toBeInTheDocument();
  });

  it("shows an empty state when there are no saved summaries", async () => {
    vi.mocked(api.listSummaries).mockResolvedValue({ summaries: [] });
    render(<History />);
    expect(await screen.findByText("No saved summaries yet")).toBeInTheDocument();
  });

  it("lists saved summaries with type and date", async () => {
    vi.mocked(api.listSummaries).mockResolvedValue({ summaries: [listItem] });
    render(<History />);
    expect(await screen.findByText("Biology notes")).toBeInTheDocument();
    expect(screen.getByText(/bullet/)).toBeInTheDocument();
  });

  it("expands an item to show its full summary text", async () => {
    vi.mocked(api.listSummaries).mockResolvedValue({ summaries: [listItem] });
    vi.mocked(api.getSummary).mockResolvedValue(fullRecord);
    render(<History />);
    fireEvent.click(await screen.findByText("Biology notes"));
    expect(await screen.findByText("- mitochondria produce ATP")).toBeInTheDocument();
    expect(api.getSummary).toHaveBeenCalledWith("sum-1");
  });

  it("collapses an item when clicked again", async () => {
    vi.mocked(api.listSummaries).mockResolvedValue({ summaries: [listItem] });
    vi.mocked(api.getSummary).mockResolvedValue(fullRecord);
    render(<History />);
    const header = await screen.findByText("Biology notes");
    fireEvent.click(header);
    await screen.findByText("- mitochondria produce ATP");
    fireEvent.click(header);
    expect(screen.queryByText("- mitochondria produce ATP")).not.toBeInTheDocument();
  });

  it("shows an error if loading the detail fails", async () => {
    vi.mocked(api.listSummaries).mockResolvedValue({ summaries: [listItem] });
    vi.mocked(api.getSummary).mockRejectedValue(new Error("not found"));
    render(<History />);
    fireEvent.click(await screen.findByText("Biology notes"));
    expect(await screen.findByText("not found")).toBeInTheDocument();
  });

  it("removes an item from the list after deleting it", async () => {
    vi.mocked(api.listSummaries).mockResolvedValue({ summaries: [listItem] });
    vi.mocked(api.getSummary).mockResolvedValue(fullRecord);
    vi.mocked(api.deleteSummary).mockResolvedValue({ success: true });
    render(<History />);
    fireEvent.click(await screen.findByText("Biology notes"));
    await screen.findByText("- mitochondria produce ATP");
    fireEvent.click(screen.getByText("Delete"));
    await waitFor(() => expect(screen.queryByText("Biology notes")).not.toBeInTheDocument());
  });

  it("opens the full-screen exam modal for the expanded note", async () => {
    vi.mocked(api.listSummaries).mockResolvedValue({ summaries: [listItem] });
    vi.mocked(api.getSummary).mockResolvedValue(fullRecord);
    render(<History />);
    fireEvent.click(await screen.findByText("Biology notes"));
    await screen.findByText("- mitochondria produce ATP");
    fireEvent.click(screen.getByText("Take Exam"));
    expect(await screen.findByRole("dialog", { name: /biology notes/i })).toBeInTheDocument();
  });

  it("shows a saved flashcard note as an animated deck", async () => {
    const cardItem = { ...listItem, id: "sum-2", title: "Flashcard notes", summary_type: "flashcard" };
    vi.mocked(api.listSummaries).mockResolvedValue({ summaries: [cardItem] });
    vi.mocked(api.getSummary).mockResolvedValue({
      ...cardItem,
      source_text: "mitochondria are the powerhouse of the cell",
      summary_text: "Front: What makes ATP? ||| Back: Mitochondria.",
    });
    render(<History />);
    fireEvent.click(await screen.findByText("Flashcard notes"));
    expect(await screen.findByTestId("flashcard-deck")).toBeInTheDocument();
    expect(screen.getByText("What makes ATP?")).toBeInTheDocument();
    expect(screen.getByText("Take Exam")).toBeInTheDocument();
  });
});