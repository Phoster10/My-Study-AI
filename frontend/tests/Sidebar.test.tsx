import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sidebar } from "../src/components/Sidebar";
import { api } from "../src/api/client";

vi.mock("../src/api/client", () => ({ api: { getXP: vi.fn() } }));
beforeEach(() => vi.mocked(api.getXP).mockReset());

describe("Sidebar", () => {
  it("renders all nav items", () => {
    vi.mocked(api.getXP).mockResolvedValue({ xp: 0 });
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    for (const label of ["Home", "History"]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: /^XP/ })).toBeInTheDocument();
  });

  it("does not link to Settings (the page is not part of the navigation)", () => {
    vi.mocked(api.getXP).mockResolvedValue({ xp: 0 });
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: /settings/i })).not.toBeInTheDocument();
  });

  it("shows the current XP total as a badge on the XP nav item", async () => {
    vi.mocked(api.getXP).mockResolvedValue({ xp: 240 });
    render(<MemoryRouter><Sidebar /></MemoryRouter>);
    expect(await screen.findByText("240")).toBeInTheDocument();
  });
});
