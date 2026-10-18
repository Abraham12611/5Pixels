import { describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { PresetPromptComposer } from "../preset-prompt-composer";

function Harness({
  initialOn = false,
  initialValue = "",
  maxChars = 140,
  error = null,
  onToggleSpy,
  onChangeSpy,
}: {
  initialOn?: boolean;
  initialValue?: string;
  maxChars?: number;
  error?: string | null;
  onToggleSpy?: (v: boolean) => void;
  onChangeSpy?: (v: string) => void;
}) {
  const [on, setOn] = useState(initialOn);
  const [value, setValue] = useState(initialValue);
  return (
    <PresetPromptComposer
      enabled={on}
      value={value}
      maxChars={maxChars}
      error={error}
      onToggle={(v) => {
        setOn(v);
        onToggleSpy?.(v);
      }}
      onChange={(v) => {
        setValue(v);
        onChangeSpy?.(v);
      }}
    />
  );
}

describe("preset prompt composer", () => {
  it("renders the compact OFF row — title, meaning, grey switch", () => {
    render(<Harness />);
    expect(screen.getByText("Prompt")).toBeInTheDocument();
    expect(
      screen.getByText("Your changes are added to this look")
    ).toBeInTheDocument();
    const toggle = screen.getByRole("switch", { name: "Prompt" });
    expect(toggle).not.toBeChecked();
    expect(
      screen.queryByLabelText("Describe your changes")
    ).not.toBeInTheDocument();
  });

  it("expands the bordered textarea ON and preserves the typed draft across collapse", () => {
    render(<Harness />);
    const toggle = screen.getByRole("switch", { name: "Prompt" });
    fireEvent.click(toggle);

    const area = screen.getByLabelText("Describe your changes");
    fireEvent.change(area, { target: { value: "add neon glow" } });
    expect(
      screen.getByPlaceholderText(
        /Describe your changes, e\.g\. add neon glow/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText("13 / 140")).toBeInTheDocument();

    // Collapse hides the editor; reopening shows the preserved draft.
    fireEvent.click(toggle);
    expect(
      screen.queryByLabelText("Describe your changes")
    ).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByLabelText("Describe your changes")).toHaveValue(
      "add neon glow"
    );
  });

  it("suggestion chips append to the draft without submitting anything", () => {
    const onChange = vi.fn();
    render(<Harness initialOn onChangeSpy={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "add neon glow" }));
    expect(onChange).toHaveBeenLastCalledWith("add neon glow");
    // A second chip appends with a space, not a newline/concat smear.
    fireEvent.click(
      screen.getByRole("button", { name: "make it black & white" })
    );
    expect(onChange).toHaveBeenLastCalledWith(
      "add neon glow make it black & white"
    );
  });

  it("flags an over-length draft and pins the error on the field", () => {
    render(
      <Harness
        initialOn
        initialValue={"x".repeat(141)}
        maxChars={140}
      />
    );
    const area = screen.getByLabelText("Describe your changes");
    expect(area).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText("Keep it under 140 characters.")
    ).toBeInTheDocument();
    expect(screen.getByText("141 / 140")).toBeInTheDocument();
  });

  it("surfaces a pinned error (e.g. moderation) via role=alert", () => {
    render(
      <Harness
        initialOn
        error="That text can't be used — it violates our content policy. Please revise it and try again."
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/content policy/i);
  });

  it("keeps the whole tile inert while disabled", () => {
    render(
      <PresetPromptComposer
        enabled={false}
        value=""
        maxChars={140}
        disabled
        onToggle={vi.fn()}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole("switch", { name: "Prompt" })).toBeDisabled();
  });
});
