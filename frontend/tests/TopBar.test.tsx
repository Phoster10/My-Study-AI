import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { TopBar } from "../src/components/TopBar";
import { useAuth } from "../src/hooks/useAuth";
import { api } from "../src/api/client";
import { useStudyStore } from "../src/store/useStudyStore";

vi.mock("../src/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../src/api/client", () => ({ api: { search: vi.fn(), addXP: vi.fn(), getXP: vi.fn(), deleteAccount: vi.fn() } }));

const signOut = vi.fn();
const anon = () => vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, signOut } as any);
const authed = () => vi.mocked(useAuth).mockReturnValue({ user: { id: "u1", email: "phoster@example.com" }, loading: false, signOut } as any);

const setup = () =>
  render(
    <MemoryRouter initialEntries={["/somewhere"]}>
      <TopBar />
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/dashboard" element={<p>dashboard page</p>} />
        <Route path="/account" element={<p>account page</p>} />
        <Route path="/" element={<p>landing page</p>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  useStudyStore.getState().reset();
  vi.mocked(api.search).mockReset();
  vi.mocked(api.addXP).mockReset().mockResolvedValue({ success: true, xp: 15 });
  vi.mocked(api.getXP).mockReset().mockResolvedValue({ xp: 15 });
  vi.mocked(api.deleteAccount).mockReset();
  signOut.mockClear();
  localStorage.clear();
});

describe("TopBar search", () => {
  it("redirects an anonymous searcher to log in", async () => {
    anon();
    setup();
    const input = screen.getByPlaceholderText("Ask AI about any topic...");
    fireEvent.change(input, { target: { value: "mitochondria" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(await screen.findByText("login page")).toBeInTheDocument();
    expect(api.search).not.toHaveBeenCalled();
  });

  it("runs the search for a signed-in user, stores the result and counts the AI daily goal", async () => {
    authed();
    vi.mocked(api.search).mockResolvedValue({ result: "Mitochondria produce ATP." });
    setup();
    const input = screen.getByPlaceholderText("Ask AI about any topic...");
    fireEvent.change(input, { target: { value: "mitochondria" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(useStudyStore.getState().searchResult).toBe("Mitochondria produce ATP."));
    expect(api.addXP).toHaveBeenCalledWith(15);
  });
});

describe("TopBar account dropdown", () => {
  it("shows and hides the account dropdown, and signs out", async () => {
    authed();
    setup();
    fireEvent.click(screen.getByText("phoster"));
    const signOutButton = await screen.findByRole("button", { name: /sign out/i });
    fireEvent.click(signOutButton);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("links to the account settings page", async () => {
    authed();
    setup();
    fireEvent.click(screen.getByText("phoster"));
    fireEvent.click(await screen.findByText("Account settings"));
    expect(await screen.findByText("account page")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting the account", async () => {
    authed();
    setup();
    fireEvent.click(screen.getByText("phoster"));
    fireEvent.click(await screen.findByText("Delete account"));
    expect(screen.getByText(/this cannot be undone/i)).toBeInTheDocument();
    expect(api.deleteAccount).not.toHaveBeenCalled();
  });

  it("cancelling the confirmation returns to the normal menu without deleting", async () => {
    authed();
    setup();
    fireEvent.click(screen.getByText("phoster"));
    fireEvent.click(await screen.findByText("Delete account"));
    fireEvent.click(screen.getByText("Cancel"));
    expect(await screen.findByText("Account settings")).toBeInTheDocument();
    expect(api.deleteAccount).not.toHaveBeenCalled();
  });

  it("confirming deletes the account, signs out, and returns to the landing page", async () => {
    authed();
    vi.mocked(api.deleteAccount).mockResolvedValue({ success: true });
    setup();
    fireEvent.click(screen.getByText("phoster"));
    fireEvent.click(await screen.findByText("Delete account"));
    fireEvent.click(screen.getByText("Yes, delete"));
    await waitFor(() => expect(screen.getByText("landing page")).toBeInTheDocument());
    expect(api.deleteAccount).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it("shows an error and stays put if deletion fails", async () => {
    authed();
    vi.mocked(api.deleteAccount).mockRejectedValue(new Error("admin api down"));
    setup();
    fireEvent.click(screen.getByText("phoster"));
    fireEvent.click(await screen.findByText("Delete account"));
    fireEvent.click(screen.getByText("Yes, delete"));
    expect(await screen.findByText("admin api down")).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });
});
