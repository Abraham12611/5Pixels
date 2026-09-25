import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { FilterModal } from "@/components/consumer/mobile/filter-modal";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/explore",
}));

const fetchCategoryCounts = vi.fn();
vi.mock("@/lib/catalog/browser", () => ({
  fetchCategoryCounts: (...args: unknown[]) => fetchCategoryCounts(...args),
}));

const CATEGORIES = [
  { slug: "cinematic", name: "Cinematic" },
  { slug: "professional", name: "Professional" },
];

function renderModal(overrides: Partial<Parameters<typeof FilterModal>[0]> = {}) {
  const onOpenChange = vi.fn();
  render(
    <FilterModal
      open
      onOpenChange={onOpenChange}
      appliedSearch={null}
      appliedType={null}
      appliedCategory={null}
      appliedSort="featured"
      categories={CATEGORIES}
      {...overrides}
    />
  );
  return onOpenChange;
}

beforeEach(() => {
  vi.useFakeTimers();
  push.mockReset();
  fetchCategoryCounts.mockReset();
  fetchCategoryCounts.mockResolvedValue({
    counts: { cinematic: 3, professional: 5 },
    total: 8,
  });
});

async function settleCounts() {
  await act(async () => {
    vi.advanceTimersByTime(300);
    await Promise.resolve();
  });
}

describe("FilterModal", () => {
  it("does not navigate until the docked CTA is tapped", async () => {
    renderModal();
    await settleCounts();

    fireEvent.click(screen.getByRole("checkbox", { name: /cinematic/i }));
    fireEvent.click(screen.getByRole("radio", { name: "Newest" }));
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Show 3 looks" }));
    expect(push).toHaveBeenCalledWith(
      "/explore?category=cinematic&sort=newest"
    );
  });

  it("stages type and shows the scoped count on the CTA", async () => {
    renderModal();
    await settleCounts();

    expect(
      screen.getByRole("button", { name: "Show 8 looks" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Posters" }));
    // count refetches for the staged type
    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });
    expect(fetchCategoryCounts).toHaveBeenLastCalledWith("poster", null);
  });

  it("Reset clears staged selections without closing or navigating", async () => {
    const onOpenChange = renderModal({ appliedCategory: "cinematic" });
    await settleCounts();

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(
      screen.getByRole("checkbox", { name: /cinematic/i })
    ).toHaveAttribute("aria-checked", "false");
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("preserves the applied search when applying filters", async () => {
    renderModal({ appliedSearch: "portrait" });
    await settleCounts();

    fireEvent.click(screen.getByRole("button", { name: /show/i }));
    expect(push).toHaveBeenCalledWith(
      expect.stringContaining("search=portrait")
    );
  });
});
