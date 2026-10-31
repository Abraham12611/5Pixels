# Model pages — authoring guide

How to launch a new engine/model on the marketing surface. Everything is
config-driven: one entry in `model-lines.ts` produces a landing section, a
showcase page, a presets grid page, and sitemap entries. No migration, no
schema change, no provider internals exposed.

## Routes a model line produces

| Route | Footer | Content |
|---|---|---|
| `/` (landing) | — | Masonry shelf clipped at 56rem + "View all of X" |
| `/models/[slug]` | Full `MarketingFooter` (anon only) | Hero, showcase strip, feature blocks, how-it-works, preset shelf, FAQ, other-engines rail |
| `/models/[slug]/presets` | `CompactFooter` (anon only, `max-md:hidden`) | Full unclipped masonry of the line's presets |

Unknown slugs and lines whose `presetSlugs` resolve to zero live products
return 404; landing sections with zero live presets hide automatically.

## Adding a model

1. Open `apps/web/lib/marketing/model-lines.ts` and append a `ModelLine`:

```ts
{
  slug: "my-engine",            // becomes /models/my-engine
  name: "My Engine",
  tagline: "One-line hook shown under titles.",
  description: "2–3 sentence intro for the model + presets pages.",
  presetSlugs: ["slug-a", "slug-b"],   // production product slugs, display order
  ctaPresetSlug: "slug-a",             // must be in presetSlugs — drives every "Try it"
  presetsHref: "/models/my-engine/presets",
  pageHref: "/models/my-engine",
  page: {
    heroPresetSlug: "slug-b",          // optional; defaults to ctaPresetSlug
    features: [                        // 2–4 alternating blocks
      { title: "…", body: "…", presetSlug: "slug-a" },
    ],
    faq: [{ q: "…", a: "…" }],
  },
}
```

2. Rules the tests enforce (`lib/marketing/__tests__/model-lines.test.ts`):
   - `ctaPresetSlug`, `heroPresetSlug`, and every `feature.presetSlug` must
     appear in `presetSlugs` (images resolve from live preset assets).
   - `pageHref`/`presetsHref` must be the canonical `/models/[slug]` paths.
   - Slugs must be unique across lines.
3. Optionally add a launch card (`LAUNCH_CARDS`) or tile (`LANDING_TILES`)
   in `landing-content.ts` pointing at the new page.
4. Ship the presets under the new engine first — the page 404s until at
   least one `presetSlug` resolves to a live public product.

## Rules that keep this honest

- **Never** put provider names, recipe details, or `provider_strategy`
  data in the config or page copy — model names are marketing labels only.
- Slug lists are curated: a preset joins a model section by adding its slug
  here. The "Latest drops" shelf on the landing keeps unmapped presets
  visible in the meantime.
- Card/promo/hero imagery defaults to live preset assets; dedicated artwork
  (Flora-generated) can replace any `presetSlug`-derived image later without
  structural changes.
