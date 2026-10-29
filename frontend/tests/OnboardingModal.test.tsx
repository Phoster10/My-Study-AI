import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingModal, hasSeenOnboarding } from "../src/components/OnboardingModal";

const onDone = vi.fn();

beforeEach(() => {
  localStorage.clear();
  onDone.mockClear();
});

describe("hasSeenOnboarding", () => {
  it("is false before the tour has ever been shown", () => {
    expect(hasSeenOnboarding()).toBe(false);
  });

  it("is true once the tour has been marked seen", () => {
    localStorage.setItem("study-ai:onboarding-seen", "true");
    expect(hasSeenOnboarding()).toBe(true);
  });
});

describe("OnboardingModal", () => {
  it("starts on the welcome step", () => {
    render(<OnboardingModal onDone={onDone} />);
    expect(screen.getByText("Welcome to Study AI")).toBeInTheDocument();
  });

  it("steps forward through all 5 steps and finishes on the last one", () => {
    render(<OnboardingModal onDone={onDone} />);
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Build your History")).toBeInTheDocument();
    expect(screen.getByText("Get started")).toBeInTheDocument();
  });

  it("marks onboarding as seen and calls onDone when finished", () => {
    render(<OnboardingModal onDone={onDone} />);
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByText("Get started"));
    expect(hasSeenOnboarding()).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("can be skipped immediately from the first step", () => {
    render(<OnboardingModal onDone={onDone} />);
    fireEvent.click(screen.getByText("Skip"));
    expect(hasSeenOnboarding()).toBe(true);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("can be dismissed via the close button from any step", () => {
    render(<OnboardingModal onDone={onDone} />);
    fireEvent.click(screen.getByText("Next"));
    fireEvent.click(screen.getByLabelText("Skip tour"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("can go back a step", () => {
    render(<OnboardingModal onDone={onDone} />);
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("Add notes and summarize")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Welcome to Study AI")).toBeInTheDocument();
  });
});
