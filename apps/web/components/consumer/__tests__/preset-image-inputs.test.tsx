import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  PresetImageInputs,
  type InputSlotView,
} from "../preset-image-inputs";

function slot(overrides: Partial<InputSlotView> = {}): InputSlotView {
  return {
    id: "slot-0",
    roleLabel: "Person",
    optional: false,
    status: "empty",
    previewUrl: null,
    fileName: null,
    error: null,
    warning: null,
    ...overrides,
  };
}

function renderRail(
  slots: InputSlotView[],
  handlers: Partial<Parameters<typeof PresetImageInputs>[0]> = {}
) {
  return render(
    <PresetImageInputs
      slots={slots}
      requiredCount={2}
      maxCount={3}
      filledCount={slots.filter((s) => s.status !== "empty").length}
      focusedSlotId={null}
      onPick={vi.fn()}
      onRemove={vi.fn()}
      onRetry={vi.fn()}
      onFocus={vi.fn()}
      onMove={vi.fn()}
      canMove={vi.fn(() => false)}
      {...handlers}
    />
  );
}

describe("PresetImageInputs", () => {
  it("renders role labels, the filled counter, and an add tile", () => {
    renderRail([
      slot({ status: "ready", previewUrl: "blob:a", fileName: "a.png" }),
      slot({ id: "slot-1", roleLabel: "Outfit", optional: true }),
    ]);
    expect(screen.getByText("1 of 3 photos")).toBeInTheDocument();
    expect(screen.getByText("2 required")).toBeInTheDocument();
    expect(screen.getByText("Person")).toBeInTheDocument();
    expect(screen.getByText(/Outfit/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add photo" })
    ).toBeInTheDocument();
  });

  it("routes picks through the targeted slot and reports focus", () => {
    const onFocus = vi.fn();
    renderRail(
      [slot({ status: "ready", previewUrl: "blob:a", fileName: "a.png" })],
      { onFocus }
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Show Person preview" })
    );
    expect(onFocus).toHaveBeenCalledWith("slot-0");
  });

  it("offers remove on staged slots and retry on failed uploads", () => {
    const onRemove = vi.fn();
    const onRetry = vi.fn();
    renderRail(
      [
        slot({
          status: "failed",
          previewUrl: "blob:a",
          fileName: "a.png",
          error: "Upload failed",
        }),
      ],
      { onRemove, onRetry }
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retry Person upload" })
    );
    expect(onRetry).toHaveBeenCalledWith("slot-0");
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Person photo" })
    );
    expect(onRemove).toHaveBeenCalledWith("slot-0");
  });

  it("hides the add tile at capacity and marks optional slots", () => {
    renderRail([
      slot({ status: "ready", previewUrl: "blob:a" }),
      slot({ id: "slot-1", status: "ready", previewUrl: "blob:b" }),
      slot({
        id: "slot-2",
        status: "ready",
        previewUrl: "blob:c",
        optional: true,
      }),
    ]);
    expect(screen.getByText("3 of 3 photos")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add photo" })
    ).toBeNull();
    expect(screen.getByText(/optional/)).toBeInTheDocument();
  });
});
