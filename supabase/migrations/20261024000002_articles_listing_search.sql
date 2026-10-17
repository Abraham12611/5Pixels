-- #132 — Public Articles directory: search, word count, and topic facets.
--
-- 1. article_document_word_count() — IMMUTABLE document walker that counts
--    words in visible text leaves only (inline `text` nodes plus the
--    recipe/caption/name/label props and workflow `steps` arrays). Used by
--    the listing RPC so cards can show an approximate reading time without
--    shipping full article content.
-- 2. get_public_articles() — recreated (full replacement) with:
--      p_query      optional search over the PUBLISHED snapshot's
--                   title + summary + tags (never draft_content)
--      word_count   BIGINT column feeding the "N min read" card label
--    p_query is length-capped (120 chars) and ILIKE metacharacters are
--    escaped so search terms can never act as patterns.
-- 3. get_public_article_topics() — distinct topics of live publications for
--    the directory's filter chips.

CREATE OR REPLACE FUNCTION public.article_document_word_count(p_content JSONB)
RETURNS BIGINT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_work JSONB;
  v_item JSONB;
  v_elem JSONB;
  v_kv RECORD;
  v_words BIGINT := 0;
BEGIN
  IF p_content IS NULL THEN
    RETURN 0;
  END IF;

  -- Worklist over every JSON node; objects and arrays are pushed back and
  -- revisited, string leaves are only counted for visible-text keys.
  v_work := jsonb_build_array(p_content);
  WHILE jsonb_array_length(v_work) > 0 LOOP
    v_item := v_work -> (jsonb_array_length(v_work) - 1);
    v_work := v_work - (jsonb_array_length(v_work) - 1);

    CASE jsonb_typeof(v_item)
      WHEN 'array' THEN
        FOR v_elem IN SELECT e.el FROM jsonb_array_elements(v_item) AS e(el) LOOP
          v_work := v_work || jsonb_build_array(v_elem);
        END LOOP;
      WHEN 'object' THEN
        FOR v_kv IN SELECT * FROM jsonb_each(v_item) LOOP
          IF v_kv.key IN ('text', 'recipe', 'caption', 'name', 'label')
             AND jsonb_typeof(v_kv.value) = 'string' THEN
            v_words := v_words + COALESCE(
              array_length(
                regexp_split_to_array(btrim(v_kv.value #>> '{}'), '\s+'), 1
              ), 0
            );
          ELSIF v_kv.key = 'steps' AND jsonb_typeof(v_kv.value) = 'array' THEN
            FOR v_elem IN
              SELECT e.el FROM jsonb_array_elements(v_kv.value) AS e(el)
            LOOP
              IF jsonb_typeof(v_elem) = 'string' THEN
                v_words := v_words + COALESCE(
                  array_length(
                    regexp_split_to_array(btrim(v_elem #>> '{}'), '\s+'), 1
                  ), 0
                );
              END IF;
            END LOOP;
          ELSE
            v_work := v_work || jsonb_build_array(v_kv.value);
          END IF;
        END LOOP;
      ELSE
        NULL;
    END CASE;
  END LOOP;

  RETURN v_words;
END;
$$;

REVOKE ALL ON FUNCTION public.article_document_word_count(JSONB) FROM PUBLIC, anon, authenticated;

DROP FUNCTION IF EXISTS public.get_public_articles(INT, INT, TEXT);

CREATE FUNCTION public.get_public_articles(
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 12,
  p_topic TEXT DEFAULT NULL,
  p_query TEXT DEFAULT NULL
)
RETURNS TABLE (
  article_id UUID,
  slug TEXT,
  title TEXT,
  summary TEXT,
  topic TEXT,
  tags TEXT[],
  cover JSONB,
  author_display_name TEXT,
  author_avatar JSONB,
  published_at TIMESTAMPTZ,
  word_count BIGINT,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH q AS (
    SELECT CASE
      WHEN p_query IS NULL OR btrim(p_query) = '' THEN NULL
      ELSE replace(
             replace(
               replace(left(btrim(p_query), 120), '\', '\\'),
               '%', '\%'
             ),
             '_', '\_'
           )
    END AS term
  )
  SELECT
    a.id AS article_id,
    pub.slug,
    pub.title,
    pub.summary,
    pub.topic,
    pub.tags,
    public.public_asset_json(pub.cover_asset_id) AS cover,
    pub.author_display_name,
    public.public_asset_json(pub.author_avatar_asset_id) AS author_avatar,
    pub.published_at,
    public.article_document_word_count(pub.content) AS word_count,
    COUNT(*) OVER () AS total_count
  FROM public.articles a
  JOIN public.article_publications pub ON pub.id = a.current_publication_id
  CROSS JOIN q
  WHERE a.status = 'published'
    AND (p_topic IS NULL OR pub.topic = p_topic)
    AND (
      q.term IS NULL
      OR (pub.title || ' ' || pub.summary || ' ' ||
          COALESCE(array_to_string(pub.tags, ' '), ''))
         ILIKE '%' || q.term || '%' ESCAPE '\'
    )
  ORDER BY pub.published_at DESC
  LIMIT LEAST(GREATEST(p_page_size, 1), 50)
  OFFSET (GREATEST(p_page, 1) - 1) * LEAST(GREATEST(p_page_size, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.get_public_articles(INT, INT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_articles(INT, INT, TEXT, TEXT) TO anon, authenticated;

-- Topic facets for the directory filter rail — live publications only.
CREATE OR REPLACE FUNCTION public.get_public_article_topics()
RETURNS TABLE (
  topic TEXT,
  article_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pub.topic, COUNT(*) AS article_count
  FROM public.articles a
  JOIN public.article_publications pub ON pub.id = a.current_publication_id
  WHERE a.status = 'published'
    AND pub.topic IS NOT NULL
  GROUP BY pub.topic
  ORDER BY article_count DESC, pub.topic ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_article_topics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_article_topics() TO anon, authenticated;
