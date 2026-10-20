import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PresetListRow } from "../preset-list-row";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const noop = vi.fn().mockResolvedValue(undefined);

function renderRow(
  name = "Vintage Film",
  slug = "vintage-film",
  status: "active" | "paused" | "draft" = "active"
) {
  return render(
    <ul>
      <PresetListRow
        name={name}
        slug={slug}
        status={status}
        productId="p1"
        editHref="/admin/filters/p1"
        listHref="/admin/filters"
        statusAction={noop}
        duplicateAction={noop}
      />
    </ul>
  );
}

describe("PresetListRow — mobile overflow (#228)", () => {
  it("wraps the row and the action cluster so controls never leave the viewport", () => {
    const { container } = renderRow();
    const li = container.querySelector("li");
    expect(li).toHaveClass("flex-wrap");

    const editLink = screen.getByRole("link", { name: "Edit" });
    const cluster = editLink.closest("div");
    expect(cluster).toHaveClass("flex-wrap");
  });

  it("keeps every action reachable at phone widths", () => {
    renderRow();
    expect(
      screen.getByRole("button", { name: "Pause" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Retire" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Duplicate" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
  });

  it("lets the info block shrink and break long names/slugs", () => {
    const { container } = renderRow(
      "An Extremely Long Preset Name Withalongunbrokenword",
      "a-very-long-slug-that-keeps-going-forever"
    );
    const info = container.querySelector("li > div");
    expect(info).toHaveClass("min-w-0");

    const nameEl = screen.getByText(
      "An Extremely Long Preset Name Withalongunbrokenword"
    );
    expect(nameEl).toHaveClass("wrap-anywhere");
    expect(
      screen.getByText("a-very-long-slug-that-keeps-going-forever")
    ).toHaveClass("wrap-anywhere");
  });

  it("renders the status pill inside the wrapping cluster", () => {
    renderRow("Paused preset", "paused-preset", "paused");
    expect(screen.getByText("paused")).toBeInTheDocument();
  });
});
