import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NotificationsMenu } from "../src/components/NotificationsMenu";

beforeEach(() => localStorage.clear());

describe("NotificationsMenu (in-app feature guide)", () => {
  it("shows an unseen dot until the guide has been opened once", () => {
    const { container } = render(<NotificationsMenu />);
    expect(container.querySelector(".topbar__notification-dot")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    expect(container.querySelector(".topbar__notification-dot")).toBeNull();
  });

  it("remembers that the guide was seen across renders", () => {
    const first = render(<NotificationsMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    first.unmount();
    const { container } = render(<NotificationsMenu />);
    expect(container.querySelector(".topbar__notification-dot")).toBeNull();
  });

  it("opens a dialog listing what the app can do, with XP badges for goal actions", () => {
    render(<NotificationsMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
    const dialog = screen.getByRole("dialog", { name: /what you can do/i });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Add your notes")).toBeInTheDocument();
    expect(screen.getByText("Practice exams")).toBeInTheDocument();
    expect(screen.getByText("+25 XP")).toBeInTheDocument(); // upload goal
  });

  it("closes with the close button, Escape, or a click outside", () => {
    render(<NotificationsMenu />);
    const open = () => fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    open();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    open();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("still works when localStorage is unavailable", () => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = () => {
      throw new Error("denied");
    };
    try {
      render(<NotificationsMenu />);
      fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    } finally {
      Storage.prototype.getItem = original;
    }
  });
});
