import { describe, expect, it, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { Sheet, type SheetTier } from "../sheet";
import { activeScrollLocks } from "@/lib/ui/scroll-lock";

// jsdom has no PointerEvent; MouseEvent carries the coordinates React reads.
function pointer(el: Element, type: string, clientY: number) {
  fireEvent(el, new MouseEvent(type, { clientY, bubbles: true }));
}

function TestSheet({
  initiallyOpen = false,
  tier = "content",
}: {
  initiallyOpen?: boolean;
  tier?: SheetTier;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Trigger
      </button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        tier={tier}
        title="Quick view"
        description="Preset details"
      >
        <button type="button">Inside</button>
      </Sheet>
    </>
  );
}

function NestedSheets() {
  const [outer, setOuter] = useState(true);
  const [inner, setInner] = useState(false);
  return (
    <>
      <Sheet open={outer} onOpenChange={setOuter} title="Outer">
        <button type="button" onClick={() => setInner(true)}>
          Open inner
        </button>
      </Sheet>
      <Sheet open={inner} onOpenChange={setInner} tier="action" nested title="Inner">
        <button type="button" onClick={() => setInner(false)}>
          Dismiss inner
        </button>
      </Sheet>
    </>
  );
}

describe("Sheet", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
    document.body.style.position = "";
  });

  it("exposes modal dialog semantics named by its title", () => {
    render(<TestSheet initiallyOpen />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Quick view");
    expect(dialog).toHaveAccessibleDescription("Preset details");
  });

  it("moves focus inside on open and restores it to the trigger on close", () => {
    render(<TestSheet />);
    const trigger = screen.getByRole("button", { name: "Trigger" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape", () => {
    render(<TestSheet initiallyOpen />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on scrim tap but not on panel tap", () => {
    const { container } = render(<TestSheet initiallyOpen />);
    const scrim = container.querySelector('[role="presentation"]');
    expect(scrim).not.toBeNull();

    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.click(scrim as Element);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on browser Back", () => {
    render(<TestSheet initiallyOpen />);
    fireEvent.popState(window);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes on a downward swipe of the handle", () => {
    render(<TestSheet initiallyOpen />);
    const handle = screen.getByTestId("sheet-handle");
    Object.defineProperty(screen.getByRole("dialog"), "offsetHeight", {
      configurable: true,
      value: 400,
    });

    pointer(handle, "pointerdown", 0);
    pointer(handle, "pointermove", 200);
    pointer(handle, "pointerup", 200);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the sheet open for a short drag", () => {
    render(<TestSheet initiallyOpen />);
    const handle = screen.getByTestId("sheet-handle");
    Object.defineProperty(screen.getByRole("dialog"), "offsetHeight", {
      configurable: true,
      value: 400,
    });

    pointer(handle, "pointerdown", 0);
    pointer(handle, "pointermove", 20);
    pointer(handle, "pointerup", 20);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("has no drag handle on the full-screen tier", () => {
    render(<TestSheet initiallyOpen tier="full" />);
    expect(screen.queryByTestId("sheet-handle")).not.toBeInTheDocument();
  });

  it("keeps scroll locked until the last nested overlay closes", () => {
    render(<NestedSheets />);
    expect(activeScrollLocks()).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Open inner" }));
    expect(activeScrollLocks()).toBe(2);
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss inner" }));
    expect(activeScrollLocks()).toBe(1);
    expect(document.body.style.overflow).toBe("hidden");
  });
});
