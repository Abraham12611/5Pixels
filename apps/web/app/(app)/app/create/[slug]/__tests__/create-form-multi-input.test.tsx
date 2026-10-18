import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { CreateGenerationForm } from "../create-form";
import { SKIP_COST_CONFIRM_KEY } from "@/lib/generation/credit-confirm";
import type { OutputSizeOption, PublicProductDetail } from "@/types/catalog";
import type { BlockedCreditContext } from "@/lib/billing/segments";

const mocks = vi.hoisted(() => ({
  estimate: vi.fn(),
  createAndSubmit: vi.fn(),
  prepareUpload: vi.fn(),
  finalizeUpload: vi.fn(),
  saveDraft: vi.fn(),
  loadDraft: vi.fn(),
  clearDraft: vi.fn(),
}));

vi.mock("@/lib/billing/credit-cost", () => ({
  estimateGenerationCost: mocks.estimate,
}));

vi.mock("@/lib/generation/actions", () => ({
  createAndSubmitGeneration: mocks.createAndSubmit,
}));

vi.mock("@/lib/generation/upload", () => ({
  prepareSourceUpload: mocks.prepareUpload,
  finalizeSourceUpload: mocks.finalizeUpload,
}));

vi.mock("@/lib/anonymous-draft", () => ({
  saveStudioDraft: mocks.saveDraft,
  loadStudioDraft: mocks.loadDraft,
  clearStudioDraft: mocks.clearDraft,
}));

// The stage drives picks through the parent — each click picks a fresh
// file so the duplicate-photo check doesn't collide across slots.
vi.mock("@/components/consumer/studio-stage", () => {
  let n = 0;
  return {
    StudioStage: ({
      onFileSelected,
    }: {
      onFileSelected: (f: File | null) => void;
    }) => (
      <button
        type="button"
        data-testid="pick-file"
        onClick={() =>
          onFileSelected(
            new File(["x"], `photo-${++n}.png`, { type: "image/png" })
          )
        }
      >
        pick
      </button>
    ),
  };
});

vi.mock("@/components/consumer/generation-controls", () => ({
  GenerationControls: () => <div data-testid="controls" />,
}));

vi.mock(
  "@/components/consumer/aspect-ratio-menu",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/consumer/aspect-ratio-menu")
      >();
    return {
      ...actual,
      AspectRatioMenu: ({
        sizes,
        onChange,
      }: {
        sizes: OutputSizeOption[];
        onChange: (s: OutputSizeOption) => void;
      }) => (
        <div data-testid="size-menu">
          {sizes.map((s) => (
            <button key={s.name} type="button" onClick={() => onChange(s)}>
              {s.name}
            </button>
          ))}
        </div>
      ),
    };
  }
);

vi.mock("@/components/consumer/blocked-credit-surface", () => ({
  BlockedCreditSurface: ({ open }: { open: boolean }) =>
    open ? <div data-testid="insufficient-surface" /> : null,
}));

vi.mock("@/components/auth/auth-modal", () => ({
  AuthModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="auth-gate" /> : null,
}));

// jsdom lacks blob URLs.
URL.createObjectURL ??= () => "blob:mock";
URL.revokeObjectURL ??= () => {};

const SIZES: OutputSizeOption[] = [
  { name: "Square (1:1)", width: 1024, height: 1024, is_default: true },
];

const singleProduct: PublicProductDetail = {
  id: "prod-1",
  slug: "noir-premiere",
  name: "Noir Premiere",
  type: "filter",
  short_description: null,
  long_description: null,
  category_id: null,
  category_slug: null,
  category_name: null,
  featured_rank: null,
  version_id: "ver-1",
  version_number: 1,
  credit_cost: 5,
  output_sizes: SIZES,
  metadata: null,
  hero_asset_id: null,
  poster_asset_id: null,
  preview_gif_asset_id: null,
  preview_video_asset_id: null,
  public_assets: [],
  created_at: null,
  likeness_level: null,
  active_fields: [],
};

/** Multi preset: two required images (person + outfit) and one optional. */
const multiProduct: PublicProductDetail = {
  ...singleProduct,
  id: "prod-2",
  slug: "noir-duo",
  input_capability: {
    mode: "multi",
    min_images: 2,
    max_images: 3,
    roles: [
      { name: "person" },
      { name: "outfit" },
      { name: "prop", optional: true },
    ],
    prompt: { enabled: false, max_chars: 0 },
  },
};

const blocked: BlockedCreditContext = {
  segment: "subscriber",
  isReferred: false,
  offersOptedOut: true,
};

