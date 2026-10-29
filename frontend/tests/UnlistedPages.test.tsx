import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { History } from "../src/pages/History";
import { PracticeExam } from "../src/pages/PracticeExam";
import { Review } from "../src/pages/Review";

vi.mock("../src/api/client", () => ({
  api: {
    listSummaries: vi.fn().mockResolvedValue({ summaries: [] }),
    dueTopics: vi.fn().mockResolvedValue({ due: [] }),
  },
}));

describe("History with no saved summaries yet", () => {
  it("shows an honest empty state, not fabricated data", async () => {
    render(<History />);
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(await screen.findByText("No saved summaries yet")).toBeInTheDocument();
  });
});

describe("unlisted wrapper pages (/exam and /review exist, but are not in the sidebar)", () => {
  it("PracticeExam renders a page title and the exam generator", () => {
    render(<PracticeExam />);
    expect(screen.getByRole("heading", { name: "Practice Exam", level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/generate 10-question exam/i)).toBeInTheDocument();
  });

  it("Review renders a page title and the review queue", async () => {
    render(<Review />);
    expect(screen.getByRole("heading", { name: "Review", level: 1 })).toBeInTheDocument();
    expect(await screen.findByText(/nothing due right now/i)).toBeInTheDocument();
  });
});
