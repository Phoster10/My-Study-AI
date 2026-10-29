import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { XPHub } from "../src/pages/XPHub";
import { api } from "../src/api/client";

vi.mock("../src/api/client", () => ({ api: { getXP: vi.fn() } }));

beforeEach(() => {
  localStorage.clear();
  vi.mocked(api.getXP).mockReset();
});

describe("XPHub", () => {
  it("renders the level, XP total, and all three daily goals as not-yet-done", async () => {
    vi.mocked(api.getXP).mockResolvedValue({ xp: 240 });
    render(<XPHub />);
    expect(await screen.findByText("XP Hub")).toBeInTheDocument();
    expect(screen.getByText("Beginner Learner")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0); // level 1 at 240 xp
    expect(screen.getByText("240", { selector: ".stat-card__value" })).toBeInTheDocument();
    expect(screen.getByText("Upload a file")).toBeInTheDocument();
    expect(screen.getByText("Generate a summary")).toBeInTheDocument();
    expect(screen.getByText("Use AI")).toBeInTheDocument();
    expect(screen.getByText("0/3")).toBeInTheDocument();
  });

  it("computes level titles correctly at higher levels", async () => {
    vi.mocked(api.getXP).mockResolvedValue({ xp: 3200 }); // level 7
    render(<XPHub />);
    expect(await screen.findByText("Dedicated Student")).toBeInTheDocument();
  });

  it("reflects goals already completed today (checkmarks from localStorage) and total XP earned today (separate running total)", async () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`study-ai:daily-goals:${today}`, JSON.stringify({ upload: true, summary: false, ai: false }));
    localStorage.setItem(`study-ai:xp-today`, JSON.stringify({ date: today, amount: 65 })); // e.g. uploaded twice + summarized once
    vi.mocked(api.getXP).mockResolvedValue({ xp: 25 });
    render(<XPHub />);
    expect(await screen.findByText("1/3")).toBeInTheDocument();
    expect(screen.getByText("+65 today")).toBeInTheDocument();
  });

  it("shows the all-complete banner when all 3 goals are done", async () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`study-ai:daily-goals:${today}`, JSON.stringify({ upload: true, summary: true, ai: true }));
    vi.mocked(api.getXP).mockResolvedValue({ xp: 60 });
    render(<XPHub />);
    expect(await screen.findByText("All daily goals complete!")).toBeInTheDocument();
  });
});
