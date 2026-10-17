-- Article prompt-recipe + settings blocks (#128)
-- ------------------------------------------------------------
-- 1) products.public_prompt_recipe — the APPROVED PUBLIC editorial recipe a
--    promptRecipe block may prefill from. It is hand-written marketing/editorial
--    copy, explicitly distinct from the private generation recipe living in
--    product_versions (which stays server-side forever).
-- 2) get_public_product_editorial(product_id) — a tiny anon-safe read that
--    gives the editor exactly the public fields needed to author promptRecipe
--    and settings blocks: the approved recipe + the publicly documented
--    controls. Private columns are structurally unreachable.
-- 3) publish_article now validates preset references on promptRecipe and
--    settings blocks too (settings requires a live public preset; promptRecipe
--    may be preset-less manual copy), and validates that every prompt-recipe
--    reference of kind 'asset' points at this article's own ready/published
--    media — a forged reference can never reach another article's assets.

ALTER TABLE public.products
  ADD COLUMN public_prompt_recipe TEXT NULL;

COMMENT ON COLUMN public.products.public_prompt_recipe IS
  'Approved public editorial recipe shown in article promptRecipe blocks. '
  'Editorial copy only — never the private system/generation prompt.';

-- Bound it defensively: editorial copy, not a document store.
ALTER TABLE public.products
  ADD CONSTRAINT products_public_prompt_recipe_len
  CHECK (public_prompt_recipe IS NULL OR char_length(public_prompt_recipe) <= 8000);

/* --------------------------------------------------------------------------
 * Public editorial read for the article editor (#128)
 * ------------------------------------------------------------------------ */

CREATE OR REPLACE FUNCTION public.get_public_product_editorial(
  p_product_id UUID
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  name TEXT,
  type TEXT,
  short_description TEXT,
  public_prompt_recipe TEXT,
  active_fields JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.slug,
    p.name,
    p.type,
    p.short_description,
    p.public_prompt_recipe,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', f.id,
            'field_key', f.field_key,
            'label', f.label,
            'help_text', f.help_text,
            'field_type', f.field_type,
            'required', f.required,
            'sort_order', f.sort_order,
            'config', f.config,
            'validation', f.validation
          )
          ORDER BY f.sort_order, f.id
        )
        FROM public.product_fields f
        WHERE f.product_id = p.id AND f.active = TRUE
      ),
      '[]'::JSONB
    ) AS active_fields
  FROM public.products p
  WHERE p.id = p_product_id
    AND p.visibility = 'public'
    AND p.public_status = 'active';
$$;

