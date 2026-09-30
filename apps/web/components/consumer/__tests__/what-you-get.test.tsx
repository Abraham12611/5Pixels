import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WhatYouGet } from "../what-you-get";
import type { PublicProductDetail } from "@/types/catalog";

function product(
  overrides: Partial<PublicProductDetail> = {}
): PublicProductDetail {
  return {
    id: "p1",
    slug: "cyber-punk",
    name: "Cyber Punk",
    type: "filter",
    short_description: "Neon grade",
    long_description: null,
    category_id: null,
    category_slug: null,
    category_name: null,
    featured_rank: null,
    version_id: "v1",
    version_number: 1,
    credit_cost: 5,
    output_sizes: [
      { name: "Portrait 4:5", width: 1024, height: 1376, is_default: true },
      { name: "Square 1:1", width: 1024, height: 1024 },
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
    ...overrides,
  };
}

describe("WhatYouGet", () => {
  it("lists output sizes, the duration range, and what changes", () => {
    render(<WhatYouGet product={product()} />);
    expect(
      screen.getByText(/Portrait 4:5 · Square 1:1/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Usually 20–40 seconds/)).toBeInTheDocument();
    expect(
      screen.getByText(/Your photo restyled — subject stays you/)
    ).toBeInTheDocument();
  });

  it("shows poster-specific change copy for poster presets", () => {
    render(<WhatYouGet product={product({ type: "poster" })} />);
    expect(
      screen.getByText(/Your text, set into the design/)
    ).toBeInTheDocument();
  });

  it("falls back gracefully when no output sizes exist", () => {
    render(<WhatYouGet product={product({ output_sizes: [] })} />);
    expect(screen.getByText(/Sized to your photo/)).toBeInTheDocument();
  });
});
