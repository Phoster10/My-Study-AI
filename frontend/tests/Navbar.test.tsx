import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "../src/components/Navbar";
import { useAuth } from "../src/hooks/useAuth";
import { api } from "../src/api/client";
import { useStudyStore } from "../src/store/useStudyStore";

vi.mock("../src/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../src/api/client", () => ({ api: { search: vi.fn() } }));

const signOut = vi.fn();
const anon = () => vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, signOut } as any);
const authed = () => vi.mocked(useAuth).mockReturnValue({ user: { id: "u1" }, loading: false, signOut } as any);

const setup = () =>
  render(
    <MemoryRouter initialEntries={["/somewhere"]}>
      <Navbar />
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/dashboard" element={<p>dashboard page</p>} />
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  useStudyStore.getState().reset();
  vi.mocked(api.search).mockReset();
});

describe("Navbar search", () => {
  it("does nothing for an empty query", () => {
    anon();
    setup();
    fireEvent.keyDown(screen.getByPlaceholderText("Search..."), { key: "Enter" });
    expect(api.search).not.toHaveBeenCalled();
  });

  it("redirects an anonymous searcher to log in instead of calling the API", async () => {
    anon();
    setup();
    fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "mitochondria" } });
    fireEvent.keyDown(screen.getByPlaceholderText("Search..."), { key: "Enter" });
    expect(await screen.findByText("login page")).toBeInTheDocument();
    expect(api.search).not.toHaveBeenCalled();
  });

  it("runs the search for a signed-in user and stores the result", async () => {
    authed();
    vi.mocked(api.search).mockResolvedValue({ result: "Mitochondria produce ATP." });
    setup();
    fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "mitochondria" } });
    fireEvent.keyDown(screen.getByPlaceholderText("Search..."), { key: "Enter" });
    await waitFor(() => expect(useStudyStore.getState().searchResult).toBe("Mitochondria produce ATP."));
    expect(api.search).toHaveBeenCalledWith("mitochondria");
  });

  it("clicking the search icon triggers the same search", async () => {
    authed();
    vi.mocked(api.search).mockResolvedValue({ result: "ok" });
    const { container } = setup();
    fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "x" } });
    fireEvent.click(container.querySelector(".navbar__search-icon")!);
    await waitFor(() => expect(api.search).toHaveBeenCalledWith("x"));
  });

  it("stores a failure message if the search request fails", async () => {
    authed();
    vi.mocked(api.search).mockRejectedValue(new Error("groq down"));
    setup();
    fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "x" } });
    fireEvent.keyDown(screen.getByPlaceholderText("Search..."), { key: "Enter" });
    await waitFor(() => expect(useStudyStore.getState().searchResult).toBe("Search failed."));
  });
});
