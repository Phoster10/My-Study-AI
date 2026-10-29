import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const getSession = vi.fn();
const unsubscribe = vi.fn();
let authCallback: (event: string, session: any) => void = () => {};
const signOut = vi.fn();

vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => getSession(),
      signOut: () => signOut(),
      onAuthStateChange: (cb: typeof authCallback) => { authCallback = cb; return { data: { subscription: { unsubscribe } } }; },
    },
  },
}));

import { useAuth } from "../src/hooks/useAuth";

beforeEach(() => { getSession.mockReset(); unsubscribe.mockClear(); signOut.mockClear(); });

describe("useAuth", () => {
  it("starts loading, then exposes the existing session's user", async () => {
    getSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual({ id: "u1" });
  });

  it("has no user when signed out", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("reacts to auth state changes", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => authCallback("SIGNED_IN", { user: { id: "u2" } }));
    expect(result.current.user).toEqual({ id: "u2" });
  });

  it("unsubscribes on unmount and delegates signOut", async () => {
    getSession.mockResolvedValue({ data: { session: null } });
    const { result, unmount } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));
    result.current.signOut();
    expect(signOut).toHaveBeenCalled();
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
