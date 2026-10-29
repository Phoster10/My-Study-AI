import { describe, it, expect, beforeEach } from "vitest";
import { useStudyStore } from "../src/store/useStudyStore";

describe("useStudyStore", () => {
  beforeEach(() => {
    useStudyStore.getState().reset();
  });

  it("starts empty", () => {
    const state = useStudyStore.getState();
    expect(state.sourceText).toBe("");
    expect(state.summary).toBe("");
    expect(state.searchResult).toBeNull();
  });

  it("stores source text, summary and search result", () => {
    const { setSourceText, setSummary, setSearchResult } = useStudyStore.getState();
    setSourceText("notes");
    setSummary("short");
    setSearchResult("answer");
    const state = useStudyStore.getState();
    expect(state.sourceText).toBe("notes");
    expect(state.summary).toBe("short");
    expect(state.searchResult).toBe("answer");
  });

  it("reset clears everything", () => {
    useStudyStore.getState().setSourceText("notes");
    useStudyStore.getState().setSearchResult("answer");
    useStudyStore.getState().reset();
    const state = useStudyStore.getState();
    expect(state.sourceText).toBe("");
    expect(state.searchResult).toBeNull();
  });
});
