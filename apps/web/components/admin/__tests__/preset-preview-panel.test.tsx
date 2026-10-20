import { describe, expect, it, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import type { ReactNode } from "react";
import { PresetPreviewPanel } from "../preset-preview-panel";

beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  HTMLElement.prototype.scrollIntoView ??= () => {};
});

function Form({
  children,
  defaults,
}: {
  children: ReactNode;
  defaults?: Record<string, unknown>;
}) {
  const methods = useForm({
    defaultValues: {
      type: "poster",
      poster_config: {
        layout_template: "portrait",
        text_fields: [
          {
            key: "headline",
            label: "Headline",
            required: true,
            default_value: "Sale ends Friday",
          },
        ],
        text_layer_config: {
          position: "bottom",
          size: "large",
          color: "#F7F2E8",
          alignment: "center",
        },
        background_handling: "replace",
      },
      ...defaults,
    },
  });
  return (
    <FormProvider {...methods}>
      <form>{children}</form>
    </FormProvider>
  );
}

const MEDIA = {
  hero: { publicUrl: "https://example.com/hero.png", mimeType: "image/png" },
  poster: {
    publicUrl: "https://example.com/poster.png",
    mimeType: "image/png",
  },
  "preview-video": {
    publicUrl: "https://example.com/preview.mp4",
    mimeType: "video/mp4",
  },
};

describe("PresetPreviewPanel", () => {
  it("renders stored sample media with labels", () => {
    render(
      <Form>
        <PresetPreviewPanel type="poster" assetPreviews={MEDIA} slug="x" />
      </Form>
    );
    expect(screen.getByAltText("Hero image sample")).toHaveProperty(
      "src",
      "https://example.com/hero.png"
    );
    expect(screen.getByLabelText("Preview video sample")).toBeTruthy();
    expect(screen.getByText("Preview video")).toBeTruthy();
  });

  it("shows an honest empty state when no media exists", () => {
    render(
      <Form>
        <PresetPreviewPanel type="filter" />
      </Form>
    );
    expect(screen.getByText(/No sample media uploaded yet/)).toBeTruthy();
    expect(screen.getByText(/No test output yet/)).toBeTruthy();
  });

  it("renders a clearly-labeled illustrative mock for posters", () => {
    render(
      <Form>
        <PresetPreviewPanel type="poster" slug="my-poster" />
      </Form>
    );
    expect(screen.getByText(/not a generated image/i)).toBeTruthy();
    expect(
      screen.getByRole("img", { name: "Illustrative poster layout mock" })
    ).toBeTruthy();
    // The mock shows the configured default text, not a fabricated result.
    expect(screen.getByText("Sale ends Friday")).toBeTruthy();
  });

  it("falls back to a broken-media state on error", () => {
    render(
      <Form>
        <PresetPreviewPanel type="poster" assetPreviews={MEDIA} />
      </Form>
    );
    fireEvent.error(screen.getByAltText("Hero image sample"));
    expect(screen.getByText("Hero image preview unavailable")).toBeTruthy();
  });

  it("links to the lab when the preset is saved", () => {
    render(
      <Form>
        <PresetPreviewPanel type="poster" slug="chrome-poster" />
      </Form>
    );
    expect(
      screen.getByRole("link", { name: /Test in Lab/ }).getAttribute("href")
    ).toBe("/admin/lab/chrome-poster");
  });

  it("disables the lab handoff for unsaved presets", () => {
    render(
      <Form>
        <PresetPreviewPanel type="poster" />
      </Form>
    );
    expect(screen.queryByRole("link", { name: /Test in Lab/ })).toBeNull();
    expect(screen.getByText(/Save this preset to test in Lab/)).toBeTruthy();
  });
});