REVOKE ALL ON FUNCTION public.get_public_product_editorial(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_product_editorial(UUID)
  TO anon, authenticated;

/* --------------------------------------------------------------------------
 * article_document_asset_ids — promptRecipe 'asset'-kind references count as
 * media references too. Feeding them through the shared collector means
 * publish promotion, the live-publication snapshot, and delete_article_media's
 * "in use" protection all cover prompt-recipe attachments automatically.
 * The references prop is a JSON-string snapshot — a malformed one falls back
 * to the legacy collectors rather than crashing delete-protection or publish.
 * ------------------------------------------------------------------------ */
CREATE OR REPLACE FUNCTION public.article_document_asset_ids(p_content JSONB)
RETURNS SETOF UUID
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
    SELECT DISTINCT x.id
    FROM (
      SELECT substring(u.val #>> '{}' from 9)::uuid AS id
      FROM jsonb_path_query(p_content, '$.**.props.url') AS u(val)
      WHERE (u.val #>> '{}') ~ '^asset://[0-9a-fA-F-]{36}$'
      UNION ALL
      SELECT (g.val #>> '{}')::uuid
      FROM jsonb_path_query(p_content, '$.**.props.assetId') AS g(val)
      WHERE (g.val #>> '{}') ~ '^[0-9a-fA-F-]{36}$'
      UNION ALL
      -- promptRecipe 'references' prop: JSON-stringified [{id,label,kind}].
      -- 'asset'-kind ids are article media ids and join the same collection.
      SELECT (r.val ->> 'id')::uuid
      FROM jsonb_path_query(p_content, '$.**') AS n(node)
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN jsonb_typeof(n.node -> 'props' -> 'references') = 'string'
               AND (n.node -> 'props' ->> 'references') <> ''
            THEN (n.node -> 'props' ->> 'references')::jsonb
          ELSE '[]'::jsonb
        END AS refs
      ) p
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(p.refs) = 'array' THEN p.refs ELSE '[]'::jsonb END
      ) r(val)
      WHERE jsonb_typeof(n.node) = 'object'
        AND n.node ->> 'type' = 'promptRecipe'
        AND jsonb_typeof(r.val) = 'object'
        AND r.val ->> 'kind' = 'asset'
        AND (r.val ->> 'id') ~ '^[0-9a-fA-F-]{36}$'
    ) x;
EXCEPTION
  WHEN invalid_text_representation OR syntax_error THEN
    -- A malformed serialized references prop must never take down the
    -- collector — fall back to the legacy reference kinds.
    RETURN QUERY
      SELECT DISTINCT x.id
      FROM (
        SELECT substring(u.val #>> '{}' from 9)::uuid AS id
        FROM jsonb_path_query(p_content, '$.**.props.url') AS u(val)
        WHERE (u.val #>> '{}') ~ '^asset://[0-9a-fA-F-]{36}$'
        UNION ALL
        SELECT (g.val #>> '{}')::uuid
        FROM jsonb_path_query(p_content, '$.**.props.assetId') AS g(val)
        WHERE (g.val #>> '{}') ~ '^[0-9a-fA-F-]{36}$'
      ) x;
END;
$$;

/* --------------------------------------------------------------------------
 * publish_article — validate preset refs on promptRecipe/settings blocks,
 * promptRecipe media/share references, and settings field snapshots.
 * ------------------------------------------------------------------------ */

CREATE OR REPLACE FUNCTION public.publish_article(
  p_article_id UUID,
  p_expected_edit_version BIGINT
)
RETURNS public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_article public.articles;
  v_revision_id UUID;
  v_publication_id UUID;
  v_pub_number BIGINT;
  v_author_name TEXT;
  v_author_avatar UUID;
  v_doc_error TEXT;
  v_refs UUID[];
BEGIN
  IF v_user IS NULL OR NOT public.is_editorial_staff() THEN
    RAISE EXCEPTION 'Forbidden: editorial staff only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_article
  FROM public.articles
  WHERE id = p_article_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'article_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_article.edit_version <> p_expected_edit_version THEN
    RAISE EXCEPTION 'edit_version_conflict' USING ERRCODE = '40001';
  END IF;

  IF v_article.status = 'archived' THEN
    RAISE EXCEPTION 'cannot_publish_archived' USING ERRCODE = 'P0001';
  END IF;
  IF btrim(v_article.title) = '' THEN
    RAISE EXCEPTION 'title_required' USING ERRCODE = 'P0001';
  END IF;
  IF jsonb_array_length(v_article.draft_content) = 0 THEN
    RAISE EXCEPTION 'content_required' USING ERRCODE = 'P0001';
  END IF;

  -- Publish is the trust boundary for document validity: the snapshot that
  -- anonymous readers will render must be structurally sound even when this
  -- RPC is invoked directly, outside the app's Zod validation.
  v_doc_error := public.article_document_error(v_article.draft_content);
  IF v_doc_error IS NOT NULL THEN
    RAISE EXCEPTION '%', v_doc_error USING ERRCODE = 'P0001';
  END IF;

  -- Preset-bearing blocks (#127 preset, #128 promptRecipe/settings): every
  -- referenced product must be currently public — public_status='active' AND
  -- visibility='public', matching the catalog visibility rules. `$.**`
  -- descends the whole tree so nested blocks are covered too.
  --   preset / settings — presetId is required.
  --   promptRecipe      — presetId may be empty (preset-less manual copy),
  --                       but a non-empty value must still resolve publicly.
  -- presetId is validated as text first — a forged non-uuid value raises
  -- preset_unavailable, not a cast error.
  IF EXISTS (
    SELECT 1
    FROM jsonb_path_query(v_article.draft_content, '$.**') n(node)
    CROSS JOIN LATERAL (
      SELECT
        NULLIF(n.node -> 'props' ->> 'presetId', '') AS preset_id
    ) p
    WHERE jsonb_typeof(n.node) = 'object'
      AND n.node ->> 'type' IN ('preset', 'settings', 'promptRecipe')
      AND (
        (
          -- preset/settings require a well-formed, live public preset id.
          n.node ->> 'type' IN ('preset', 'settings')
          AND (
            p.preset_id IS NULL
            OR p.preset_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            OR NOT EXISTS (
              SELECT 1
              FROM public.products pr
              WHERE pr.id = p.preset_id::uuid
                AND pr.public_status = 'active'
                AND pr.visibility = 'public'
            )
          )
        )
        OR (
          -- promptRecipe only validates a non-empty presetId.
          n.node ->> 'type' = 'promptRecipe'
          AND p.preset_id IS NOT NULL
          AND (
            p.preset_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
            OR NOT EXISTS (
              SELECT 1
              FROM public.products pr
              WHERE pr.id = p.preset_id::uuid
                AND pr.public_status = 'active'
                AND pr.visibility = 'public'
            )
          )
        )
      )
  ) THEN
    RAISE EXCEPTION 'preset_unavailable' USING ERRCODE = 'P0001';
  END IF;

  -- A version pin must still be the product's ACTIVE (public) version —
  -- retired, draft or cross-product pins block publish.
  IF EXISTS (
    SELECT 1
    FROM jsonb_path_query(v_article.draft_content, '$.**') n(node)
    CROSS JOIN LATERAL (
      SELECT NULLIF(n.node -> 'props' ->> 'selectedPublicVersionId', '') AS version_id
    ) p
    WHERE jsonb_typeof(n.node) = 'object'
      AND n.node ->> 'type' = 'preset'
      AND p.version_id IS NOT NULL
      AND (
        p.version_id !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        OR NOT EXISTS (
          SELECT 1
          FROM public.product_versions pv
          WHERE pv.id = p.version_id::uuid
            AND pv.product_id = (n.node -> 'props' ->> 'presetId')::uuid
            AND pv.state = 'active'
        )
      )
  ) THEN
    RAISE EXCEPTION 'preset_version_unavailable' USING ERRCODE = 'P0001';
  END IF;

  -- promptRecipe references (#128): `references` is a JSON array string prop —
  -- [{id, label, kind}]. Every element must be a well-shaped reference:
  --   'asset'      — a verified media row of THIS article (also collected by
  --                  article_document_asset_ids, so promotion + the
  --                  live-publication delete guard cover it).
  --   'generation' — a completed generation that is currently publicly shared
  --                  (share consent is the boundary; unshared/deleted fails).
  -- Malformed JSON, wrong element shapes, forged or no-longer-public
  -- references all surface as media_ref_not_ready — never a raw cast error.
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM jsonb_path_query(v_article.draft_content, '$.**') n(node)
      CROSS JOIN LATERAL (
        SELECT
          CASE
            WHEN jsonb_typeof((n.node -> 'props' -> 'references')) = 'string'
                 AND (n.node -> 'props' ->> 'references') <> ''
              THEN (n.node -> 'props' ->> 'references')::jsonb
            ELSE '[]'::jsonb
          END AS refs
      ) p
      CROSS JOIN LATERAL (
        SELECT r.value AS ref
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.refs) = 'array' THEN p.refs ELSE '[]'::jsonb END
        ) r
      ) ref
      WHERE jsonb_typeof(n.node) = 'object'
        AND n.node ->> 'type' = 'promptRecipe'
        AND (
          -- Element shape: {id: uuid-string, label: 1..200 chars, kind}.
          jsonb_typeof(ref.ref) <> 'object'
          OR jsonb_typeof(ref.ref -> 'id') IS DISTINCT FROM 'string'
          OR (ref.ref ->> 'id') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
          OR jsonb_typeof(ref.ref -> 'label') IS DISTINCT FROM 'string'
          OR char_length(ref.ref ->> 'label') NOT BETWEEN 1 AND 200
          OR (ref.ref ->> 'kind') NOT IN ('asset', 'generation')
          OR (
            ref.ref ->> 'kind' = 'asset'
            AND NOT EXISTS (
              SELECT 1
              FROM public.article_assets aa
              WHERE aa.article_id = p_article_id
                AND aa.asset_id = (ref.ref ->> 'id')::uuid
                AND aa.state IN ('ready', 'published')
            )
          )
          OR (
            ref.ref ->> 'kind' = 'generation'
            AND NOT EXISTS (
              SELECT 1
              FROM public.generations g
              WHERE g.id = (ref.ref ->> 'id')::uuid
                AND g.status = 'completed'
                AND g.public_share_id IS NOT NULL
            )
          )
        )
    ) THEN
      RAISE EXCEPTION 'media_ref_not_ready' USING ERRCODE = 'P0001';
    END IF;
  EXCEPTION
    WHEN invalid_text_representation OR syntax_error THEN
      RAISE EXCEPTION 'media_ref_not_ready' USING ERRCODE = 'P0001';
  END;

  -- settings field snapshots (#128): `fields` is a JSON array string prop —
  -- [{key, label, value}]. Every row must be well-shaped AND consistent with
  -- the referenced product's CURRENT publicly documented controls: the key
  -- must be an active product_fields row of that preset and the value must
  -- stay inside the documented options/range/format for its field type —
  -- matching the editor's settingsValueError rules at the server boundary.
  BEGIN
    IF EXISTS (
      SELECT 1
      FROM jsonb_path_query(v_article.draft_content, '$.**') n(node)
      CROSS JOIN LATERAL (
        SELECT
          NULLIF(n.node -> 'props' ->> 'presetId', '') AS preset_id,
          CASE
            WHEN jsonb_typeof(n.node -> 'props' -> 'fields') = 'string'
                 AND (n.node -> 'props' ->> 'fields') <> ''
              THEN (n.node -> 'props' ->> 'fields')::jsonb
            ELSE '[]'::jsonb
          END AS rows
      ) p
      CROSS JOIN LATERAL (
        SELECT r.value AS row
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.rows) = 'array' THEN p.rows ELSE '[]'::jsonb END
        ) r
      ) row
      LEFT JOIN public.product_fields f
        ON f.product_id = p.preset_id::uuid
       AND f.field_key = row.row ->> 'key'
       AND f.active = TRUE
      WHERE jsonb_typeof(n.node) = 'object'
        AND n.node ->> 'type' = 'settings'
        AND (
          -- Row shape: {key: 1..80, label: 1..200, value: <=200}.
          jsonb_typeof(row.row) <> 'object'
          OR jsonb_typeof(row.row -> 'key') IS DISTINCT FROM 'string'
          OR char_length(row.row ->> 'key') NOT BETWEEN 1 AND 80
          OR jsonb_typeof(row.row -> 'label') IS DISTINCT FROM 'string'
          OR char_length(row.row ->> 'label') NOT BETWEEN 1 AND 200
          OR jsonb_typeof(row.row -> 'value') IS DISTINCT FROM 'string'
          OR char_length(row.row ->> 'value') > 200
          -- The key must be a documented public control of the preset.
          OR f.field_key IS NULL
          -- Choice controls with documented options: value must be one.
          OR (
            f.field_type IN ('select','radio','layout','background','wardrobe','era','mood')
            AND EXISTS (
              SELECT 1
              FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(f.config -> 'options') = 'array'
                     THEN f.config -> 'options' ELSE '[]'::jsonb END
              ) o
            )
            AND NOT EXISTS (
              SELECT 1
              FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(f.config -> 'options') = 'array'
                     THEN f.config -> 'options' ELSE '[]'::jsonb END
              ) o
              WHERE CASE
                WHEN jsonb_typeof(o.value) = 'object'
                  THEN COALESCE(o.value ->> 'value', o.value ->> 'label')
                ELSE o.value #>> '{}'
              END = row.row ->> 'value'
            )
          )
          -- Intensity: numeric within the documented range.
          OR (
            f.field_type = 'intensity'
            AND (
              (row.row ->> 'value') !~ '^-?[0-9]+(\.[0-9]+)?$'
              OR (row.row ->> 'value')::numeric
                   < COALESCE((f.config ->> 'min')::numeric, 0)
              OR (row.row ->> 'value')::numeric
                   > COALESCE((f.config ->> 'max')::numeric, 100)
            )
          )
          OR (
            f.field_type = 'toggle'
            AND (row.row ->> 'value') NOT IN ('On', 'Off', '')
          )
          OR (
            f.field_type = 'color'
            AND (row.row ->> 'value') <> ''
            AND (row.row ->> 'value') !~ '^#[0-9a-fA-F]{3,8}$'
          )
        )
    ) THEN
      RAISE EXCEPTION 'settings_fields_invalid' USING ERRCODE = 'P0001';
    END IF;
  EXCEPTION
    WHEN invalid_text_representation OR syntax_error THEN
      RAISE EXCEPTION 'settings_fields_invalid' USING ERRCODE = 'P0001';
  END;

  -- Every media reference in the document plus the cover.
  v_refs := ARRAY(
    SELECT DISTINCT ref.id
    FROM (
      SELECT public.article_document_asset_ids(v_article.draft_content) AS id
      UNION ALL
      SELECT v_article.cover_asset_id
    ) ref
    WHERE ref.id IS NOT NULL
  );

  -- Every reference must resolve to a verified media row of THIS article —
  -- forged, pending, or cross-article asset ids are rejected.
  IF EXISTS (
    SELECT 1
    FROM unnest(v_refs) r(id)
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.article_assets aa
      WHERE aa.article_id = p_article_id
        AND aa.asset_id = r.id
        AND aa.state IN ('ready', 'published')
    )
  ) THEN
    RAISE EXCEPTION 'media_ref_not_ready' USING ERRCODE = 'P0001';
  END IF;

  -- Referenced assets not yet published must already have their public copy
  -- in storage — the app stages them just before calling this. The RPC never
  -- trusts that bytes exist without checking storage.objects.
  IF EXISTS (
    SELECT 1
    FROM public.article_assets aa
    WHERE aa.article_id = p_article_id
      AND aa.state = 'ready'
      AND aa.asset_id = ANY(v_refs)
      AND NOT EXISTS (
        SELECT 1
        FROM storage.objects o
        WHERE o.bucket_id = 'article-media-public'
          AND o.name = 'articles/' || p_article_id::text || '/'
              || aa.asset_id::text || '.'
              || substring(aa.staging_key from '\.([a-z0-9]+)$')
      )
  ) THEN
    RAISE EXCEPTION 'media_not_promoted' USING ERRCODE = 'P0001';
  END IF;

  -- Mark exactly the referenced assets published (stable ids, immutable keys).
  UPDATE public.article_assets aa
  SET state = 'published',
      published_key = 'articles/' || aa.article_id::text || '/'
          || aa.asset_id::text || '.'
          || substring(aa.staging_key from '\.([a-z0-9]+)$'),
      published_at = COALESCE(aa.published_at, NOW()),
      revoked_at = NULL
  WHERE aa.article_id = p_article_id
    AND aa.state = 'ready'
    AND aa.asset_id = ANY(v_refs);

  UPDATE public.assets a
  SET bucket = 'article-media-public',
      storage_key = aa.published_key,
      visibility = 'public'
  FROM public.article_assets aa
  WHERE aa.asset_id = a.id
    AND aa.article_id = p_article_id
    AND aa.state = 'published'
    AND aa.asset_id = ANY(v_refs)
    AND a.bucket <> 'article-media-public';

  -- De-publish assets a previous snapshot referenced but this one does not.
  -- Their public objects stay on disk with published_key retained so the
  -- revocation sweep can still find and remove them.
  UPDATE public.assets a
  SET bucket = 'article-media',
      storage_key = aa.staging_key,
      visibility = 'private'
  FROM public.article_assets aa
  WHERE aa.asset_id = a.id
    AND aa.article_id = p_article_id
    AND aa.state = 'published'
    AND NOT (aa.asset_id = ANY(v_refs));

  UPDATE public.article_assets aa
  SET state = 'ready', revoked_at = NOW()
  WHERE aa.article_id = p_article_id
    AND aa.state = 'published'
    AND NOT (aa.asset_id = ANY(v_refs));

  -- The save that produced this edit_version usually already wrote a
  -- 'manual'/'autosave' revision row at the same (article_id, version).
  -- Upgrade that row to source='publish' so it is retained permanently and
  -- reflects that this exact version is what went live.
  INSERT INTO public.article_revisions (
    article_id, editor_user_id, version, source,
    title, summary, content, schema_version
  ) VALUES (
    p_article_id, v_user, v_article.edit_version, 'publish',
    v_article.title, v_article.summary, v_article.draft_content, v_article.schema_version
  )
  ON CONFLICT (article_id, version) DO UPDATE
    SET source = 'publish',
        editor_user_id = EXCLUDED.editor_user_id,
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        content = EXCLUDED.content,
        schema_version = EXCLUDED.schema_version,
        saved_at = NOW()
  RETURNING id INTO v_revision_id;

  -- Frozen public-safe author projection (display name + avatar ref only).
  SELECT
    COALESCE(NULLIF(btrim(pr.display_name), ''), '5Pixels Team'),
    pr.avatar_asset_id
  INTO v_author_name, v_author_avatar
  FROM public.profiles pr
  WHERE pr.id = v_article.author_id;

  v_author_name := COALESCE(v_author_name, '5Pixels Team');

  SELECT COALESCE(MAX(publication_number), 0) + 1
  INTO v_pub_number
  FROM public.article_publications
  WHERE article_id = p_article_id;

  INSERT INTO public.article_publications (
    article_id, revision_id, publication_number,
    slug, title, summary, topic, tags, cover_asset_id,
    content, schema_version,
    author_display_name, author_avatar_asset_id, published_by
  ) VALUES (
    p_article_id, v_revision_id, v_pub_number,
    v_article.slug, v_article.title, v_article.summary, v_article.topic,
    v_article.tags, v_article.cover_asset_id,
    v_article.draft_content, v_article.schema_version,
    v_author_name, v_author_avatar, v_user
  )
  RETURNING id INTO v_publication_id;

  UPDATE public.articles
  SET
    status = 'published',
    current_publication_id = v_publication_id,
    published_at = NOW(),
    first_published_at = COALESCE(first_published_at, NOW())
  WHERE id = p_article_id
  RETURNING * INTO v_article;

  RETURN v_article;
END;
$$;

REVOKE ALL ON FUNCTION public.publish_article(UUID, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_article(UUID, BIGINT) TO authenticated;
