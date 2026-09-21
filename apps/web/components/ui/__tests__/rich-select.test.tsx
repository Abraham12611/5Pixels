import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RichSelect } from "../rich-select";

// The real Radix popover relies on browser behaviors jsdom lacks
// (animationend for Presence unmount, pointer capture, real focus events),
// which leaves the layer mounted and floods the event loop for tens of
// seconds per test — enough to starve vitest's worker RPC channel and
// trip "Timeout calling onTaskUpdate". Stub the primitives so the tests
// exercise OUR selection logic only.
vi.mock("radix-ui", async () => {
  const React = await import("react");
  const Ctx = React.createContext<{
    open: boolean;
    setOpen: (v: boolean) => void;
  }>({ open: false, setOpen: () => {} });

  const Root = ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange?: (v: boolean) => void;
    children: React.ReactNode;
  }) => (
    <Ctx.Provider value={{ open, setOpen: onOpenChange ?? (() => {}) }}>
      {children}
    </Ctx.Provider>
  );

  const Trigger = ({
    children,
  }: {
    children: React.ReactElement<Record<string, unknown>>;
  }) => {
    const { open, setOpen } = React.useContext(Ctx);
    return React.cloneElement(children, {
      onClick: () => setOpen(!open),
      "aria-expanded": open,
    });
  };

  const Portal = ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  );

  const Content = ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => {
    const { open } = React.useContext(Ctx);
    return open ? <div className={className}>{children}</div> : null;
  };

  return { Popover: { Root, Trigger, Portal, Content } };
});

const OPTIONS = [
  { value: "flux", label: "Flux Dev", description: "fal-ai/flux/dev" },
  { value: "ideogram", label: "Ideogram V3", description: "fal-ai/ideogram/v3" },
  { value: "banana", label: "Nano Banana", description: "fal-ai/nano-banana" },
];

function openSelect(name: string | RegExp = "Model") {
  const trigger = screen.getByRole("button", { name });
  fireEvent.click(trigger);
  expect(trigger).toHaveAttribute("aria-expanded", "true");
  return trigger;
}

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
    }
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
    }
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
    }
  );
});
