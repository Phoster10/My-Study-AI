import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExamPanel } from "../src/components/ExamPanel";
import { useStudyStore } from "../src/store/useStudyStore";
import { api } from "../src/api/client";

vi.mock("../src/api/client", () => ({ api: { generateExam: vi.fn(), gradeExam: vi.fn(), submitReview: vi.fn(), addXP: vi.fn() } }));

const exam = [
  { id: "q1", question: "Which is a fruit?", type: "mcq" as const, options: { A: "Apple", B: "Car" }, answer: "A" },
  { id: "q2", question: "Explain mitochondria.", type: "short_answer" as const, answer: "powerhouse" },
];
const result = (id: string, correct: boolean, question: string) => ({
  questionId: id, question, correct, confidence: 1, userAnswer: "x", correctAnswer: "y",
  matchedConcepts: [], missingConcepts: [], contradictions: [], explanation: correct ? "" : "Because reasons.", gradedBy: "mcq", needsManualReview: false,
});
const report = (extra = {}) => ({ score: 1, total: 2, percentage: 50, feedback: "Keep going", needsManualReview: false, results: [result("q1", true, "Which is a fruit?"), result("q2", false, "Explain mitochondria.")], ...extra });

beforeEach(() => {
  useStudyStore.getState().reset();
  vi.mocked(api.generateExam).mockReset();
  vi.mocked(api.gradeExam).mockReset();
  vi.mocked(api.submitReview).mockReset().mockResolvedValue({ topic: "t" });
  vi.mocked(api.addXP).mockReset().mockResolvedValue({ success: true, xp: 999 });
});

describe("ExamPanel", () => {
  it("requires notes before generating", async () => {
    render(<ExamPanel />);
    fireEvent.click(screen.getByText(/generate 10-question exam/i));
    expect(await screen.findByText(/add some notes first/i)).toBeInTheDocument();
    expect(api.generateExam).not.toHaveBeenCalled();
  });

  it("generates and renders MCQ options and short-answer inputs", async () => {
    useStudyStore.getState().setSourceText("notes about biology");
    vi.mocked(api.generateExam).mockResolvedValue({ exam });
    render(<ExamPanel />);
    fireEvent.click(screen.getByText(/generate 10-question exam/i));
    expect(await screen.findByText(/Which is a fruit/)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByPlaceholderText("Your answer")).toBeInTheDocument();
  });

  it("shows an error when generation fails", async () => {
    useStudyStore.getState().setSourceText("notes");
    vi.mocked(api.generateExam).mockRejectedValue(new Error("Groq unavailable"));
    render(<ExamPanel />);
    fireEvent.click(screen.getByText(/generate 10-question exam/i));
    expect(await screen.findByText("Groq unavailable")).toBeInTheDocument();
  });

  it("records answers, submits for grading and feeds each result into spaced repetition", async () => {
    useStudyStore.getState().setExam(exam);
    vi.mocked(api.gradeExam).mockResolvedValue(report());
    render(<ExamPanel />);

    fireEvent.click(screen.getByLabelText(/A\. Apple/));
    fireEvent.change(screen.getByPlaceholderText("Your answer"), { target: { value: "energy" } });
    fireEvent.click(screen.getByText("Submit exam"));

    await waitFor(() => expect(screen.getByTestId("grading-report")).toBeInTheDocument());
    expect(api.gradeExam).toHaveBeenCalledWith(exam, { q1: "A", q2: "energy" });
    expect(api.submitReview).toHaveBeenCalledTimes(2);
    expect(api.submitReview).toHaveBeenCalledWith("Which is a fruit?", true);
    expect(api.submitReview).toHaveBeenCalledWith("Explain mitochondria.", false);
    expect(screen.getByText(/Score: 1\/2 \(50%\)/)).toBeInTheDocument();
    expect(screen.getByText("Because reasons.")).toBeInTheDocument();
    expect(api.addXP).toHaveBeenCalledWith(10);
    expect(await screen.findByText("+10 XP")).toBeInTheDocument();
  });

  it("does not award XP when nothing was correct", async () => {
    useStudyStore.getState().setExam(exam);
    vi.mocked(api.gradeExam).mockResolvedValue(report({ results: [result("q1", false, "Which is a fruit?"), result("q2", false, "Explain mitochondria.")], score: 0 }));
    render(<ExamPanel />);
    fireEvent.click(screen.getByText("Submit exam"));
    await waitFor(() => expect(screen.getByTestId("grading-report")).toBeInTheDocument());
    expect(api.addXP).not.toHaveBeenCalled();
    expect(screen.queryByText(/XP$/)).not.toBeInTheDocument();
  });

  it("still shows the report if awarding XP fails", async () => {
    useStudyStore.getState().setExam(exam);
    vi.mocked(api.gradeExam).mockResolvedValue(report());
    vi.mocked(api.addXP).mockImplementation(() => Promise.reject(new Error("db down")));
    render(<ExamPanel />);
    fireEvent.click(screen.getByText("Submit exam"));
    expect(await screen.findByTestId("grading-report")).toBeInTheDocument();
    expect(screen.queryByText(/XP$/)).not.toBeInTheDocument();
  });

  it("still shows the report if persisting a review fails", async () => {
    useStudyStore.getState().setExam(exam);
    vi.mocked(api.gradeExam).mockResolvedValue(report());
    vi.mocked(api.submitReview).mockImplementation(() => Promise.reject(new Error("db down")));
    render(<ExamPanel />);
    fireEvent.click(screen.getByText("Submit exam"));
    expect(await screen.findByTestId("grading-report")).toBeInTheDocument();
  });

  it("shows the manual-review warning badge when flagged", async () => {
    useStudyStore.getState().setExam(exam);
    vi.mocked(api.gradeExam).mockResolvedValue(report({ needsManualReview: true }));
    render(<ExamPanel />);
    fireEvent.click(screen.getByText("Submit exam"));
    expect(await screen.findByText(/flagged for manual review/i)).toBeInTheDocument();
  });

  it("shows an error when grading fails and keeps the exam", async () => {
    useStudyStore.getState().setExam(exam);
    vi.mocked(api.gradeExam).mockRejectedValue(new Error("grading failed"));
    render(<ExamPanel />);
    fireEvent.click(screen.getByText("Submit exam"));
    expect(await screen.findByText("grading failed")).toBeInTheDocument();
    expect(screen.getByText("Submit exam")).toBeInTheDocument();
  });

  it("resets to the start when 'Start a new exam' is clicked", async () => {
    useStudyStore.getState().setExam(exam);
    useStudyStore.getState().setReport(report());
    render(<ExamPanel />);
    fireEvent.click(screen.getByText("Start a new exam"));
    expect(await screen.findByText(/generate 10-question exam/i)).toBeInTheDocument();
  });
});
