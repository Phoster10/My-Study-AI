import { create } from "zustand";

interface StudyState {
  sourceText: string;
  summary: string;
  searchResult: string | null;
  xp: number | null;

  setSourceText: (text: string) => void;
  setSummary: (summary: string) => void;
  setSearchResult: (result: string | null) => void;
  setXP: (xp: number | null) => void;
  reset: () => void;
}

export const useStudyStore = create<StudyState>((set) => ({
  sourceText: "",
  summary: "",
  searchResult: null,
  xp: null,

  setSourceText: (sourceText) => set({ sourceText }),
  setSummary: (summary) => set({ summary }),
  setSearchResult: (searchResult) => set({ searchResult }),
  setXP: (xp) => set({ xp }),
  reset: () => set({ sourceText: "", summary: "", searchResult: null, xp: null }),
}));
