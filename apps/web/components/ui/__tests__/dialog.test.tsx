import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../dialog";

function TestDialog({ initiallyOpen = false }: { initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Trigger
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>Are you sure?</DialogDescription>
          <button type="button">First</button>
          <button type="button">Second</button>
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}

describe("Dialog accessibility", () => {
  it("renders dialog semantics when open", () => {
    render(<TestDialog initiallyOpen />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("moves focus inside the dialog on open", () => {
    render(<TestDialog initiallyOpen />);
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("traps Tab inside the dialog", () => {
    render(<TestDialog initiallyOpen />);
    const dialog = screen.getByRole("dialog");
    const close = screen.getByRole("button", { name: "Close" });
    const first = screen.getByRole("button", { name: "First" });

    // On the last focusable element, Tab wraps to the first.
    close.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(first);

    // Shift+Tab on the first wraps to the last.
    first.focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(close);

    // Focus never escapes the panel.
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("returns focus to the trigger after close", () => {
    render(<TestDialog />);
    const trigger = screen.getByRole("button", { name: "Trigger" });
    trigger.focus();
    fireEvent.click(trigger);

    expect(document.activeElement).not.toBe(trigger);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape", () => {
    render(<TestDialog initiallyOpen />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("locks body scroll while open", () => {
    render(<TestDialog initiallyOpen />);
    expect(document.body.style.overflow).toBe("hidden");
  });
});
