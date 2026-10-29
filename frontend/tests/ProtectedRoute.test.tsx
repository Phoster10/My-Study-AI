import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "../src/components/ProtectedRoute";
import { useAuth } from "../src/hooks/useAuth";

vi.mock("../src/hooks/useAuth", () => ({ useAuth: vi.fn() }));

const renderAt = () => render(
  <MemoryRouter initialEntries={["/dashboard"]}>
    <Routes>
      <Route path="/login" element={<p>login page</p>} />
      <Route path="/dashboard" element={<ProtectedRoute><p>secret dashboard</p></ProtectedRoute>} />
    </Routes>
  </MemoryRouter>
);

describe("ProtectedRoute", () => {
  it("shows a loading state while the session is resolving", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: true, signOut: vi.fn() } as any);
    renderAt();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("secret dashboard")).not.toBeInTheDocument();
  });

  it("redirects anonymous users to /login", () => {
    vi.mocked(useAuth).mockReturnValue({ user: null, loading: false, signOut: vi.fn() } as any);
    renderAt();
    expect(screen.getByText("login page")).toBeInTheDocument();
  });

  it("renders children for signed-in users", () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "u1" }, loading: false, signOut: vi.fn() } as any);
    renderAt();
    expect(screen.getByText("secret dashboard")).toBeInTheDocument();
  });
});
