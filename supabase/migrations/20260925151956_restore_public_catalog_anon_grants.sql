-- Restore anonymous EXECUTE on the public catalog read RPCs.
--
-- 20260915000001_catalog_created_at_likeness.sql recreated both functions and
-- re-granted EXECUTE to `authenticated` only, which broke every anonymous
-- discovery surface (/explore, the landing feed, /presets/[slug]) with
-- "permission denied for function get_public_catalog".
--
-- These are read-only public catalog functions; anonymous browsing is a
-- product requirement (anonymous discovery precedes sign-in).

GRANT EXECUTE ON FUNCTION public.get_public_catalog(TEXT, TEXT, UUID[], TEXT, TEXT, INT, INT)
  TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_public_product_by_slug(TEXT)
  TO anon, authenticated;
