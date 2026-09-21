CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = (SELECT auth.uid())), FALSE);
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, status)
  VALUES (NEW.id, NEW.email, 'active');
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

CREATE INDEX idx_categories_hero_asset ON public.categories(hero_asset_id);
CREATE INDEX idx_credit_ledger_generation ON public.credit_ledger(generation_id);
CREATE INDEX idx_favorites_product ON public.favorites(product_id);
CREATE INDEX idx_generation_outputs_asset ON public.generation_outputs(asset_id);
CREATE INDEX idx_generations_product_version ON public.generations(product_version_id);
CREATE INDEX idx_generations_source_asset ON public.generations(source_asset_id);
CREATE INDEX idx_product_assets_asset ON public.product_assets(asset_id);
CREATE INDEX idx_product_assets_version ON public.product_assets(product_version_id);
CREATE INDEX idx_product_versions_created_by ON public.product_versions(created_by_admin_id);
CREATE INDEX idx_products_hero_asset ON public.products(hero_asset_id);
CREATE INDEX idx_products_poster_asset ON public.products(poster_asset_id);
CREATE INDEX idx_products_preview_gif_asset ON public.products(preview_gif_asset_id);
CREATE INDEX idx_products_preview_video_asset ON public.products(preview_video_asset_id);
