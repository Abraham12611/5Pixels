import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorksBestWith } from "../works-best-with";

describe("WorksBestWith", () => {
  it("renders the do/don't guidance tiles", () => {
    render(<WorksBestWith />);
    expect(screen.getByText("Well-lit")).toBeInTheDocument();
    expect(screen.getByText("Centered")).toBeInTheDocument();
    expect(screen.getByText("Group shots")).toBeInTheDocument();
  });
});
