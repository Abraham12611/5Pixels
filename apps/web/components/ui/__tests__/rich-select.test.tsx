import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RichSelect } from "../rich-select";

// Radix Popover needs these APIs that jsdom doesn't implement.
beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  HTMLElement.prototype.scrollIntoView ??= () => {};
  HTMLElement.prototype.hasPointerCapture ??= () => false;
  HTMLElement.prototype.setPointerCapture ??= () => {};
  HTMLElement.prototype.releasePointerCapture ??= () => {};
});

const OPTIONS = [
  { value: "flux", label: "Flux Dev", description: "fal-ai/flux/dev" },
  { value: "ideogram", label: "Ideogram V3", description: "fal-ai/ideogram/v3" },
  { value: "banana", label: "Nano Banana", description: "fal-ai/nano-banana" },
];

/** Radix trigger toggles on click; jsdom needs the pointer pair first. */
function openSelect(name: string | RegExp = "Model") {
  const trigger = screen.getByRole("button", { name });
  fireEvent.pointerDown(trigger);
  fireEvent.pointerUp(trigger);
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  return trigger;
}

const SLOW = 30_000;

describe("RichSelect", () => {
  it(
    "opens the panel and fires onValueChange when an option is picked",
    () => {
      const onValueChange = vi.fn();
      render(
        <RichSelect
          aria-label="Model"
          value="flux"
          onValueChange={onValueChange}
          options={OPTIONS}
        />
      );

      openSelect();

      fireEvent.click(
        screen.getByRole("option", { name: /ideogram v3/i })
      );

      expect(onValueChange).toHaveBeenCalledWith("ideogram");
    },
    SLOW
  );

  it(
    "filters options via the in-panel search",
    () => {
      render(
        <RichSelect
          aria-label="Model"
          value=""
          onValueChange={() => {}}
          options={OPTIONS}
          searchable
          searchPlaceholder="Search models…"
        />
      );

      openSelect();
      fireEvent.change(screen.getByPlaceholderText("Search models…"), {
        target: { value: "banana" },
      });

      expect(
        screen.getByRole("option", { name: /nano banana/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("option", { name: /ideogram/i })
      ).not.toBeInTheDocument();
    },
    SLOW
  );

  it(
    "marks the selected option and exposes the footer escape hatch",
    () => {
      const onValueChange = vi.fn();
      render(
        <RichSelect
          aria-label="Model"
          value="flux"
          onValueChange={onValueChange}
          options={OPTIONS}
          footerOption={{ value: "__custom__", label: "Custom value…" }}
        />
      );

      openSelect();

      const selected = screen.getByRole("option", { name: /flux dev/i });
      expect(selected).toHaveAttribute("aria-selected", "true");

      fireEvent.click(screen.getByText("Custom value…"));
      expect(onValueChange).toHaveBeenCalledWith("__custom__");
    },
    SLOW
  );
});
