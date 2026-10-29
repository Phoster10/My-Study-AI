import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Settings } from "../src/pages/Settings";
import { PracticeExam } from "../src/pages/PracticeExam";
import { Review } from "../src/pages/Review";
import { useAuth } from "../src/hooks/useAuth";

vi.mock("../src/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../src/api/client", () => ({ api: { dueTopics: vi.fn().mockResolvedValue({ due: [] }) } }));

describe("stub / wrapper pages", () => {
  it("Settings shows the signed-in user's email and can sign out", () => {
    const signOut = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ user: { email: "phoster@example.com" }, loading: false, signOut } as any);
    render(<Settings />);
    expect(screen.getByText("phoster@example.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

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
