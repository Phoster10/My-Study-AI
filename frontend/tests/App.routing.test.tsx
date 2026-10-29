import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "../src/App";
import { useAuth } from "../src/hooks/useAuth";
import { api } from "../src/api/client";

vi.mock("../src/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../src/lib/supabase", () => ({ supabase: { auth: { signInWithPassword: vi.fn(), signUp: vi.fn() } } }));
vi.mock("../src/api/client", () => ({
  api: {
    getXP: vi.fn().mockResolvedValue({ xp: 150 }),
    search: vi.fn(),
  },
}));

const signOut = vi.fn().mockResolvedValue(undefined);
const anon = () => vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, signOut } as any);
const authed = () => vi.mocked(useAuth).mockReturnValue({ user: { id: "u1", email: "phoster@example.com" }, loading: false, signOut } as any);
const go = (path: string) => window.history.pushState({}, "", path);

beforeEach(() => {
  signOut.mockClear();
  vi.mocked(api.search).mockReset();
  localStorage.clear();
  localStorage.setItem("study-ai:onboarding-seen", "true"); // not under test here; see AppLayout.test.tsx
  go("/");
});

describe("App routing (single-page application)", () => {
  it("renders the landing page at / with the public header", () => {
    anon(); render(<App />);
    expect(screen.getByRole("heading", { name: /turn your notes into a study loop/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign up/i })).toBeInTheDocument();
  });

  it("navigates client-side (no full page load) between public pages", () => {
    anon(); render(<App />);
    const pushState = vi.spyOn(window.history, "pushState");
    fireEvent.click(screen.getAllByRole("link", { name: /sign up/i })[0]);
    expect(screen.getByRole("heading", { name: "Sign up" })).toBeInTheDocument();
    expect(pushState).toHaveBeenCalled();
  });

  it("redirects anonymous users from /dashboard to /login", () => {
    anon(); go("/dashboard"); render(<App />);
    expect(screen.getByRole("heading", { name: "Log in" })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  });

  it("shows the sidebar, topbar and Home page to signed-in users", async () => {
    authed(); go("/dashboard"); render(<App />);
    expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^XP/ })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask AI about any topic...")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Choose Summary Type" })).toBeInTheDocument();
    expect(await screen.findByText("150")).toBeInTheDocument(); // XP badge in sidebar
  });

  it("navigates between app pages via the sidebar without a full reload", async () => {
    authed(); go("/dashboard"); render(<App />);
    const pushState = vi.spyOn(window.history, "pushState");
    fireEvent.click(screen.getByRole("link", { name: /^XP/ }));
    expect(await screen.findByText("XP Hub")).toBeInTheDocument();
    expect(pushState).toHaveBeenCalled();
    expect(window.location.pathname).toBe("/xp");
  });

  it("topbar shows the user's initials/name and signing out returns home", async () => {
    authed(); go("/dashboard"); render(<App />);
    expect(screen.getByText("phoster")).toBeInTheDocument();
    fireEvent.click(screen.getByText("phoster"));
    fireEvent.click(await screen.findByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(window.location.pathname).toBe("/"));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("the search bar only exists inside the authenticated app shell, not on public pages", () => {
    anon(); render(<App />);
    expect(screen.queryByPlaceholderText("Ask AI about any topic...")).not.toBeInTheDocument();
  });

  it("a signed-in search shows the result on the Home page", async () => {
    authed();
    vi.mocked(api.search).mockResolvedValue({ result: "Mitochondria produce ATP." });
    go("/dashboard");
    render(<App />);
    const input = screen.getByPlaceholderText("Ask AI about any topic...");
    fireEvent.change(input, { target: { value: "mitochondria" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByText("Mitochondria produce ATP.")).toBeInTheDocument();
  });
});
