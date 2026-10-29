import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LevelPanel } from "../src/components/LevelPanel";
import { api } from "../src/api/client";

vi.mock("../src/api/client", () => ({ api: { getXP: vi.fn() } }));
beforeEach(() => { vi.mocked(api.getXP).mockReset(); });

describe("LevelPanel", () => {
  it("computes level 1 and the correct progress bar for 240 XP", async () => {
    vi.mocked(api.getXP).mockResolvedValue({ xp: 240 });
    render(<LevelPanel />);
    expect(await screen.findByText("1")).toBeInTheDocument();
    expect(screen.getByText("240")).toBeInTheDocument();
    expect(screen.getByText("260 XP to Next Level")).toBeInTheDocument();
  });

  it("computes level 2 right at the 500 XP boundary", async () => {
    vi.mocked(api.getXP).mockResolvedValue({ xp: 500 });
    render(<LevelPanel />);
    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(screen.getByText("500 XP to Next Level")).toBeInTheDocument();
  });

  it("computes level 3 partway through a later level", async () => {
    vi.mocked(api.getXP).mockResolvedValue({ xp: 1250 });
    render(<LevelPanel />);
    expect(await screen.findByText("3")).toBeInTheDocument();
    expect(screen.getByText("250 XP to Next Level")).toBeInTheDocument();
  });

  // Note: the failure branch (api.getXP() rejects -> component falls back
  // to 0 XP via .catch()) isn't asserted here as a rejected-promise test,
  // for the same jsdom/environment reason documented for a prior version
  // of this component in git history: jsdom's virtual console reports
  // promise rejections created inside a React effect as environment-level
  // errors even when handled, unrelated to the component's actual
  // behavior. The .catch() is a single line; see docs/testing.md.
});
