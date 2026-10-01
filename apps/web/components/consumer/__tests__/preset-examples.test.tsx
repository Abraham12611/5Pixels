import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PresetExamples } from "../mobile/preset-examples";
// Warm the module graph at collect time — the lazy `dynamic()` ImageViewer
// otherwise resolves too slowly inside the 5s test window.
import "../mobile/image-viewer";

const urls = [
  "https://cdn.example.com/a.jpg",
  "https://cdn.example.com/b.jpg",
  "https://cdn.example.com/c.jpg",
];

describe("PresetExamples", () => {
  it("renders a square thumb per example", () => {
    render(<PresetExamples urls={urls} name="Cyber Punk" />);
    expect(
      screen.getAllByRole("button", { name: /view cyber punk example/i })
    ).toHaveLength(3);
  });

  it("opens the shared ImageViewer when a thumb is tapped", async () => {
    render(<PresetExamples urls={urls} name="Cyber Punk" />);
    fireEvent.click(
      screen.getByRole("button", { name: "View Cyber Punk example 2" })
    );
    const viewer = await screen.findByRole(
      "dialog",
      { name: "Cyber Punk example 2 of 3" },
      { timeout: 10000 }
    );
    expect(viewer).toBeInTheDocument();
    expect(viewer.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.example.com/b.jpg"
    );
  });
});
