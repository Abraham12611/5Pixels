import { describe, expect, it, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ResultVariantPicker } from "@/components/consumer/result-variant-picker";
import type { VariantHandoff } from "@/lib/generation/variant-handoff";
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

function handoff(
  slug: string,
  overrides: Partial<FamilyRailMember> = {},
  notices: string[] = []
): VariantHandoff {
  const member: FamilyRailMember = {
    productId: slug,
    slug,
    name: slug,
    label: slug,
    isParent: false,
    isCurrent: false,
    available: true,
    creditCost: 4,
    previewUrl: null,
    inputCapability: null,
    ...overrides,
  };
  return {
    member,
    hrefs: {
      original: `/app/create/${slug}?variant_from=gen-1`,
      output: `/app/create/${slug}?variant_from=gen-1&variant_source=output`,
    },
    notices,
    carriedCount: 1,
  };
}

const HANDOFFS = [
  handoff("root", { isParent: true, isCurrent: true }),
  handoff("warm", { slug: "warm", label: "Warm" }),
  handoff("cool", { slug: "cool", label: "Cool" }, ["needs a “reference” image"]),
];

describe("ResultVariantPicker (#184)", () => {
  it("renders nothing for a single-member family", () => {
    const { container } = render(
      <ResultVariantPicker
        handoffs={[HANDOFFS[0]]}
        currentProductId="root"
        resultAsSourceAvailable
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("links each sibling to a prepared create form — free to pick", () => {
    render(
      <ResultVariantPicker
        handoffs={HANDOFFS}
        currentProductId="root"
        resultAsSourceAvailable
      />
    );
    const warm = screen.getByRole("option", { name: "Warm" });
    expect(warm.getAttribute("href")).toBe(
      "/app/create/warm?variant_from=gen-1"
    );
    expect(screen.getByText(/free to pick/i)).toBeTruthy();
  });

  it("swaps links to the derivative source when 'This result' is chosen", () => {
    render(
      <ResultVariantPicker
        handoffs={HANDOFFS}
        currentProductId="root"
        resultAsSourceAvailable
      />
    );
    fireEvent.click(screen.getByLabelText("This result"));
    const warm = screen.getByRole("option", { name: "Warm" });
    expect(warm.getAttribute("href")).toBe(
      "/app/create/warm?variant_from=gen-1&variant_source=output"
    );
  });

  it("hides the source toggle when no output is usable", () => {
    render(
      <ResultVariantPicker
        handoffs={HANDOFFS}
        currentProductId="root"
        resultAsSourceAvailable={false}
      />
    );
    expect(screen.queryByLabelText("This result")).toBeNull();
  });

  it("surfaces the sibling's compat notice", () => {
    render(
      <ResultVariantPicker
        handoffs={HANDOFFS}
        currentProductId="root"
        resultAsSourceAvailable
      />
    );
    expect(screen.getByText(/needs a “reference” image/)).toBeTruthy();
  });
});
