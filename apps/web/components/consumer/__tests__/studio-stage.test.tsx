import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { StudioStage } from "../studio-stage";

function mockMatchMedia(coarse: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(pointer: coarse)" ? coarse : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const baseProps = {
  previewUrl: null,
  onFileSelected: vi.fn(),
  onClear: vi.fn(),
};

afterEach(cleanup);

describe("StudioStage", () => {
  it("shows two source tiles instead of a drop zone on touch devices", () => {
    mockMatchMedia(true);
    render(<StudioStage {...baseProps} />);

    expect(
      screen.getByRole("button", { name: /Take a photo/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Choose photo/ })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Drop your photo here/)).not.toBeInTheDocument();
  });

  it("keeps the drop zone on fine-pointer devices", () => {
    mockMatchMedia(false);
    render(<StudioStage {...baseProps} />);

    expect(screen.getByText(/Drop your photo here/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Take a photo/ })
    ).not.toBeInTheDocument();
  });

  it("always shows the privacy line with a Privacy link", () => {
    mockMatchMedia(true);
    render(<StudioStage {...baseProps} />);

    expect(screen.getByText(/Your photo is private/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      "/app/account/privacy"
    );
  });

  it("renders a rejected-source error inline with a re-pick action", () => {
    mockMatchMedia(true);
    render(
      <StudioStage {...baseProps} sourceError="Image must be 20 MB or smaller." />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/20 MB/);
    expect(
      screen.getByRole("button", { name: "Choose another photo" })
    ).toBeInTheDocument();
  });

  it("renders a quality warning as a non-blocking note", () => {
    mockMatchMedia(true);
    render(
      <StudioStage
        {...baseProps}
        sourceWarning="This photo is quite small — the result may look softer than usual."
      />
    );

    const note = screen.getByRole("status");
    expect(note).toHaveTextContent(/quite small/);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("keeps the photo visible with an inline step indicator while submitting", () => {
    mockMatchMedia(true);
    render(
      <StudioStage
        {...baseProps}
        previewUrl="https://example.com/photo.jpg"
        submitting
        submitStepIndex={1}
        submitSteps={[
          "Uploading your photo",
          "Preparing the transformation",
          "Starting",
        ]}
      />
    );

    // The preview stays mounted (dimmed), and the steps read inline.
    expect(screen.getByAltText("Source photo")).toBeInTheDocument();
    expect(screen.getByText("Uploading your photo")).toBeInTheDocument();
    expect(screen.getByText("Preparing the transformation")).toBeInTheDocument();
    expect(screen.getByText("Starting")).toBeInTheDocument();
    // No blocking overlay card.
    expect(screen.queryByText("Working…")).not.toBeInTheDocument();
  });
});
