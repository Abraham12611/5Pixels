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

vi.mock(
  "@/components/consumer/aspect-ratio-menu",
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import("@/components/consumer/aspect-ratio-menu")
      >();
    return {
      ...actual,
      AspectRatioMenu: () => <div data-testid="size-menu" />,
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

const baseProduct: PublicProductDetail = {
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

/** Prompt-eligible: admin enabled the capability on this version. */
const promptProduct: PublicProductDetail = {
  ...baseProduct,
  id: "prod-prompt",
  slug: "neon-portrait",
  input_capability: {
    mode: "single",
    min_images: 1,
    max_images: 1,
    roles: [],
    prompt: { enabled: true, max_chars: 140 },
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
      product={promptProduct}
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

async function pickPhoto() {
  fireEvent.click(screen.getByTestId("pick-file"));
  await act(async () => {});
}

async function enablePrompt(text: string) {
  fireEvent.click(screen.getByRole("switch", { name: "Prompt" }));
  fireEvent.change(screen.getByLabelText("Describe your changes"), {
    target: { value: text },
  });
}

describe("create form — prompt composer", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    window.history.replaceState(null, "", "/app/create/neon-portrait");
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

  it("renders the composer OFF by default on a prompt-eligible preset", async () => {
    renderForm();
    const toggle = screen.getByRole("switch", { name: "Prompt" });
    expect(toggle).not.toBeChecked();
    expect(
      screen.getByText("Your changes are added to this look")
    ).toBeInTheDocument();
    // No actionable editor until the user opts in — and it stays inert
    // until a photo exists.
    expect(
      screen.queryByLabelText("Describe your changes")
    ).not.toBeInTheDocument();
    expect(toggle).toBeDisabled();
    await pickPhoto();
    expect(toggle).toBeEnabled();
  });

  it("does not render an actionable prompt control on an ineligible preset", () => {
    renderForm({ product: baseProduct });
    expect(screen.queryByRole("switch", { name: "Prompt" })).toBeNull();
    expect(
      screen.queryByLabelText("Describe your changes")
    ).toBeNull();
  });

  it("submits the typed prompt — and only after a quote covers it", async () => {
    localStorage.setItem(SKIP_COST_CONFIRM_KEY, "1");
    renderForm();
    await pickPhoto();
    await waitFor(() => expect(generateButtons()[0]).toBeEnabled());

    // Off → no prompt reaches the request at all.
    fireEvent.click(generateButtons()[0]);
    await waitFor(() =>
      expect(mocks.createAndSubmit).toHaveBeenCalledTimes(1)
    );
    expect(mocks.createAndSubmit.mock.calls[0][0]).not.toHaveProperty(
      "prompt"
    );

    // Typing shifts the quote fingerprint — the button waits for a fresh
    // price before the prompt can submit.
    await enablePrompt("add neon glow");
    await waitFor(() =>
      expect(mocks.estimate.mock.calls.length).toBeGreaterThanOrEqual(2)
    );
    await waitFor(() => expect(generateButtons()[0]).toBeEnabled());
    fireEvent.click(generateButtons()[0]);
    await waitFor(() =>
      expect(mocks.createAndSubmit).toHaveBeenCalledTimes(2)
    );
    expect(mocks.createAndSubmit.mock.calls[1][0]).toMatchObject({
      prompt: "add neon glow",
    });
  });

  it("never sends a prompt on an ineligible preset, even when one was carried", async () => {
    localStorage.setItem(SKIP_COST_CONFIRM_KEY, "1");
    renderForm({
      product: baseProduct,
      initialPrompt: "add neon glow",
    });
    // The carried prompt is explained, not silently dropped — and there
    // is no control to act on it.
    expect(
      screen.getByText("Your previous changes text isn't used by this look.")
    ).toBeInTheDocument();
    await pickPhoto();
    await waitFor(() => expect(generateButtons()[0]).toBeEnabled());
    fireEvent.click(generateButtons()[0]);
    await waitFor(() =>
      expect(mocks.createAndSubmit).toHaveBeenCalledTimes(1)
    );
    expect(mocks.createAndSubmit.mock.calls[0][0]).not.toHaveProperty(
      "prompt"
    );
  });

  it("restores a saved draft prompt on an eligible preset", async () => {
    window.history.replaceState(
      null,
      "",
      "/app/create/neon-portrait?draft=1"
    );
    mocks.loadDraft.mockResolvedValue({
      version: 2,
      slug: "neon-portrait",
      familyId: "prod-prompt",
      files: [
        {
          blob: new Blob(["a"]),
          name: "a.png",
          type: "image/png",
          role: null,
        },
      ],
      options: {},
      sizeName: "Square (1:1)",
      prompt: "soft film grain",
      savedAt: Date.now(),
    });
    renderForm();
    await waitFor(() =>
      expect(screen.getByLabelText("Describe your changes")).toHaveValue(
        "soft film grain"
      )
    );
    expect(screen.getByRole("switch", { name: "Prompt" })).toBeChecked();
  });

  it("explains — not silently drops — a saved prompt on an ineligible preset", async () => {
    window.history.replaceState(
      null,
      "",
      "/app/create/noir-premiere?draft=1"
    );
    mocks.loadDraft.mockResolvedValue({
      version: 2,
      slug: "noir-premiere",
      familyId: "prod-1",
      files: [
        {
          blob: new Blob(["a"]),
          name: "a.png",
          type: "image/png",
          role: null,
        },
      ],
      options: {},
      sizeName: "Square (1:1)",
      prompt: "soft film grain",
      savedAt: Date.now(),
    });
    renderForm({ product: baseProduct });
    expect(
      await screen.findByText(
        "Your saved changes text isn't used by this look."
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Prompt" })).toBeNull();
  });

  it("blocks Generate on an over-length prompt and names the budget", async () => {
    window.history.replaceState(
      null,
      "",
      "/app/create/neon-portrait?draft=1"
    );
    mocks.loadDraft.mockResolvedValue({
      version: 2,
      slug: "neon-portrait",
      familyId: "prod-prompt",
      files: [
        {
          blob: new Blob(["a"]),
          name: "a.png",
          type: "image/png",
          role: null,
        },
      ],
      options: {},
      sizeName: "Square (1:1)",
      prompt: "x".repeat(141),
      savedAt: Date.now(),
    });
    renderForm();
    await waitFor(() =>
      expect(
        screen.getByText("Keep it under 140 characters.")
      ).toBeInTheDocument()
    );
    expect(generateButtons()[0]).toBeDisabled();
    expect(mocks.createAndSubmit).not.toHaveBeenCalled();
  });

  it("pins a moderation block on the composer and clears it on edit", async () => {
    localStorage.setItem(SKIP_COST_CONFIRM_KEY, "1");
    mocks.createAndSubmit.mockResolvedValue({
      error:
        "That text can't be used — it violates our content policy. Please revise it and try again.",
    });
    renderForm();
    await pickPhoto();
    await enablePrompt("some blocked text");
    await waitFor(() => expect(generateButtons()[0]).toBeEnabled());
    fireEvent.click(generateButtons()[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /content policy/i
    );
    // Editing clears the pinned message — the setup is untouched.
    fireEvent.change(screen.getByLabelText("Describe your changes"), {
      target: { value: "a gentler request" },
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("saves the prompt into the anonymous draft before the auth gate", async () => {
    renderForm({ userId: null, blocked: null });
    await pickPhoto();
    await enablePrompt("add neon glow");
    await waitFor(() => expect(generateButtons()[0]).toBeEnabled());
    fireEvent.click(generateButtons()[0]);
    expect(await screen.findByTestId("auth-gate")).toBeInTheDocument();
    const saves = mocks.saveDraft.mock.calls;
    const withPrompt = saves.find(
      ([d]) => d.prompt === "add neon glow"
    );
    expect(withPrompt).toBeTruthy();
  });
});
