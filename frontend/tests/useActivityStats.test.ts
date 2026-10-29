import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useActivityStats, bumpStreak, incrementNotesSummarized, bumpXPToday } from "../src/hooks/useActivityStats";

beforeEach(() => localStorage.clear());

describe("useActivityStats / bumpStreak", () => {
  it("starts at zero", () => {
    const { result } = renderHook(() => useActivityStats());
    expect(result.current.streak).toBe(0);
    expect(result.current.notesSummarized).toBe(0);
  });

  it("bumpStreak sets the streak to 1 on first use", () => {
    bumpStreak();
    const { result } = renderHook(() => useActivityStats());
    expect(result.current.streak).toBe(1);
  });

  it("bumpStreak twice in the same day does not double-count", () => {
    bumpStreak();
    bumpStreak();
    const { result } = renderHook(() => useActivityStats());
    expect(result.current.streak).toBe(1);
  });

  it("incrementNotesSummarized accumulates across calls", () => {
    incrementNotesSummarized();
    incrementNotesSummarized();
    incrementNotesSummarized();
    const { result } = renderHook(() => useActivityStats());
    expect(result.current.notesSummarized).toBe(3);
  });

  it("bumpXPToday accumulates across multiple awards the same day", () => {
    bumpXPToday(25);
    bumpXPToday(20);
    bumpXPToday(15);
    const { result } = renderHook(() => useActivityStats());
    expect(result.current.xpToday).toBe(60);
  });

  it("bumpXPToday resets when the stored date is not today", () => {
    localStorage.setItem("study-ai:xp-today", JSON.stringify({ date: "2000-01-01", amount: 500 }));
    bumpXPToday(10);
    const { result } = renderHook(() => useActivityStats());
    expect(result.current.xpToday).toBe(10);
  });
});
