import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewQueue } from "../src/components/ReviewQueue";
import { api } from "../src/api/client";

vi.mock("../src/api/client", () => ({ api: { dueTopics: vi.fn() } }));
beforeEach(() => { vi.mocked(api.dueTopics).mockReset(); });

describe("ReviewQueue", () => {
  it("lists topics that are due", async () => {
    vi.mocked(api.dueTopics).mockResolvedValue({ due: [{ topic: "Krebs cycle", nextReviewDate: 1 }, { topic: "ATP", nextReviewDate: 2 }] });
    render(<ReviewQueue />);
    expect(await screen.findByText("Krebs cycle")).toBeInTheDocument();
    expect(screen.getByText("ATP")).toBeInTheDocument();
  });

  it("shows an empty state when nothing is due", async () => {
    vi.mocked(api.dueTopics).mockResolvedValue({ due: [] });
    render(<ReviewQueue />);
    expect(await screen.findByText(/nothing due right now/i)).toBeInTheDocument();
  });

  it("shows an error message when loading fails", async () => {
    vi.mocked(api.dueTopics).mockRejectedValue(new Error("Invalid or expired session."));
    render(<ReviewQueue />);
    expect(await screen.findByText("Invalid or expired session.")).toBeInTheDocument();
  });
});