function renderForm(
  overrides: Partial<Parameters<typeof CreateGenerationForm>[0]> = {}
) {
  return render(
    <CreateGenerationForm
      userId="user-1"
      product={multiProduct}
      initialBalance={100}
      hasPriorGenerations
      plans={[]}
      blocked={blocked}
      offer={null}
      topUp={null}
      {...overrides}
    />
  );
}

function generateButtons() {
  return screen
    .getAllByRole("button", { name: /^generate/i })
    .filter((b) => b.closest('[role="dialog"]') === null);
}

/** Wait until slot uploads complete: prepare+PUT+finalize per staged file. */
async function flushUploads(count: number) {
  await waitFor(() =>
    expect(mocks.finalizeUpload).toHaveBeenCalledTimes(count)
  );
}

/** Pick a file through the rail's "+ Add photo" tile — lands on the first
 *  empty slot (the stage pick replaces the focused slot's photo instead). */
function pickViaRail(fileName: string) {
  fireEvent.click(screen.getByRole("button", { name: "Add photo" }));
  const input = document.querySelector('input[type="file"]')!;
  fireEvent.change(input, {
    target: {
      files: [new File(["x"], fileName, { type: "image/png" })],
    },
  });
}

describe("create form — multi-image inputs", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    window.history.replaceState(null, "", "/app/create/noir-duo");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true }))
    );
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 800, height: 600, close() {} }))
    );
    mocks.loadDraft.mockResolvedValue(null);
    mocks.saveDraft.mockResolvedValue(true);
    mocks.createAndSubmit.mockResolvedValue({});
    mocks.estimate.mockResolvedValue({
      estimatedCredits: 5,
      unavailable: false,
    });
    let n = 0;
    mocks.prepareUpload.mockImplementation(async () => ({
      signedUrl: "https://upload.test/signed",
      path: `path-${++n}`,
    }));
    mocks.finalizeUpload.mockImplementation(async (path: string) => ({
      assetId: `asset-${path}`,
      path,
    }));
  });

  it("renders the original one-photo experience on a single-image preset", async () => {
    renderForm({ product: singleProduct });
    expect(screen.queryByText(/of 3 photos/i)).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Add photo" })
    ).toBeNull();
    await waitFor(() => expect(mocks.estimate).toHaveBeenCalled());
  });

  it("shows the slot rail with roles and gates Generate on the minimum", async () => {
    renderForm();
    expect(screen.getByText("0 of 3 photos")).toBeInTheDocument();
    expect(screen.getByText("2 required")).toBeInTheDocument();
    expect(screen.getByText("Person")).toBeInTheDocument();
    expect(screen.getByText(/Outfit/)).toBeInTheDocument();

    // One photo on a two-required preset can't generate.
    fireEvent.click(screen.getByTestId("pick-file"));
    await flushUploads(1);
    expect(generateButtons()[0]).toBeDisabled();
    expect(
      screen.getAllByText("This look needs 2 photos").length
    ).toBeGreaterThan(0);
  });

  it("uploads each staged photo on select and submits ordered role-bound inputs", async () => {
    renderForm();
    localStorage.setItem(SKIP_COST_CONFIRM_KEY, "1");

    fireEvent.click(screen.getByTestId("pick-file"));
    pickViaRail("extra-outfit.png");
    await flushUploads(2);
    expect(mocks.prepareUpload).toHaveBeenCalledTimes(2);
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: /generate · 5 credits/i })[0]
      ).toBeEnabled()
    );

    // The asset-id assignment shifts the fingerprint — a fresh quote runs.
    await waitFor(() =>
      expect(mocks.estimate.mock.calls.length).toBeGreaterThanOrEqual(2)
    );
    await waitFor(() => expect(generateButtons()[0]).toBeEnabled());

    fireEvent.click(generateButtons()[0]);
    await waitFor(() =>
      expect(mocks.createAndSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: [
            { assetId: "asset-path-1", role: "person" },
            { assetId: "asset-path-2", role: "outfit" },
          ],
        })
      )
    );
    expect(mocks.createAndSubmit.mock.calls[0][0]).not.toHaveProperty(
      "sourceAssetId"
    );
  });

  it("recovers a failed upload with per-slot retry — no re-upload of succeeded files", async () => {
    mocks.finalizeUpload
      .mockImplementationOnce(async () => {
        throw new Error("Unable to finalize upload");
      })
      .mockImplementation(async (path: string) => ({
        assetId: `asset-${path}`,
        path,
      }));
    renderForm();

    fireEvent.click(screen.getByTestId("pick-file"));
    pickViaRail("extra-outfit.png");
    await waitFor(() =>
      expect(mocks.finalizeUpload).toHaveBeenCalledTimes(2)
    );
    expect(generateButtons()[0]).toBeDisabled();
    expect(
      screen.getAllByText("Fix or remove the flagged photo to continue")
        .length
    ).toBeGreaterThan(0);

    // Retry only re-runs the failed slot — the succeeded upload is untouched.
    fireEvent.click(
      screen.getByRole("button", { name: "Retry Person upload" })
    );
    await waitFor(() =>
      expect(mocks.finalizeUpload).toHaveBeenCalledTimes(3)
    );
    expect(mocks.prepareUpload).toHaveBeenCalledTimes(3);
  });

  it("lets anonymous users stage multiple photos and reach the auth gate", async () => {
    renderForm({ userId: null, blocked: null });

    fireEvent.click(screen.getByTestId("pick-file"));
    pickViaRail("extra-outfit.png");

    // Anonymous can't upload — files stay held locally, but intent reaches
    // the gate; uploads happen after the auth round trip.
    await waitFor(() =>
      expect(generateButtons()[0]).toBeEnabled()
    );
    expect(mocks.prepareUpload).not.toHaveBeenCalled();

    fireEvent.click(generateButtons()[0]);
    expect(await screen.findByTestId("auth-gate")).toBeInTheDocument();
    const lastSave =
      mocks.saveDraft.mock.calls[mocks.saveDraft.mock.calls.length - 1][0];
    expect(lastSave.slug).toBe("noir-duo");
    expect(lastSave.files.map((f: { role: string }) => f.role)).toEqual([
      "person",
      "outfit",
    ]);
    expect(lastSave.files).toHaveLength(2);
  });

  it("restores a multi-image draft after auth and uploads the held files", async () => {
    window.history.replaceState(
      null,
      "",
      "/app/create/noir-duo?draft=1"
    );
    mocks.loadDraft.mockResolvedValue({
      version: 2,
      slug: "noir-duo",
      familyId: "prod-2",
      files: [
        {
          blob: new Blob(["a"]),
          name: "a.png",
          type: "image/png",
          role: "person",
        },
        {
          blob: new Blob(["b"]),
          name: "b.png",
          type: "image/png",
          role: "outfit",
        },
      ],
      options: {},
      sizeName: "Square (1:1)",
      prompt: null,
      savedAt: Date.now(),
    });
    renderForm();

    // Restored files decode → local → the same pipeline uploads them now
    // that the session exists.
    await flushUploads(2);
    expect(screen.getByText("2 of 3 photos")).toBeInTheDocument();
    expect(
      screen.getByText("We kept your photo and settings.")
    ).toBeInTheDocument();
  });

  it("keeps carried sibling-variant assets as ready slots without re-upload", async () => {
    renderForm({
      initialInputs: [
        {
          assetId: "carried-1",
          url: "https://x.test/p.png",
          name: "Kept photo",
        },
      ],
    });
    await waitFor(() =>
      expect(generateButtons()[0]).not.toBeNull()
    );
    // The carried slot already holds an asset id — no upload fires.
    await act(async () => {});
    expect(mocks.prepareUpload).not.toHaveBeenCalled();
  });

  it("clears the draft only on the redirect-confirmed path — never on a failed run", async () => {
    localStorage.setItem(SKIP_COST_CONFIRM_KEY, "1");

    // Server-side failure: the draft must survive for recovery.
    mocks.createAndSubmit.mockResolvedValueOnce({
      error: "Provider timed out",
    });
    renderForm();
    fireEvent.click(screen.getByTestId("pick-file"));
    pickViaRail("extra-outfit.png");
    await flushUploads(2);
    await waitFor(() => expect(generateButtons()[0]).toBeEnabled());
    fireEvent.click(generateButtons()[0]);
    await waitFor(() =>
      expect(mocks.createAndSubmit).toHaveBeenCalledTimes(1)
    );
    expect(mocks.clearDraft).not.toHaveBeenCalled();

    // Success redirects — NEXT_REDIRECT through the action is the only
    // moment the recovery copy is consumed.
    mocks.createAndSubmit.mockRejectedValueOnce(
      Object.assign(new Error("redirect"), {
        digest: "NEXT_REDIRECT",
      })
    );
    await waitFor(() => expect(generateButtons()[0]).toBeEnabled());
    fireEvent.click(generateButtons()[0]);
    await waitFor(() => expect(mocks.clearDraft).toHaveBeenCalledTimes(1));
  });
});
