import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PublicHeader } from "../src/components/PublicHeader";
import { Landing } from "../src/pages/Landing";

describe("PublicHeader", () => {
  it("links to the landing, login and register routes", () => {
    render(<MemoryRouter><PublicHeader /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /study ai/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/register");
  });
});

describe("Landing", () => {
  it("presents the four stages of the study loop in order", () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    const titles = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(["Ingest", "Summarize", "Practice", "Level up"]);
  });

  it("offers calls to action that lead to registration and login", () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    expect(screen.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: /create your account/i })).toHaveAttribute("href", "/register");
  });
});
