import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PromptRecipeCard } from "../prompt-recipe-card";
import { SettingsCard } from "../settings-card";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    prefetch: _prefetch,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    prefetch?: boolean;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const AID = "11111111-2222-4333-8444-555555555555";

/**
 * #128 — the shared read-only cards used identically by the editor preview
 * and the public reader. They pin the privacy boundary: only the
 * article-local snapshot and resolved public labels can render.
 */
describe("PromptRecipeCard", () => {
  it("renders the recipe text, source label and preset link", () => {
    render(
      <PromptRecipeCard
        recipeText="Upload a portrait, apply the preset."
        source="approved_template"
        capturedAt="2026-10-20T12:00:00Z"
        presetName="Film Grain"
        presetHref="/presets/film-grain"
      />
    );
    expect(
      screen.getByText("Upload a portrait, apply the preset.")
    ).toBeInTheDocument();
    expect(screen.getByText(/public recipe/i)).toBeInTheDocument();
    expect(screen.getByText(/Made with Film Grain/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /try this preset/i })
    ).toHaveAttribute("href", "/presets/film-grain");
  });

  it("renders reference chips with labels only — never raw ids or links", () => {
    render(
      <PromptRecipeCard
        recipeText="Recipe"
        source="manual"
        references={[
          { id: AID, label: "My portrait", kind: "asset" },
        ]}
      />
    );
    expect(screen.getByText(/My portrait/)).toBeInTheDocument();
    expect(screen.getByText(/Image/)).toBeInTheDocument();
    expect(screen.queryByText(AID)).not.toBeInTheDocument();
  });

  it("shows a blank-state note when the recipe is empty", () => {
    render(<PromptRecipeCard recipeText="  " source="manual" />);
    expect(
      screen.getByText(/left blank by the author/i)
    ).toBeInTheDocument();
  });
});

describe("SettingsCard", () => {
  it("renders labelled example rows and the preset link", () => {
    render(
      <SettingsCard
        presetName="Film Grain"
        presetHref="/presets/film-grain"
        rows={[
          { key: "style", label: "Style", value: "Film" },
          { key: "grain", label: "Grain", value: "40" },
        ]}
      />
    );
    expect(screen.getByText("Film Grain settings")).toBeInTheDocument();
    expect(screen.getByText("Style")).toBeInTheDocument();
    expect(screen.getByText("Film")).toBeInTheDocument();
    expect(screen.getByText("Grain")).toBeInTheDocument();
    expect(screen.getByText(/examples/i)).toBeInTheDocument();
  });

  it("shows the default-settings note when there are no rows", () => {
    render(<SettingsCard presetName={null} presetHref={null} rows={[]} />);
    expect(
      screen.getByText(/default settings — no extra controls/i)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /try this preset/i })
    ).not.toBeInTheDocument();
  });
});
