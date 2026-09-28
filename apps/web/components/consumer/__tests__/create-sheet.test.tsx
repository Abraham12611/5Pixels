import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateSheet } from "../create-sheet";
import { RECENT_PRESETS_KEY } from "@/lib/search/recents";

const loadStudioDraft = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/anonymous-draft", () => ({
  loadStudioDraft: (...args: unknown[]) => loadStudioDraft(...args),
}));

const recents = [
  { slug: "cyber-punk", name: "Cyber Punk", thumbUrl: null },
  { slug: "noir", name: "Noir", thumbUrl: null },
];

describe("CreateSheet", () => {
  beforeEach(() => {
    window.localStorage.clear();
    loadStudioDraft.mockReset().mockResolvedValue(null);
  });

  it("lists recent looks and a browse-all row", () => {
    window.localStorage.setItem(RECENT_PRESETS_KEY, JSON.stringify(recents));
    render(<CreateSheet open onOpenChange={vi.fn()} />);
    expect(screen.getByText("Recent looks")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /cyber punk/i })
    ).toHaveAttribute("href", "/app/create/cyber-punk");
    expect(screen.getByRole("link", { name: /browse all looks/i }))
      .toHaveAttribute("href", "/explore");
  });

  it("shows a resume card when a draft exists", async () => {
    window.localStorage.setItem(RECENT_PRESETS_KEY, JSON.stringify(recents));
    loadStudioDraft.mockResolvedValue({ slug: "noir" });
    render(<CreateSheet open onOpenChange={vi.fn()} />);
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /resume your last setup/i })
      ).toHaveAttribute("href", "/app/create/noir?draft=1")
    );
    expect(screen.getByText(/noir — we kept your photo/i)).toBeInTheDocument();
  });

  it("renders just browse-all with no recents or draft", () => {
    render(<CreateSheet open onOpenChange={vi.fn()} />);
    expect(screen.queryByText("Recent looks")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse all looks/i }))
      .toBeInTheDocument();
  });

  it("closes when a destination is picked", () => {
    const onOpenChange = vi.fn();
    render(<CreateSheet open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("link", { name: /browse all looks/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
