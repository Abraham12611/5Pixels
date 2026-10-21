import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PresetPromptCard } from "../preset-prompt-card";

const writeText = vi.fn().mockResolvedValue(undefined);

Object.assign(navigator, {
  clipboard: { writeText },
});

describe("PresetPromptCard", () => {
  it("labels the body as Prompt when showing the public recipe", () => {
    render(<PresetPromptCard text="1. Ink the subject" isRecipe />);
    expect(
      screen.getByRole("heading", { name: "Prompt" })
    ).toBeInTheDocument();
    expect(screen.getByText("1. Ink the subject")).toBeInTheDocument();
  });

  it("labels the body as About this look for the description fallback", () => {
    render(<PresetPromptCard text="Bold retro manga." isRecipe={false} />);
    expect(
      screen.getByRole("heading", { name: "About this look" })
    ).toBeInTheDocument();
  });

  it("copies the card text to the clipboard", async () => {
    render(<PresetPromptCard text="recipe text" isRecipe />);
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("recipe text");
    });
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });
});
