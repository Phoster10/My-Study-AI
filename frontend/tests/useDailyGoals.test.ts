import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDailyGoals, DAILY_GOALS } from "../src/hooks/useDailyGoals";
import { api } from "../src/api/client";

vi.mock("../src/api/client", () => ({ api: { addXP: vi.fn() } }));

beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.addXP).mockReset().mockResolvedValue({ success: true, xp: 999 });
});

describe("useDailyGoals", () => {
  it("starts with nothing completed today", () => {
    const { result } = renderHook(() => useDailyGoals());
    expect(result.current.completedCount).toBe(0);
    expect(result.current.total).toBe(DAILY_GOALS.length);
  });

  it("awards XP and marks a goal's checkmark complete on first use", async () => {
    const { result } = renderHook(() => useDailyGoals());
    await act(async () => {
      await result.current.complete("upload");
    });
    expect(api.addXP).toHaveBeenCalledWith(25);
    expect(result.current.completed.upload).toBe(true);
    expect(result.current.completedCount).toBe(1);
  });

  it("awards XP again on every subsequent use the same day — XP is never capped", async () => {
    const { result } = renderHook(() => useDailyGoals());
    await act(async () => {
      await result.current.complete("summary");
    });
    await act(async () => {
      await result.current.complete("summary");
    });
    await act(async () => {
      await result.current.complete("summary");
    });
    expect(api.addXP).toHaveBeenCalledTimes(3);
    expect(api.addXP).toHaveBeenCalledWith(20);
    const xpToday = JSON.parse(localStorage.getItem("study-ai:xp-today")!);
    expect(xpToday.amount).toBe(60); // 20 XP x 3 actual uses, not capped at one
  });

  it("does not re-set the checkmark (or double-count the completedCount) once it's already true today", async () => {
    const { result } = renderHook(() => useDailyGoals());
    await act(async () => {
      await result.current.complete("ai");
    });
    await act(async () => {
      await result.current.complete("ai");
    });
    expect(result.current.completedCount).toBe(1);
  });

  it("persists the checkmark across remounts on the same day", async () => {
    const { result, unmount } = renderHook(() => useDailyGoals());
    await act(async () => {
      await result.current.complete("ai");
    });
    unmount();

    const { result: result2 } = renderHook(() => useDailyGoals());
    expect(result2.current.completed.ai).toBe(true);
  });

  it("does not mark the checkmark if the server call fails, and does not throw", async () => {
    vi.mocked(api.addXP).mockRejectedValue(new Error("db down"));
    const { result } = renderHook(() => useDailyGoals());
    await act(async () => {
      await result.current.complete("upload");
    });
    expect(result.current.completed.upload).toBe(false);
  });
});
