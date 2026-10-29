import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "../src/components/AppLayout";
import { useAuth } from "../src/hooks/useAuth";

vi.mock("../src/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../src/api/client", () => ({ api: { getXP: vi.fn().mockResolvedValue({ xp: 0 }), search: vi.fn() } }));

const setup = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<p>home content</p>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  vi.mocked(useAuth).mockReturnValue({ user: { id: "u1", email: "a@b.com" }, loading: false, signOut: vi.fn() } as any);
});

describe("AppLayout onboarding", () => {
  it("shows the onboarding modal on first visit", () => {
    setup();
    expect(screen.getByText("Welcome to Study AI")).toBeInTheDocument();
  });

  it("does not show onboarding again once it's been seen", () => {
    localStorage.setItem("study-ai:onboarding-seen", "true");
    setup();
    expect(screen.queryByText("Welcome to Study AI")).not.toBeInTheDocument();
  });

  it("dismissing onboarding reveals the page content underneath", () => {
    setup();
    fireEvent.click(screen.getByText("Skip"));
    expect(screen.queryByText("Welcome to Study AI")).not.toBeInTheDocument();
    expect(screen.getByText("home content")).toBeInTheDocument();
  });
});
