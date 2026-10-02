import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StateBlock } from "../state-block";

describe("StateBlock", () => {
  it("renders title, body and actions", () => {
    render(
      <StateBlock
        title="No results yet"
        body="Pick a preset and add a photo to make your first image."
        primary={<button type="button">Browse presets</button>}
        secondary={<button type="button">Learn more</button>}
      />
    );

    expect(
      screen.getByRole("heading", { name: "No results yet" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Browse presets" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Learn more" })
    ).toBeInTheDocument();
  });

  it("announces empty and offline states politely", () => {
    const { rerender } = render(<StateBlock title="Nothing here" />);
    expect(screen.getByRole("status")).toBeInTheDocument();

    rerender(<StateBlock variant="offline" title="You're offline" />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("announces errors assertively", () => {
    render(<StateBlock variant="error" title="Something went wrong" />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
