import { create } from "zustand";
import type { ExamQuestion, GradingReport } from "../api/client";

interface StudyState {
  sourceText: string;
  summary: string;
  searchResult: string | null;
  xp: number | null;
  exam: ExamQuestion[];
  userAnswers: Record<string, string>;
  report: GradingReport | null;

  setSourceText: (text: string) => void;
  setSummary: (summary: string) => void;
  setSearchResult: (result: string | null) => void;
  setXP: (xp: number | null) => void;
  setExam: (exam: ExamQuestion[]) => void;
  setAnswer: (questionId: string, answer: string) => void;
  setReport: (report: GradingReport | null) => void;
  reset: () => void;
}

const initialState = {
  sourceText: "",
  summary: "",
  searchResult: null,
  xp: null,
  exam: [],
  userAnswers: {},
  report: null,
};

export const useStudyStore = create<StudyState>((set) => ({
  ...initialState,

  setSourceText: (sourceText) => set({ sourceText }),
  setSummary: (summary) => set({ summary }),
  setSearchResult: (searchResult) => set({ searchResult }),
  setXP: (xp) => set({ xp }),
  // A new exam always starts with a clean slate of answers.
  setExam: (exam) => set({ exam, userAnswers: {} }),
  setAnswer: (questionId, answer) => set((s) => ({ userAnswers: { ...s.userAnswers, [questionId]: answer } })),
  setReport: (report) => set({ report }),
  reset: () => set({ ...initialState }),
}));
