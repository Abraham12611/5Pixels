import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  AdjustAccordion,
  PosterTextFields,
} from "../generation-controls";
import type { PublicProductField } from "@/types/catalog";

afterEach(cleanup);

describe("AdjustAccordion", () => {
  it("shows the count badge over its content", () => {
    render(
      <AdjustAccordion count={3}>
        <p>controls</p>
      </AdjustAccordion>
    );

    expect(
      screen.getByRole("button", { name: /Adjust the look \(3\)/ })
    ).toBeInTheDocument();
  });

  it("starts collapsed for larger control sets and toggles on tap", () => {
    render(
      <AdjustAccordion count={4}>
        <p>controls</p>
      </AdjustAccordion>
    );

    const trigger = screen.getByRole("button", {
      name: /Adjust the look \(4\)/,
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    // Collapsed on mobile: the wrapper hides content below md.
    expect(screen.getByText("controls").parentElement).toHaveClass("hidden");

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("controls").parentElement).not.toHaveClass(
      "hidden"
    );
  });

  it("starts expanded when there are two or fewer controls", () => {
    render(
      <AdjustAccordion count={2}>
        <p>controls</p>
      </AdjustAccordion>
    );

    expect(
      screen.getByRole("button", { name: /Adjust the look/ })
    ).toHaveAttribute("aria-expanded", "true");
  });
});

describe("PosterTextFields", () => {
  const textField: PublicProductField = {
    id: "f1",
    field_key: "headline",
    label: "Headline",
    help_text: null,
    field_type: "short_text",
    required: true,
    sort_order: 0,
    config: null,
    validation: { maxLength: 40 },
  };

  it("renders poster text inputs with a live character count", () => {
    const onChange = vi.fn();
    render(
      <PosterTextFields
        fields={[textField]}
        values={{ headline: "BIG SALE" }}
        onChange={onChange}
      />
    );

    expect(screen.getByRole("textbox")).toHaveValue("BIG SALE");
    expect(screen.getByText("Headline")).toBeInTheDocument();
    expect(screen.getByText("8/40")).toBeInTheDocument();
  });

  it("renders nothing when the preset has no text fields", () => {
    const { container } = render(
      <PosterTextFields
        fields={[{ ...textField, field_type: "toggle" }]}
        values={{}}
        onChange={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
