import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PresetFamilySelector } from "@/components/consumer/preset-family-selector";
import type { FamilyRailMember } from "@/lib/catalog/family";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

beforeAll(() => {
  window.matchMedia =
    window.matchMedia ??
    ((query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        onchange: null,
        dispatchEvent: () => false,
      }) as MediaQueryList);
});

function member(overrides: Partial<FamilyRailMember> = {}): FamilyRailMember {
  return {
    productId: "p",
    slug: "p",
    name: "Preset",
    label: "Preset",
    isParent: false,
    isCurrent: false,
    available: true,
    creditCost: 4,
    previewUrl: "https://cdn.example.com/t.jpg",
    inputCapability: null,
    ...overrides,
  };
}

const FAMILY = [
  member({ productId: "root", slug: "root", label: "Original", isParent: true, isCurrent: true }),
  member({ productId: "v1", slug: "warm", label: "Warm" }),
  member({ productId: "v2", slug: "cool", label: "Cool" }),
];

describe("PresetFamilySelector (#180)", () => {
  it("renders nothing for a standalone preset (≤1 member)", () => {
    const { container } = render(
      <PresetFamilySelector members={[FAMILY[0]]} currentProductId="root" />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the rail with the current position", () => {
    render(
      <PresetFamilySelector members={FAMILY} currentProductId="root" />
    );
    expect(screen.getByRole("listbox", { name: "Styles in this set" })).toBeTruthy();
    expect(screen.getByText("1 of 3")).toBeTruthy();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0].getAttribute("aria-selected")).toBe("true");
    expect(options[1].getAttribute("aria-selected")).toBe("false");
  });

  it("defaults to permalink links in link mode", () => {
    render(
      <PresetFamilySelector members={FAMILY} currentProductId="root" />
    );
    const warm = screen.getByRole("option", { name: "Warm" });
    expect(warm.tagName).toBe("A");
    expect(warm.getAttribute("href")).toBe("/presets/warm");
  });

  it("calls onSelect instead of navigating in button mode", () => {
    const onSelect = vi.fn();
    render(
      <PresetFamilySelector
        members={FAMILY}
        currentProductId="root"
        onSelect={onSelect}
      />
    );
    fireEvent.click(screen.getByRole("option", { name: "Cool" }));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "cool" })
    );
  });

  it("moves roving focus with arrow keys", () => {
    render(
      <PresetFamilySelector members={FAMILY} currentProductId="root" />
    );
    const rail = screen.getByRole("listbox");
    const options = screen.getAllByRole("option");
    expect(options[0].getAttribute("tabindex")).toBe("0");
    expect(options[1].getAttribute("tabindex")).toBe("-1");

    fireEvent.keyDown(rail, { key: "ArrowRight" });
    expect(options[1].getAttribute("tabindex")).toBe("0");
    expect(options[0].getAttribute("tabindex")).toBe("-1");

    fireEvent.keyDown(rail, { key: "ArrowLeft" });
    expect(options[0].getAttribute("tabindex")).toBe("0");

    fireEvent.keyDown(rail, { key: "End" });
    expect(options[2].getAttribute("tabindex")).toBe("0");
  });

  it("surfaces a compat notice on members that cannot carry the draft", () => {
    render(
      <PresetFamilySelector
        members={FAMILY}
        currentProductId="root"
        onSelect={() => {}}
        noticeFor={(m) =>
          m.productId === "v2"
            ? "Custom prompts aren’t available on this variation"
            : null
        }
      />
    );
    expect(
      screen.getByText(/Custom prompts aren’t available/)
    ).toBeTruthy();
    expect(
      screen.getByRole("option", {
        name: /Cool — Custom prompts aren’t available/,
      })
    ).toBeTruthy();
  });

  it("does not fire onSelect for an unavailable member", () => {
    const onSelect = vi.fn();
    render(
      <PresetFamilySelector
        members={[FAMILY[0], member({ ...FAMILY[1], available: false })]}
        currentProductId="root"
        onSelect={onSelect}
      />
    );
    const disabled = screen.getByRole("option", { name: "Warm" });
    fireEvent.click(disabled);
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByText("Unavailable")).toBeTruthy();
  });

  it("offers a See all sheet beyond the threshold", () => {
    const big = [
      FAMILY[0],
      ...Array.from({ length: 9 }, (_, i) =>
        member({ productId: `v${i}`, slug: `v${i}`, label: `V${i}` })
      ),
    ];
    render(
      <PresetFamilySelector
        members={big}
        currentProductId="root"
        sheetThreshold={8}
      />
    );
    fireEvent.click(screen.getByText("See all"));
    expect(screen.getByText("All variations")).toBeTruthy();
  });
});
