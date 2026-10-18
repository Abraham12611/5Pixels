import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
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

// Light stubs — these tests exercise the form's pricing lifecycle, not the
// child surfaces themselves.
vi.mock("@/components/consumer/studio-stage", () => ({
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
          new File(["x"], "photo.png", { type: "image/png" })
        )
      }
    >
      pick
    </button>
  ),
}));

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
  BlockedCreditSurface: ({
    open,
    required,
  }: {
    open: boolean;
    required: number;
  }) =>
    open ? (
      <div data-testid="insufficient-surface" data-required={required} />
    ) : null,
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
  { name: "Portrait (4:5)", width: 1024, height: 1280 },
];

const product: PublicProductDetail = {
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

/** Same preset with a single "Match photo" size — the estimate must wait
 * for real source dims instead of pricing the 1024² fallback. */
const matchProduct: PublicProductDetail = {
  ...product,
  output_sizes: [
    {
      name: "Match photo",
      width: 1024,
      height: 1024,
      is_default: true,
      match_source: true,
    },
  ],
};

const blocked: BlockedCreditContext = {
  segment: "subscriber",
  isReferred: false,
  offersOptedOut: true,
};

const reusedSource = {
  assetId: "asset-1",
  url: "https://example.com/photo.png",
  name: "photo.png",
};

interface Estimate {
  estimatedCredits: number;
  unavailable: boolean;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderForm(overrides: Partial<
  Parameters<typeof CreateGenerationForm>[0]
> = {}) {
  return render(
    <CreateGenerationForm
      userId="user-1"
      product={product}
      initialBalance={100}
      hasPriorGenerations
      plans={[]}
      blocked={blocked}
      offer={null}
      topUp={null}
      initialSource={reusedSource}
      {...overrides}
    />
  );
}

/** Form Generate buttons only — the real confirmation dialog has its own
 * "Generate" confirm action that must not collide with queries. */
function generateButtons() {
  return screen
    .getAllByRole("button", { name: /^generate/i })
    .filter((b) => b.closest('[role="dialog"]') === null);
}

describe("create form — pricing readiness", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    mocks.loadDraft.mockResolvedValue(null);
    mocks.createAndSubmit.mockResolvedValue({});
  });

  it("blocks Generate while the quote is in flight, then keeps the first-run confirmation", async () => {
    const d = deferred<Estimate>();
    mocks.estimate.mockReturnValue(d.promise);
    renderForm({ hasPriorGenerations: false });

    const [generate] = generateButtons();
    expect(generate).toBeDisabled();
    expect(
      screen.getAllByText("Checking the current price…").length
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /credits/i })).toBeNull();

    // Even a direct form submit can't slip a charged action past the gate.
    fireEvent.submit(generate.closest("form")!);
    expect(mocks.createAndSubmit).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();

    await act(async () =>
      d.resolve({ estimatedCredits: 5, unavailable: false })
    );

    const [ready] = await screen.findAllByRole("button", {
      name: /generate · 5 credits/i,
    });
    fireEvent.click(ready);

    // First run → confirmation with the real server price, not a submit.
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/5 credits/i)).toBeInTheDocument();
    expect(mocks.createAndSubmit).not.toHaveBeenCalled();

    // The real dialog's Confirm action closes itself and starts the run.
    fireEvent.click(within(dialog).getByRole("button", { name: "Generate" }));
    await waitFor(() =>
      expect(mocks.createAndSubmit).toHaveBeenCalledTimes(1)
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("invalidates the previous quote the moment inputs change", async () => {
    const dA = deferred<Estimate>();
    const dB = deferred<Estimate>();
    mocks.estimate
      .mockReturnValueOnce(dA.promise)
      .mockReturnValueOnce(dB.promise);
    renderForm();

    await act(async () =>
      dA.resolve({ estimatedCredits: 3, unavailable: false })
    );
    await screen.findAllByRole("button", { name: /generate · 3 credits/i });

    fireEvent.click(screen.getByRole("button", { name: "Portrait (4:5)" }));

    // The stale 3-credit quote can't be acted on while the new fetch runs.
    const [generate] = screen.getAllByRole("button", {
      name: /^generate$/i,
    });
    expect(generate).toBeDisabled();
    expect(screen.queryByRole("button", { name: /3 credits/i })).toBeNull();

    await act(async () =>
      dB.resolve({ estimatedCredits: 8, unavailable: false })
    );
    await screen.findAllByRole("button", { name: /generate · 8 credits/i });
  });

  it("discards an out-of-order response for inputs that already changed", async () => {
    const dA = deferred<Estimate>();
    const dB = deferred<Estimate>();
    mocks.estimate
      .mockReturnValueOnce(dA.promise)
      .mockReturnValueOnce(dB.promise);
    renderForm();

    fireEvent.click(
      await screen.findByRole("button", { name: "Portrait (4:5)" })
    );

    // The square-size response lands late — it must not price the new pick.
    await act(async () =>
      dA.resolve({ estimatedCredits: 3, unavailable: false })
    );
    const [generate] = screen.getAllByRole("button", {
      name: /^generate$/i,
    });
    expect(generate).toBeDisabled();
    expect(screen.queryByRole("button", { name: /3 credits/i })).toBeNull();

    await act(async () =>
      dB.resolve({ estimatedCredits: 8, unavailable: false })
    );
    await screen.findAllByRole("button", { name: /generate · 8 credits/i });
  });

  it("closes an open confirmation when its quote goes stale — the fresh price needs a new explicit confirm", async () => {
    const dA = deferred<Estimate>();
    const dB = deferred<Estimate>();
    mocks.estimate
      .mockReturnValueOnce(dA.promise)
      .mockReturnValueOnce(dB.promise);
    renderForm({ hasPriorGenerations: false });

    await act(async () =>
      dA.resolve({ estimatedCredits: 5, unavailable: false })
    );
    fireEvent.click(generateButtons()[0]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/5 credits/i)).toBeInTheDocument();

    // Inputs changed while the dialog was open — it must close, not
    // quietly reprice an approval the user gave for different inputs.
    fireEvent.click(screen.getByRole("button", { name: "Portrait (4:5)" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(mocks.createAndSubmit).not.toHaveBeenCalled();

    // Once the fresh quote lands, Generate re-asks with the new price.
    await act(async () =>
      dB.resolve({ estimatedCredits: 8, unavailable: false })
    );
    fireEvent.click(generateButtons()[0]);
    const reopened = await screen.findByRole("dialog");
    expect(within(reopened).getByText(/8 credits/i)).toBeInTheDocument();
    expect(within(reopened).queryByText(/5 credits/i)).toBeNull();

    fireEvent.click(
      within(reopened).getByRole("button", { name: "Generate" })
    );
    await waitFor(() =>
      expect(mocks.createAndSubmit).toHaveBeenCalledTimes(1)
    );
  });

  it("fails closed on an unquotable route and retries without a fake price", async () => {
    const d1 = deferred<Estimate>();
    const d2 = deferred<Estimate>();
    mocks.estimate
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);
    renderForm();

    await act(async () =>
      d1.resolve({ estimatedCredits: 0, unavailable: true })
    );

    const [generate] = generateButtons();
    expect(generate).toBeDisabled();
    expect(
      screen.getAllByText(/can't be priced right now/i).length
    ).toBeGreaterThan(0);
    expect(screen.queryByText("0 credits")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[0]);
    expect(
      await screen.findAllByText("Checking the current price…")
    ).not.toHaveLength(0);

    await act(async () =>
      d2.resolve({ estimatedCredits: 4, unavailable: false })
    );
    await screen.findAllByRole("button", { name: /generate · 4 credits/i });
  });

  it("shows a retry on a failed fetch and never renders a blank or zero cost", async () => {
    const d1 = deferred<Estimate>();
    const d2 = deferred<Estimate>();
    mocks.estimate
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);
    renderForm();

    await act(async () => d1.reject(new Error("network down")));

    const [generate] = generateButtons();
    expect(generate).toBeDisabled();
    expect(
      screen.getAllByText(/couldn't load the price/i).length
    ).toBeGreaterThan(0);
    // The cost line degrades to a placeholder — no blank, no "0 credits".
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.queryByText("0 credits")).toBeNull();

    fireEvent.click(screen.getAllByRole("button", { name: "Retry" })[0]);
    await act(async () =>
      d2.resolve({ estimatedCredits: 6, unavailable: false })
    );
    await screen.findAllByRole("button", { name: /generate · 6 credits/i });
  });

  it("routes insufficient balance to the top-up surface with the real required cost", async () => {
    const d = deferred<Estimate>();
    mocks.estimate.mockReturnValue(d.promise);
    renderForm({ initialBalance: 2 });

    await act(async () =>
      d.resolve({ estimatedCredits: 5, unavailable: false })
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: /generate · 5 credits/i })[0]
    );

    const surface = await screen.findByTestId("insufficient-surface");
    expect(surface).toHaveAttribute("data-required", "5");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.createAndSubmit).not.toHaveBeenCalled();
  });

  it("dismisses the top-up surface when the priced configuration changes", async () => {
    const dA = deferred<Estimate>();
    const dB = deferred<Estimate>();
    mocks.estimate
      .mockReturnValueOnce(dA.promise)
      .mockReturnValueOnce(dB.promise);
    renderForm({ initialBalance: 2 });

    await act(async () =>
      dA.resolve({ estimatedCredits: 5, unavailable: false })
    );
    fireEvent.click(generateButtons()[0]);
    await screen.findByTestId("insufficient-surface");

    // The surface described a specific priced configuration — changing it
    // dismisses the surface rather than showing a fabricated requirement.
    fireEvent.click(screen.getByRole("button", { name: "Portrait (4:5)" }));
    await waitFor(() =>
      expect(screen.queryByTestId("insufficient-surface")).toBeNull()
    );

    await act(async () =>
      dB.resolve({ estimatedCredits: 7, unavailable: false })
    );
    fireEvent.click(generateButtons()[0]);
    const reopened = await screen.findByTestId("insufficient-surface");
    expect(reopened).toHaveAttribute("data-required", "7");
  });

  it("lets anonymous users reach the auth gate without a price", async () => {
    renderForm({
      userId: null,
      blocked: null,
      initialSource: null,
    });

    // No source yet → disabled for the ordinary reason, not a price one.
    expect(generateButtons()[0]).toBeDisabled();
    fireEvent.click(screen.getByTestId("pick-file"));

    const [generate] = await screen.findAllByRole("button", {
      name: /^generate$/i,
    });
    expect(generate).toBeEnabled();
    fireEvent.click(generate);

    expect(await screen.findByTestId("auth-gate")).toBeInTheDocument();
    // Anonymous never requests a quote — the server can't price a session
    // that doesn't exist, and intent here is only sign-in.
    expect(mocks.estimate).not.toHaveBeenCalled();
    expect(mocks.createAndSubmit).not.toHaveBeenCalled();
  });

  it("waits for real photo dims before pricing a match-photo size", async () => {
    const bmp = deferred<{ width: number; height: number; close(): void }>();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(() => bmp.promise)
    );
    const dFallback = deferred<Estimate>();
    const dMatch = deferred<Estimate>();
    mocks.estimate
      .mockReturnValueOnce(dFallback.promise)
      .mockReturnValueOnce(dMatch.promise);
    renderForm({ product: matchProduct, initialSource: null });

    // No source yet — the display estimate can quote the fallback dims.
    await act(async () =>
      dFallback.resolve({ estimatedCredits: 4, unavailable: false })
    );
    expect(mocks.estimate).toHaveBeenCalledTimes(1);

    // A picked photo whose dims are still decoding can't be priced on
    // fallbacks — Generate stays off and no new estimate fires.
    fireEvent.click(screen.getByTestId("pick-file"));
    expect(generateButtons()[0]).toBeDisabled();
    expect(
      screen.getAllByText("Checking the current price…").length
    ).toBeGreaterThan(0);
    expect(mocks.estimate).toHaveBeenCalledTimes(1);

    // Decode lands → the estimate refetches on the real dims.
    await act(async () =>
      bmp.resolve({ width: 800, height: 1200, close() {} })
    );
    await waitFor(() => expect(mocks.estimate).toHaveBeenCalledTimes(2));
    expect(mocks.estimate).toHaveBeenLastCalledWith({
      productVersionId: "ver-1",
      outputSize: expect.objectContaining({ width: 800, height: 1200 }),
    });

    await act(async () =>
      dMatch.resolve({ estimatedCredits: 6, unavailable: false })
    );
    await screen.findAllByRole("button", { name: /generate · 6 credits/i });
  });

  it("re-prices when the source photo is replaced mid-quote", async () => {
    const bmpA = deferred<{ width: number; height: number; close(): void }>();
    const bmpB = deferred<{ width: number; height: number; close(): void }>();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockReturnValueOnce(bmpA.promise).mockReturnValueOnce(bmpB.promise)
    );
    const dFallback = deferred<Estimate>();
    const dA = deferred<Estimate>();
    const dB = deferred<Estimate>();
    mocks.estimate
      .mockReturnValueOnce(dFallback.promise)
      .mockReturnValueOnce(dA.promise)
      .mockReturnValueOnce(dB.promise);
    renderForm({ product: matchProduct, initialSource: null });
    await act(async () =>
      dFallback.resolve({ estimatedCredits: 4, unavailable: false })
    );

    // First photo decodes → a quote for its dims goes in flight.
    fireEvent.click(screen.getByTestId("pick-file"));
    await act(async () =>
      bmpA.resolve({ width: 800, height: 1200, close() {} })
    );
    await waitFor(() => expect(mocks.estimate).toHaveBeenCalledTimes(2));

    // Replacing the photo mid-quote resets dims — the in-flight price can't
    // enable Generate for the new source.
    fireEvent.click(screen.getByTestId("pick-file"));
    expect(generateButtons()[0]).toBeDisabled();
    await act(async () =>
      dA.resolve({ estimatedCredits: 9, unavailable: false })
    );
    expect(screen.queryByRole("button", { name: /9 credits/i })).toBeNull();
    expect(generateButtons()[0]).toBeDisabled();

    // The replacement decodes → a fresh quote lands for its dims.
    await act(async () =>
      bmpB.resolve({ width: 1000, height: 1000, close() {} })
    );
    await waitFor(() => expect(mocks.estimate).toHaveBeenCalledTimes(3));
    expect(mocks.estimate).toHaveBeenLastCalledWith({
      productVersionId: "ver-1",
      outputSize: expect.objectContaining({ width: 1000, height: 1000 }),
    });
    await act(async () =>
      dB.resolve({ estimatedCredits: 6, unavailable: false })
    );
    await screen.findAllByRole("button", { name: /generate · 6 credits/i });
  });

  it("honors the skip-confirmation preference on a charged submit", async () => {
    localStorage.setItem(SKIP_COST_CONFIRM_KEY, "1");
    const d = deferred<Estimate>();
    mocks.estimate.mockReturnValue(d.promise);
    renderForm({ hasPriorGenerations: false });

    await act(async () =>
      d.resolve({ estimatedCredits: 12, unavailable: false })
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: /generate · 12 credits/i })[0]
    );

    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() =>
      expect(mocks.createAndSubmit).toHaveBeenCalledTimes(1)
    );
  });
});
