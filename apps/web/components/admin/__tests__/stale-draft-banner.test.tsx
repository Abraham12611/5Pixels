import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { StaleDraftBanner } from "../stale-draft-banner";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const LIVE = { version_number: 5, route: "fal/nano-banana/edit" };
const STALE = [{ version_number: 4, route: "fal/nano-banana-pro/edit" }];

describe("StaleDraftBanner (#251)", () => {
  it("names the stale draft and the live version it predates", () => {
    render(
      <StaleDraftBanner
        productId="prod-1"
        liveVersion={LIVE}
        staleVersions={STALE}
        resolve={vi.fn().mockResolvedValue({ ok: true, data: null })}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /stale draft v4 predates the live version/i
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /v4 \(fal\/nano-banana-pro\/edit\)/
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /live v5 \(fal\/nano-banana\/edit\)/
    );
  });

  it("rebases via the resolve action after explicit confirmation", async () => {
    const resolve = vi
      .fn()
      .mockResolvedValue({ ok: true, data: "new-draft-id" });
    render(
      <StaleDraftBanner
        productId="prod-1"
        liveVersion={LIVE}
        staleVersions={STALE}
        resolve={resolve}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /rebase from live v5/i })
    );
    fireEvent.click(screen.getByRole("button", { name: /confirm rebase/i }));

    await waitFor(() => {
      expect(resolve).toHaveBeenCalledWith("prod-1", true);
    });
  });

  it("discards without recreating when that path is chosen", async () => {
    const resolve = vi.fn().mockResolvedValue({ ok: true, data: null });
    render(
      <StaleDraftBanner
        productId="prod-1"
        liveVersion={LIVE}
        staleVersions={STALE}
        resolve={resolve}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /discard only/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm discard/i }));

    await waitFor(() => {
      expect(resolve).toHaveBeenCalledWith("prod-1", false);
    });
  });

  it("does not resolve when the dialog is cancelled", async () => {
    const resolve = vi.fn().mockResolvedValue({ ok: true, data: null });
    render(
      <StaleDraftBanner
        productId="prod-1"
        liveVersion={LIVE}
        staleVersions={STALE}
        resolve={resolve}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: /rebase from live v5/i })
    );
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(resolve).not.toHaveBeenCalled();
  });

  it("shows the server's failure message inside the dialog", async () => {
    const resolve = vi.fn().mockResolvedValue({
      ok: false,
      error: "admin_resolve_stale_versions: permission denied",
    });
    render(
      <StaleDraftBanner
        productId="prod-1"
        liveVersion={LIVE}
        staleVersions={STALE}
        resolve={resolve}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /discard only/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm discard/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/permission denied/i)
      ).toBeInTheDocument();
    });
    // Dialog stays open so the admin can retry or cancel.
    expect(
      screen.getByRole("button", { name: /confirm discard/i })
    ).toBeInTheDocument();
  });
});
