import { describe, expect, it, vi, beforeAll, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { LabWorkspace } from "../lab-workspace";
import type { PublicProductDetail } from "@/types/catalog";
import type { ProviderModelOption } from "@/lib/db/provider-catalog";

const { runLabGeneration, pollLabGeneration } = vi.hoisted(() => ({
  runLabGeneration: vi.fn(),
  pollLabGeneration: vi.fn(),
}));

vi.mock("@/lib/lab/actions", () => ({
  runLabGeneration,
  pollLabGeneration,
}));

vi.mock("@/lib/generation/upload", () => ({
  prepareSourceUpload: vi.fn(async () => ({
    signedUrl: "https://upload.example/signed",
    path: "sources/test.png",
  })),
  finalizeSourceUpload: vi.fn(async () => ({ assetId: "asset-1" })),
}));

beforeAll(() => {
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  URL.createObjectURL ??= () => "blob:mock";
  URL.revokeObjectURL ??= () => {};
});

const PRODUCT: PublicProductDetail = {
  id: "prod-1",
  slug: "manga-cutout",
  name: "Manga Cutout",
  type: "filter",
  short_description: null,
  long_description: null,
  category_id: null,
  category_slug: null,
  category_name: null,
  featured_rank: null,
  version_id: "ver-1",
  version_number: 1,
  credit_cost: 26.4,
  output_sizes: [
    { name: "Square (1:1)", width: 1024, height: 1024, is_default: true },
  ],
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

const MODEL: ProviderModelOption = {
  provider: "fal.ai",
  endpointId: "fal-ai/nano-banana-2/edit",
  displayName: "Nano Banana 2",
  description: "",
  category: "image-to-image",
  unitPrice: 0.08,
  unit: "images",
};

function renderWorkspace() {
  return render(
    <LabWorkspace
      product={PRODUCT}
      models={[MODEL]}
      defaultEndpointId={MODEL.endpointId}
      initialBalance={500}
      markup={1.5}
      recipe={null}
    />
  );
}

function selectFile(container: HTMLElement) {
  const input = container.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;
  fireEvent.change(input, {
    target: {
      files: [new File(["img"], "photo.png", { type: "image/png" })],
    },
  });
}

describe("LabWorkspace polling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true }))
    );
  });

  it("keeps polling runs whose generationIds arrive after the effect started", async () => {
    vi.useFakeTimers();
    runLabGeneration.mockResolvedValue({
      generationId: "gen-1",
      creditCost: 26.4,
      balanceAfter: 473.6,
    });
    pollLabGeneration.mockResolvedValue({
      status: "completed",
      imageUrl: "https://cdn.example/result.png",
      creditCost: 26.4,
    });

    const { container } = renderWorkspace();
    selectFile(container);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /run 1 test/i })
      );
    });

    // Runs are submitted; the poll interval was created while no run had a
    // generationId yet — the regression this guards against.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3600);
    });

    expect(pollLabGeneration).toHaveBeenCalledWith("gen-1");
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(
      screen.getByAltText("Nano Banana 2 result")
    ).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("marks a run failed when the poll reports a terminal failure", async () => {
    vi.useFakeTimers();
    runLabGeneration.mockResolvedValue({
      generationId: "gen-2",
      creditCost: 13.14,
      balanceAfter: 486.86,
    });
    pollLabGeneration.mockResolvedValue({
      status: "failed",
      failureCode: "provider_failed",
      creditCost: 13.14,
    });

    const { container } = renderWorkspace();
    selectFile(container);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /run 1 test/i })
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3600);
    });

    expect(screen.getByText("failed")).toBeInTheDocument();
    vi.useRealTimers();
  });
});
