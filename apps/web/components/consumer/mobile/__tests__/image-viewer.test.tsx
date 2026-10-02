import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { ImageViewer } from "../image-viewer";

function TestViewer({ src = "https://example.test/signed.jpg" }: { src?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open image
      </button>
      <ImageViewer
        open={open}
        onOpenChange={setOpen}
        src={src}
        alt="Generated result"
        caption="Cyber Punk"
      />
    </>
  );
}

describe("ImageViewer", () => {
  it("opens as a modal dialog named by the image and returns focus on close", () => {
    render(<TestViewer />);
    const trigger = screen.getByRole("button", { name: "Open image" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleName("Generated result");

    fireEvent.click(screen.getByRole("button", { name: "Close viewer" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on Escape and on browser Back", () => {
    render(<TestViewer />);
    fireEvent.click(screen.getByRole("button", { name: "Open image" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open image" }));
    fireEvent.popState(window);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a loading state, then zoom controls once the image loads", () => {
    render(<TestViewer />);
    fireEvent.click(screen.getByRole("button", { name: "Open image" }));

    expect(screen.getByRole("status", { name: "Loading image" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();

    fireEvent.load(screen.getByAltText("Generated result"));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Fit to screen" }));
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
  });

  it("shows a designed error state when the image fails", () => {
    render(<TestViewer />);
    fireEvent.click(screen.getByRole("button", { name: "Open image" }));
    fireEvent.error(screen.getByAltText("Generated result"));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This image could not be loaded"
    );
  });
});
