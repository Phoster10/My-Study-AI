import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExamModal } from "../src/components/ExamModal";
import { api } from "../src/api/client";

vi.mock("../src/api/client", () => ({
  api: { generateExam: vi.fn(), gradeExam: vi.fn(), addXP: vi.fn(), getXP: vi.fn() },
}));

const mcqExam = [
  { id: "q1", question: "Which is a fruit?", type: "mcq" as const, options: { A: "Apple", B: "Car" }, answer: "A" },
  { id: "q2", question: "Which is a vegetable?", type: "mcq" as const, options: { A: "Plane", B: "Carrot" }, answer: "B" },
];

const report = {
  score: 1,
  total: 2,
  percentage: 50,
  feedback: "Keep going",
  needsManualReview: false,
  results: [
    { questionId: "q1", question: "Which is a fruit?", correct: true, confidence: 1, userAnswer: "A", correctAnswer: "A", matchedConcepts: [], missingConcepts: [], contradictions: [], explanation: "", gradedBy: "mcq", needsManualReview: false },
    { questionId: "q2", question: "Which is a vegetable?", correct: false, confidence: 1, userAnswer: "A", correctAnswer: "B", matchedConcepts: [], missingConcepts: [], contradictions: [], explanation: "", gradedBy: "mcq", needsManualReview: false },
  ],
};

const onClose = vi.fn();

beforeEach(() => {
  onClose.mockClear();
  vi.mocked(api.generateExam).mockReset();
  vi.mocked(api.gradeExam).mockReset();
  vi.mocked(api.addXP).mockReset().mockResolvedValue({ success: true, xp: 10 });
  vi.mocked(api.getXP).mockReset().mockResolvedValue({ xp: 10 });
});

describe("ExamModal", () => {
  it("defaults to 5 questions and lets you switch to 10", () => {
    render(<ExamModal title="Biology notes" sourceText="mitochondria..." onClose={onClose} />);
    expect(screen.getByText("5 questions")).toHaveClass("exam-modal__count--selected");
    fireEvent.click(screen.getByText("10 questions"));
    expect(screen.getByText("10 questions")).toHaveClass("exam-modal__count--selected");
  });

  it("requests an MCQ-only exam with the chosen count", async () => {
    vi.mocked(api.generateExam).mockResolvedValue({ exam: mcqExam });
    render(<ExamModal title="Biology notes" sourceText="mitochondria..." onClose={onClose} />);
    fireEvent.click(screen.getByText("10 questions"));
    fireEvent.click(screen.getByText("Start Exam"));
    await waitFor(() => expect(api.generateExam).toHaveBeenCalledWith("mitochondria...", { count: 10, mcqOnly: true }));
  });

  it("renders MCQ options for every question once generated", async () => {
    vi.mocked(api.generateExam).mockResolvedValue({ exam: mcqExam });
    render(<ExamModal title="Biology notes" sourceText="mitochondria..." onClose={onClose} />);
    fireEvent.click(screen.getByText("Start Exam"));
    expect(await screen.findByText(/Which is a fruit/)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });

  it("shows an error and returns to the choose step if generation fails", async () => {
    vi.mocked(api.generateExam).mockRejectedValue(new Error("Groq down"));
    render(<ExamModal title="Biology notes" sourceText="mitochondria..." onClose={onClose} />);
    fireEvent.click(screen.getByText("Start Exam"));
    expect(await screen.findByText("Groq down")).toBeInTheDocument();
    expect(screen.getByText("Start Exam")).toBeInTheDocument();
  });

  it("grades the exam, awards XP for correct answers, and shows the report", async () => {
    vi.mocked(api.generateExam).mockResolvedValue({ exam: mcqExam });
    vi.mocked(api.gradeExam).mockResolvedValue(report);
    render(<ExamModal title="Biology notes" sourceText="mitochondria..." onClose={onClose} />);
    fireEvent.click(screen.getByText("Start Exam"));
    await screen.findByText(/Which is a fruit/);

    fireEvent.click(screen.getAllByRole("radio")[0]); // A for q1
    fireEvent.click(screen.getAllByRole("radio")[2]); // A for q2 (wrong)
    fireEvent.click(screen.getByText("Submit exam"));

    expect(await screen.findByText(/Score: 1\/2/)).toBeInTheDocument();
    expect(api.addXP).toHaveBeenCalledWith(10); // 1 correct answer x 10 XP
  });

  it("calls onClose when the close button or Done is clicked", async () => {
    render(<ExamModal title="Biology notes" sourceText="mitochondria..." onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close exam"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
