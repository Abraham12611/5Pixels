import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryManager } from "../category-manager";

const noop = vi.fn().mockResolvedValue({});

const CATEGORY = {
  id: "c1",
  slug: "an-extremely-long-category-slug-that-keeps-going",
  name: "A Very Long Category Name Withalongunbrokenword",
  description: "Long descriptions should still fit inside the card.",
  sort_order: 1,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderManager() {
  return render(
    <CategoryManager
      categories={[CATEGORY]}
      onCreate={noop}
      onUpdate={noop}
      onToggleActive={noop}
    />
  );
}

describe("CategoryManager — mobile overflow (#228)", () => {
  it("wraps the row and action cluster so controls stay on screen", () => {
    const { container } = renderManager();
    const li = container.querySelector("li");
    expect(li).toHaveClass("flex-wrap");

    const cluster = screen
      .getByRole("button", { name: "Edit" })
      .closest("div");
    expect(cluster).toHaveClass("flex-wrap");
  });

  it("keeps Deactivate and Edit reachable with long names", () => {
    renderManager();
    expect(
      screen.getByRole("button", { name: "Deactivate" })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("lets the info block shrink and break long slugs", () => {
    const { container } = renderManager();
    const info = container.querySelector("li > div");
    expect(info).toHaveClass("min-w-0");
    expect(
      screen.getByText(CATEGORY.slug)
    ).toHaveClass("wrap-anywhere");
  });
});
