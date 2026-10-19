import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { AspectRatioMenu } from "../aspect-ratio-menu";
import type { OutputSizeOption } from "@/types/catalog";

// Radix dropdown content mounts a modal layer (scroll-lock + focus trap)
// that never settles under jsdom. The regression under test is structural:
// size options must render as real menu items so Radix closes the menu on
// select — plain <button> children leave the menu open and scroll-locked.
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div role="menu">{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onSelect,
    disabled,
    className,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <div
      role="menuitem"
      aria-disabled={disabled}
      className={className}
      onClick={onSelect}
    >
      {children}
    </div>
  ),
}));

const sizes: OutputSizeOption[] = [
  {
    name: "Square",
    width: 1024,
    height: 1024,
    aspect_ratio: "1:1",
  } as OutputSizeOption,
  {
    name: "Hero",
    width: 1536,
    height: 1024,
    aspect_ratio: "3:2",
  } as OutputSizeOption,
];

describe("AspectRatioMenu", () => {
  it("renders each size as a menu item so selection closes the menu", () => {
    render(
      <AspectRatioMenu
        sizes={sizes}
        selected={sizes[0]}
        onChange={vi.fn()}
      />,
    );
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(2);
  });

  it("invokes onChange with the selected size", () => {
    const onChange = vi.fn();
    render(
      <AspectRatioMenu sizes={sizes} selected={sizes[0]} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: /Hero/ }));
    expect(onChange).toHaveBeenCalledWith(sizes[1]);
  });
});
