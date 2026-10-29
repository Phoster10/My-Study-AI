// study-ai/frontend/tests/Account.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Account } from "../src/pages/Account";
import { useAuth } from "../src/hooks/useAuth";
import { api } from "../src/api/client";
import { supabase } from "../src/lib/supabase";

vi.mock("../src/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../src/api/client", () => ({ api: { updateUsername: vi.fn(), updatePassword: vi.fn() } }));
vi.mock("../src/lib/supabase", () => ({ supabase: { auth: { updateUser: vi.fn(), refreshSession: vi.fn() } } }));

const setup = () => render(<MemoryRouter><Account /></MemoryRouter>);

beforeEach(() => {
  vi.mocked(api.updateUsername).mockReset();
  vi.mocked(api.updatePassword).mockReset();
  vi.mocked(supabase.auth.updateUser).mockReset();
  vi.mocked(supabase.auth.refreshSession).mockReset().mockResolvedValue({ data: {}, error: null } as any);
  vi.mocked(useAuth).mockReturnValue({
    user: { email: "phoster@example.com", user_metadata: { username: "phoster" } },
    loading: false,
    signOut: vi.fn(),
  } as any);
});

describe("Account", () => {
  it("shows the signed-in user's email and pre-fills their current username", () => {
    setup();
    expect(screen.getByText("phoster@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("phoster")).toBeInTheDocument();
  });

  it("saves a new username through the backend, not directly via Supabase", async () => {
    vi.mocked(api.updateUsername).mockResolvedValue({ success: true, username: "newname" });
    setup();
    fireEvent.change(screen.getByDisplayValue("phoster"), { target: { value: "newname" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Username" }));
    await waitFor(() => expect(screen.getByText("Username updated.")).toBeInTheDocument());
    expect(api.updateUsername).toHaveBeenCalledWith("newname");
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("refreshes the session after a username change so the new name shows up app-wide", async () => {
    vi.mocked(api.updateUsername).mockResolvedValue({ success: true, username: "newname" });
    setup();
    fireEvent.change(screen.getByDisplayValue("phoster"), { target: { value: "newname" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Username" }));
    await waitFor(() => expect(supabase.auth.refreshSession).toHaveBeenCalled());
  });

  it("shows the backend's validation message if the username is rejected", async () => {
    vi.mocked(api.updateUsername).mockRejectedValue(new Error("Username must be 3-30 characters long."));
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Save Username" }));
    expect(await screen.findByText("Username must be 3-30 characters long.")).toBeInTheDocument();
    expect(screen.queryByText("Username updated.")).not.toBeInTheDocument();
    expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
  });

  it("sends both password fields to the backend and shows its validation error", async () => {
    vi.mocked(api.updatePassword).mockRejectedValue(new Error("Password must be at least 6 characters."));
    setup();
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "abc" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument();
    expect(api.updatePassword).toHaveBeenCalledWith("abc", "abc");
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it("shows the backend's error for mismatched confirmation", async () => {
    vi.mocked(api.updatePassword).mockRejectedValue(new Error("Passwords do not match."));
    setup();
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "abcdef" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "different" } });
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    expect(await screen.findByText(/do not match/i)).toBeInTheDocument();
    expect(api.updatePassword).toHaveBeenCalledWith("abcdef", "different");
  });

  it("changes the password through the backend and clears the fields on success", async () => {
    vi.mocked(api.updatePassword).mockResolvedValue({ success: true });
    setup();
    const newPw = screen.getByLabelText("New password") as HTMLInputElement;
    fireEvent.change(newPw, { target: { value: "abcdef" } });
    fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: "abcdef" } });
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
    await waitFor(() => expect(screen.getByText("Password updated.")).toBeInTheDocument());
    expect(api.updatePassword).toHaveBeenCalledWith("abcdef", "abcdef");
    expect(newPw.value).toBe("");
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
});