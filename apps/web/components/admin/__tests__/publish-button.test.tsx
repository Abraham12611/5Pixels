import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PublishButton } from "../publish-button";
import type { PublishGateFailure } from "@/lib/validation/publish-gates";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const PROTECTED_FAILURE: PublishGateFailure = {
  code: "PROMPT_RELEASE_GATED",
  message:
    "Custom prompting is configured, but it has not been released for this environment — publication requires the protected server/database switches (PRESET_USER_PROMPT_ENABLED + release_gates).",
  field: "version.input_capability.prompt_override_enabled",
};

const OVERRIDABLE_FAILURE: PublishGateFailure = {
  code: "MISSING_POSTER_ASSET",
  message: "A poster visual asset is required.",
  field: "poster_asset_id",
};

const noop = vi.fn().mockResolvedValue({ ok: true });

describe("PublishButton — protected release gates", () => {
  it("does not offer owner override when a release gate blocks", () => {
    render(
      <PublishButton
        productId="prod-1"
        versionId="ver-1"
        isOwner
        gateFailures={[PROTECTED_FAILURE]}
        action={noop}
      />
    );

    // No override affordance — the reason input and override label are gone.
    expect(
      screen.queryByLabelText(/override reason/i)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /publish with override/i })
    ).not.toBeInTheDocument();

    // Publish stays disabled and the non-overridable note explains why.
    expect(
      screen.getByRole("button", { name: /publish version/i })
    ).toBeDisabled();
    expect(screen.getByText(/cannot be overridden/i)).toBeInTheDocument();
  });

  it("keeps override unavailable when a release gate is mixed with fixable failures", () => {
    render(
      <PublishButton
        productId="prod-1"
        versionId="ver-1"
        isOwner
        gateFailures={[PROTECTED_FAILURE, OVERRIDABLE_FAILURE]}
        action={noop}
      />
    );

    expect(
      screen.queryByLabelText(/override reason/i)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /publish version/i })
    ).toBeDisabled();
    expect(screen.getByText(/cannot be overridden/i)).toBeInTheDocument();
    // The genuine validation failure is still listed.
    expect(
      screen.getByText(/poster visual asset is required/i)
    ).toBeInTheDocument();
  });

  it("still offers owner override for ordinary validation failures", () => {
    render(
      <PublishButton
        productId="prod-1"
        versionId="ver-1"
        isOwner
        gateFailures={[OVERRIDABLE_FAILURE]}
        action={noop}
      />
    );

    expect(screen.getByLabelText(/override reason/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /publish with override/i })
    ).toBeEnabled();
    expect(
      screen.queryByText(/cannot be overridden/i)
    ).not.toBeInTheDocument();
  });

  it("tells non-owners only the owner can override ordinary failures", () => {
    render(
      <PublishButton
        productId="prod-1"
        versionId="ver-1"
        isOwner={false}
        gateFailures={[OVERRIDABLE_FAILURE]}
        action={noop}
      />
    );

    expect(
      screen.getByText(/only the owner can override/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /publish version/i })
    ).toBeDisabled();
  });

  it("surfaces the server's failure message instead of a generic error", async () => {
    const action = vi.fn().mockResolvedValue({
      ok: false,
      error: "Cannot publish: version not found on this product.",
    });
    render(
      <PublishButton
        productId="prod-1"
        versionId="ver-1"
        gateFailures={[]}
        action={action}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /publish version/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/version not found on this product/i)
      ).toBeInTheDocument();
    });
  });

  it("falls back to a generic message when the action throws", async () => {
    const action = vi.fn().mockRejectedValue(new Error("redacted"));
    render(
      <PublishButton
        productId="prod-1"
        versionId="ver-1"
        gateFailures={[]}
        action={action}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /publish version/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/publish failed\. please try again/i)
      ).toBeInTheDocument();
    });
  });
});
