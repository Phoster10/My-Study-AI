import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useXP } from "../src/hooks/useXP";
import { api } from "../src/api/client";
import { useStudyStore } from "../src/store/useStudyStore";

vi.mock("../src/api/client", () => ({ api: { getXP: vi.fn() } }));

beforeEach(() => {
  useStudyStore.getState().reset();
  vi.mocked(api.getXP).mockReset();
});

describe("useXP", () => {
  it("fetches xp on mount", async () => {
    vi.mocked(api.getXP).mockResolvedValue({ xp: 300 });
    const { result } = renderHook(() => useXP());
    await waitFor(() => expect(result.current.xp).toBe(300));
  });

  it("refresh() re-fetches and updates the shared store", async () => {
    vi.mocked(api.getXP).mockResolvedValueOnce({ xp: 100 }).mockResolvedValueOnce({ xp: 150 });
    const { result } = renderHook(() => useXP());
    await waitFor(() => expect(result.current.xp).toBe(100));
    await act(async () => {
      result.current.refresh();
    });
    await waitFor(() => expect(result.current.xp).toBe(150));
  });

  it("falls back to 0 when the initial fetch fails", async () => {
    vi.mocked(api.getXP).mockRejectedValue(new Error("no session"));
    const { result } = renderHook(() => useXP());
    await waitFor(() => expect(result.current.xp).toBe(0));
  });
});
