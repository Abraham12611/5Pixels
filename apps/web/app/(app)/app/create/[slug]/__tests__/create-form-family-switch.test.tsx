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
import type { FamilyRailMember } from "@/lib/catalog/family";
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
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
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

const base: PublicProductDetail = {
  id: "prod-1",
  slug: "noir-duo",
  name: "Noir Duo",
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

/** Current preset — multi (person+outfit required, prop optional), no prompt. */
const duo: PublicProductDetail = {
  ...base,
  family_id: "fam-1",
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

function member(
  over: Partial<FamilyRailMember> & Pick<FamilyRailMember, "productId" | "slug" | "label">
): FamilyRailMember {
  return {
    name: over.label,
    isParent: false,
    isCurrent: false,
    available: true,
    creditCost: 5,
    previewUrl: null,
    inputCapability: null,
    ...over,
  };
}

/** Same-shape sibling — both staged inputs carry role-for-role. */
const twin = member({
  productId: "prod-4",
  slug: "noir-duo-vivid",
  label: "Vivid",
  inputCapability: {
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
});

/** Sibling with one fewer required slot — a person-only multi variant. */
const solo = member({
  productId: "prod-2",
  slug: "noir-solo",
  label: "Solo",
  inputCapability: {
    mode: "multi",
    min_images: 1,
    max_images: 2,
    roles: [{ name: "person" }, { name: "backdrop", optional: true }],
    prompt: { enabled: true, max_chars: 200 },
  },
});

/** Single-image sibling — any second photo can't carry. */
const mono = member({
  productId: "prod-3",
  slug: "noir-mono",
  label: "Mono",
  inputCapability: {
    mode: "single",
    min_images: 1,
    max_images: 1,
    roles: [],
    prompt: { enabled: false, max_chars: 0 },
  },
});

const family: FamilyRailMember[] = [
  member({
    productId: "prod-1",
    slug: "noir-duo",
    label: "Duo",
    isCurrent: true,
    inputCapability: duo.input_capability ?? null,
  }),
  solo,
  twin,
  mono,
];

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
      product={duo}
      multiInputReleased
      promptReleased
      family={family}
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

async function flushUploads(count: number) {
  await waitFor(() =>
    expect(mocks.finalizeUpload).toHaveBeenCalledTimes(count)
  );
}

function pickViaRail(fileName: string) {
  fireEvent.click(screen.getByRole("button", { name: "Add photo" }));
  const input = document.querySelector('input[type="file"]')!;
  fireEvent.change(input, {
    target: {
      files: [new File(["x"], fileName, { type: "image/png" })],
    },
  });
}

describe("create form — family variant switching (#180)", () => {
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

  it("renders the sibling rail only when the preset belongs to a family", () => {
    renderForm();
    expect(
      screen.getByRole("listbox", { name: "Styles in this set" })
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Solo/  })).toBeInTheDocument();

    renderForm({ family: [], product: { ...duo, family_id: undefined } });
    expect(
      screen.queryAllByRole("listbox", { name: "Styles in this set" }).length
    ).toBe(1); // only the first render's
  });

  it("carries uploaded inputs through ?inputs/?roles — no re-upload, no charge", async () => {
    renderForm();

    fireEvent.click(screen.getByTestId("pick-file"));
    pickViaRail("outfit.png");
    await flushUploads(2);

    fireEvent.click(screen.getByRole("option", { name: /Vivid/ }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));

    const href = mocks.push.mock.calls[0][0] as string;
    expect(href).toContain("/app/create/noir-duo-vivid");
    expect(href).toContain("draft=1");
    // Both uploaded assets ride the URL — asset ids, not blobs.
    expect(href).toContain("inputs=asset-path-1%2Casset-path-2");
    expect(href).toContain("roles=person%2Coutfit");

    // The draft still saves for the auth-optional path — files stay empty
    // because both inputs were already uploaded.
    const save = mocks.saveDraft.mock.calls.at(-1)![0];
    expect(save.slug).toBe("noir-duo-vivid");
    expect(save.familyId).toBe("fam-1");
    expect(save.files).toHaveLength(0);
    expect(mocks.createAndSubmit).not.toHaveBeenCalled();
  });

  it("carries staged files through the draft for anonymous users — no ?inputs", async () => {
    renderForm({ userId: null, blocked: null });

    fireEvent.click(screen.getByTestId("pick-file"));
    pickViaRail("outfit.png");
    await act(async () => {});

    fireEvent.click(screen.getByRole("option", { name: /Solo/  }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));

    const href = mocks.push.mock.calls[0][0] as string;
    expect(href).toContain("/app/create/noir-solo");
    expect(href).toContain("draft=1");
    expect(href).not.toContain("inputs=");

    // Staged files ride the draft with the roles the assessment resolved —
    // person keeps its slot; outfit has no target slot and is dropped.
    const save = mocks.saveDraft.mock.calls.at(-1)![0];
    expect(save.files.map((f: { role: string | null }) => f.role)).toEqual([
      "person",
    ]);
    expect(save.notices?.join(" ")).toMatch(/outfit/i);
  });

  it("explains on the chip when a sibling can't carry the whole setup", async () => {
    renderForm();
    fireEvent.click(screen.getByTestId("pick-file"));
    pickViaRail("outfit.png");
    await flushUploads(2);

    // Mono takes one image — its chip flags that an image won't carry.
    const monoChip = screen.getByRole("option", { name: /Mono/ });
    expect(monoChip.textContent).toMatch(/won’t carry|image/i);
    // Solo has no outfit slot but keeps one photo — also flagged.
    const soloChip = screen.getByRole("option", { name: /Solo/ });
    expect(soloChip.textContent).toMatch(/won’t carry|needs|image/i);
  });

  it("both release flags ON: rail and composer coexist and carry together (#185 matrix)", async () => {
    const bothOn: PublicProductDetail = {
      ...duo,
      input_capability: {
        ...(duo.input_capability!),
        prompt: { enabled: true, max_chars: 200 },
      },
    };
    renderForm({ product: bothOn });
    // Slot rail and the opt-in composer both mount — the toggles are
    // independent, and prompt typing still reprices the multi fingerprint.
    expect(screen.getByRole("button", { name: "Add photo" })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("pick-file"));
    pickViaRail("outfit.png");
    await flushUploads(2);
    fireEvent.click(screen.getByRole("switch", { name: "Prompt" }));
    fireEvent.change(screen.getByLabelText("Describe your changes"), {
      target: { value: "warmer grade" },
    });

    fireEvent.click(screen.getByRole("option", { name: /Vivid/ }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));
    const save = mocks.saveDraft.mock.calls.at(-1)![0];
    const href = mocks.push.mock.calls[0][0] as string;
    expect(href).toContain("inputs=asset-path-1%2Casset-path-2");
    expect(save.prompt).toBe("warmer grade");
  });

  it("preserves the prompt in the draft but never applies it to a prompt-forbidden target", async () => {
    const promptProduct: PublicProductDetail = {
      ...duo,
      input_capability: {
        ...(duo.input_capability!),
        prompt: { enabled: true, max_chars: 200 },
      },
    };
    renderForm({ product: promptProduct });

    fireEvent.click(screen.getByTestId("pick-file"));
    pickViaRail("outfit.png");
    await flushUploads(2);
    fireEvent.click(screen.getByRole("switch", { name: "Prompt" }));
    fireEvent.change(screen.getByLabelText("Describe your changes"), {
      target: { value: "moody lighting" },
    });

    fireEvent.click(screen.getByRole("option", { name: /Mono/ }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));

    const save = mocks.saveDraft.mock.calls.at(-1)![0];
    expect(save.prompt).toBe("moody lighting");
    // Assessment flags it as preserved-but-not-applied for the chip/target.
    expect(save.notices?.join(" ")).toMatch(/prompt/i);
  });

  it("lands role-bound carried inputs on their named slots — unassigned fill first-open", async () => {
    renderForm({
      initialInputs: [
        {
          assetId: "carried-outfit",
          url: "https://x.test/o.png",
          name: "Kept photo",
          role: "outfit",
        },
      ],
    });
    await act(async () => {});
    // The outfit slot is filled by the carried asset — the person slot
    // stays empty, so Generate correctly waits on the missing required role.
    expect(screen.getByText("1 of 3 photos")).toBeInTheDocument();
    expect(generateButtons()[0]).toBeDisabled();
    expect(
      screen.getAllByText("This look needs 2 photos").length
    ).toBeGreaterThan(0);
    expect(mocks.prepareUpload).not.toHaveBeenCalled();
  });

  it("keeps the first carried photo on a single-image target and explains the dropped extra", async () => {
    renderForm({
      product: { ...base, slug: "noir-mono", family_id: "fam-1" },
      multiInputReleased: false,
      initialInputs: [
        {
          assetId: "kept-1",
          url: "https://x.test/a.png",
          name: "Kept photo",
        },
        {
          assetId: "kept-2",
          url: "https://x.test/b.png",
          name: "Kept photo",
        },
      ],
    });
    await act(async () => {});
    // Single-image path — the first carried input is the staged source.
    expect(screen.getByText(/Kept photo/)).toBeInTheDocument();
    // The second is explained, not silently dropped.
    expect(
      screen.getByText(/doesn't fit this variation's image slots/i)
    ).toBeInTheDocument();
    expect(mocks.prepareUpload).not.toHaveBeenCalled();
  });

  it("restores a switch draft role-aware and surfaces the carry notices", async () => {
    window.history.replaceState(
      null,
      "",
      "/app/create/noir-duo?draft=1"
    );
    mocks.loadDraft.mockResolvedValue({
      version: 2,
      slug: "noir-duo",
      familyId: "fam-1",
      files: [
        {
          blob: new Blob(["a"]),
          name: "a.png",
          type: "image/png",
          role: "outfit",
        },
      ],
      options: {},
      sizeName: null,
      prompt: null,
      notices: ["an image won’t carry — this variation has no “prop” image slot"],
      savedAt: Date.now(),
    });
    renderForm();
    await flushUploads(1);

    // The file lands on the outfit slot — person stays required-empty.
    expect(screen.getByText("1 of 3 photos")).toBeInTheDocument();
    expect(
      screen.getByText(/has no “prop” image slot/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText("We kept your photo and settings.")
    ).toBeInTheDocument();
  });

  it("never charges on switch — a fresh page owns the next quote lifecycle", async () => {
    localStorage.setItem(SKIP_COST_CONFIRM_KEY, "1");
    renderForm();
    fireEvent.click(screen.getByTestId("pick-file"));
    pickViaRail("outfit.png");
    await flushUploads(2);
    await waitFor(() => expect(generateButtons()[0]).toBeEnabled());

    fireEvent.click(screen.getByRole("option", { name: /Solo/  }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));

    // Switching is navigation, never a submission: no charge, no credit call.
    expect(mocks.createAndSubmit).not.toHaveBeenCalled();
  });
});
