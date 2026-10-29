import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Login } from "../src/pages/Login";
import { Register } from "../src/pages/Register";
import { supabase } from "../src/lib/supabase";

vi.mock("../src/lib/supabase", () => ({ supabase: { auth: { signInWithPassword: vi.fn(), signUp: vi.fn() } } }));

const setup = (ui: JSX.Element) => render(
  <MemoryRouter initialEntries={["/x"]}>
    <Routes><Route path="/x" element={ui} /><Route path="/dashboard" element={<p>dashboard page</p>} /></Routes>
  </MemoryRouter>
);
const fill = (email = "a@b.com", password = "secret1") => {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
};

beforeEach(() => { vi.mocked(supabase.auth.signInWithPassword).mockReset(); vi.mocked(supabase.auth.signUp).mockReset(); });

describe("Login", () => {
  it("signs in and navigates to the dashboard", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: null } as any);
    setup(<Login />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.com", password: "secret1" });
  });

  it("shows the error and stays on the page when credentials are wrong", async () => {
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({ data: {}, error: { message: "Invalid login credentials" } } as any);
    setup(<Login />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByText("Invalid login credentials")).toBeInTheDocument();
    expect(screen.queryByText("dashboard page")).not.toBeInTheDocument();
  });
});

describe("Register", () => {
  it("navigates to the dashboard when a session is returned immediately", async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: { session: { access_token: "t" } }, error: null } as any);
    setup(<Register />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(await screen.findByText("dashboard page")).toBeInTheDocument();
  });

  it("asks the user to confirm their email when there is no session yet", async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: { session: null }, error: null } as any);
    setup(<Register />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
  });

  it("shows sign-up errors", async () => {
    vi.mocked(supabase.auth.signUp).mockResolvedValue({ data: {}, error: { message: "User already registered" } } as any);
    setup(<Register />);
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    expect(await screen.findByText("User already registered")).toBeInTheDocument();
  });
});
