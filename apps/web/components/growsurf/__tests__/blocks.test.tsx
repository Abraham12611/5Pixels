import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { GrowSurfBlocks } from "../blocks";

describe("GrowSurfBlocks", () => {
  it("renders all embedded blocks with participant identity", () => {
    const { container } = render(
      <GrowSurfBlocks
        email="gavin@hooli.com"
        firstName="Gavin"
        lastName="Belson"
      />
    );

    for (const block of [
      "form",
      "referral-summary",
      "next-milestone",
      "referral-status",
      "rewards",
      "invite",
    ]) {
      const el = container.querySelector(`[data-grsf-block-${block}]`);
      expect(el, `block ${block}`).not.toBeNull();
      expect(el).toHaveAttribute("data-grsf-email", "gavin@hooli.com");
      expect(el).toHaveAttribute("data-grsf-first-name", "Gavin");
      expect(el).toHaveAttribute("data-grsf-last-name", "Belson");
    }
  });

  it("omits name attributes when the participant has no display name", () => {
    const { container } = render(<GrowSurfBlocks email="a@b.co" />);
    const form = container.querySelector("[data-grsf-block-form]");
    expect(form).toHaveAttribute("data-grsf-email", "a@b.co");
    expect(form).not.toHaveAttribute("data-grsf-first-name");
    expect(form).not.toHaveAttribute("data-grsf-last-name");
  });

  it("keeps style attributes JSON-parseable (GrowSurf requirement)", () => {
    const { container } = render(<GrowSurfBlocks email="a@b.co" />);
    for (const el of container.querySelectorAll("[data-grsf-block-form], [data-grsf-block-invite], [data-grsf-block-rewards], [data-grsf-block-referral-status]")) {
      for (const { name, value } of Array.from(el.attributes)) {
        if (name.endsWith("-style")) {
          expect(() => JSON.parse(value), `${name}`).not.toThrow();
        }
      }
    }
  });
});
