import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SummaryPanel } from "../src/components/SummaryPanel";
import { useStudyStore } from "../src/store/useStudyStore";
import { api } from "../src/api/client";

vi.mock("../src/api/client", () => ({
  api: {
    summarize: vi.fn(),
  },
}));

describe("SummaryPanel", () => {
  beforeEach(() => {
    useStudyStore.getState().reset();
    vi.mocked(api.summarize).mockReset();
  });

  it("shows a validation error when there is no source text", async () => {
    render(<SummaryPanel />);
    fireEvent.click(screen.getByText("Summarize"));
    expect(await screen.findByText(/add some notes first/i)).toBeInTheDocument();
  });

  it("renders the summary returned by the API", async () => {
    useStudyStore.getState().setSourceText("Mitochondria are the powerhouse of the cell.");
    vi.mocked(api.summarize).mockResolvedValue({ summary: "- Mitochondria produce energy" });

    render(<SummaryPanel />);
    fireEvent.click(screen.getByText("Summarize"));

    await waitFor(() => {
      expect(screen.getByTestId("summary-output")).toHaveTextContent("Mitochondria produce energy");
    });
  });
});
