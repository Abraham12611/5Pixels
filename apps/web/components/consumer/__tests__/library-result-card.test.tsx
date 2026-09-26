import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LibraryResultCard } from "../library-result-card";
import type { LibraryItem } from "../library-grid";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Force the touch path — jsdom's matchMedia reports a wide viewport.
vi.mock("@/lib/ui/use-media-query", () => ({ useIsNarrow: () => true }));

vi.mock("@/lib/library/actions", () => ({
  setGenerationSaved: vi.fn(async () => ({ success: true })),
  deleteGeneration: vi.fn(async () => ({ success: true })),
  markGenerationDownloaded: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/lib/db/share", () => ({
  createPublicShare: vi.fn(async () => ({ shareUrl: "https://x/s/1" })),
}));

const item: LibraryItem = {
  id: "g1",
  productName: "Ink Portrait",
  productSlug: "ink-portrait",
  createdAt: new Date().toISOString(),
  savedAt: null,
  downloadedAt: null,
  outputUrl: "https://signed/out.jpg",
  outputWidth: 1024,
  outputHeight: 1376,
};

const handlers = {
  onSaved: vi.fn(),
  onDownloaded: vi.fn(),
  onDeleted: vi.fn(),
};

describe("LibraryResultCard (touch)", () => {
  it("renders preset name and a relative date under the media", () => {
    render(<LibraryResultCard item={item} {...handlers} />);
    expect(screen.getByText("Ink Portrait")).toBeInTheDocument();
    expect(screen.getByText(/^(just now|\d+m|\d+h|\d+d)/)).toBeInTheDocument();
  });

  it("opens a T1 action sheet with the spec'd row order", () => {
    render(<LibraryResultCard item={item} {...handlers} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "More actions for Ink Portrait result",
      })
    );
    const labels = ["Download", "Share", "Save", "Make again", "Delete"];
    for (const label of labels) {
      expect(
        screen.getByRole("button", { name: label })
      ).toBeInTheDocument();
    }
  });

  it("Delete swaps the sheet to an inline permanence confirm", () => {
    render(<LibraryResultCard item={item} {...handlers} />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "More actions for Ink Portrait result",
      })
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(
      screen.getByText(/permanently removes the result/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Delete permanently" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Keep it" })
    ).toBeInTheDocument();
  });
});
