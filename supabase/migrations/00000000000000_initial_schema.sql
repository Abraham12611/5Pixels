-- Initial schema for 5Pixels V1
-- Products split into Filters and Posters; versions hold the private generation recipes.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles mirror Supabase Auth users and hold public + role data.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_asset_id UUID,
  is_admin BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  locale TEXT DEFAULT 'en',
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_status ON public.profiles(status);

-- Assets: uploaded media, reference images, outputs.
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES public.profiles(id),
  storage_provider TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  bucket TEXT NOT NULL,
  media_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  width INT,
  height INT,
  duration_ms INT,
  bytes INT,
  checksum TEXT,
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'internal')),
  source_type TEXT,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'flagged')),
  retention_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_assets_owner ON public.assets(owner_user_id);
CREATE INDEX idx_assets_visibility ON public.assets(visibility);

-- Categories shared by Filters and Posters.
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  hero_asset_id UUID REFERENCES public.assets(id),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_categories_active ON public.categories(is_active, sort_order);

-- Products: the common base for Filters and Posters.
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('filter', 'poster')),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  short_description TEXT,
  long_description TEXT,
  category_id UUID REFERENCES public.categories(id),
  public_status TEXT NOT NULL DEFAULT 'draft' CHECK (public_status IN ('draft', 'internal_test', 'private_beta', 'scheduled', 'active', 'paused', 'retired')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'internal', 'beta')),
  hero_asset_id UUID REFERENCES public.assets(id),
  poster_asset_id UUID REFERENCES public.assets(id),
  preview_video_asset_id UUID REFERENCES public.assets(id),
  preview_gif_asset_id UUID REFERENCES public.assets(id),
  likeness_level TEXT CHECK (likeness_level IN ('very_high', 'high', 'medium', 'creative')),
  featured_rank INT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_type_status ON public.products(type, public_status);
CREATE INDEX idx_products_category ON public.products(category_id);
CREATE INDEX idx_products_featured ON public.products(featured_rank) WHERE featured_rank IS NOT NULL;

-- Product versions: immutable generation recipes.
CREATE TABLE public.product_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'testing', 'active', 'retired')),
  private_instruction_template TEXT NOT NULL,
  private_negative_instruction TEXT,
  provider_strategy JSONB NOT NULL DEFAULT '{}',
  model_config JSONB NOT NULL DEFAULT '{}',
  input_validation_config JSONB NOT NULL DEFAULT '{}',
  post_process_config JSONB NOT NULL DEFAULT '{}',
  safety_config JSONB NOT NULL DEFAULT '{}',
  credit_cost INT NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_by_admin_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (product_id, version_number)
);

CREATE INDEX idx_product_versions_product ON public.product_versions(product_id, version_number);

-- Schema-driven user-facing controls per product.
CREATE TABLE public.product_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  help_text TEXT,
  field_type TEXT NOT NULL CHECK (field_type IN ('short_text', 'select', 'radio', 'toggle', 'color', 'aspect_ratio', 'intensity', 'layout', 'background', 'wardrobe', 'era', 'mood')),
  required BOOLEAN DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  config JSONB DEFAULT '{}',
  validation JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  UNIQUE (product_id, field_key)
);

CREATE INDEX idx_product_fields_product ON public.product_fields(product_id, active);

-- Links products/versions to their media and reference assets.
CREATE TABLE public.product_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_version_id UUID REFERENCES public.product_versions(id) ON DELETE SET NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('hero', 'poster', 'preview_video', 'preview_gif', 'example_source', 'example_result', 'style_reference', 'composition_reference', 'layout_reference')),
  sort_order INT DEFAULT 0,
  internal_only BOOLEAN DEFAULT FALSE,
  rights_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_assets_product ON public.product_assets(product_id);

-- Generations track user jobs.
CREATE TABLE public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_version_id UUID NOT NULL REFERENCES public.product_versions(id),
  source_asset_id UUID NOT NULL REFERENCES public.assets(id),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'uploaded', 'validating', 'queued', 'generating', 'post_processing', 'completed', 'failed', 'blocked', 'cancelled')),
  requested_options JSONB NOT NULL DEFAULT '{}',
  compiled_request_fingerprint TEXT,
  failure_code TEXT,
  failure_stage TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generations_user ON public.generations(user_id, created_at DESC);
CREATE INDEX idx_generations_status ON public.generations(status, created_at DESC);
CREATE INDEX idx_generations_product ON public.generations(product_id);

-- Generation outputs.
CREATE TABLE public.generation_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id),
  output_role TEXT NOT NULL CHECK (output_role IN ('primary', 'alternative', 'thumbnail', 'preview', 'composed_final')),
  width INT,
  height INT,
  file_format TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generation_outputs_generation ON public.generation_outputs(generation_id);

-- Favorites.
CREATE TABLE public.favorites (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, product_id)
);

-- Simple credit ledger.
CREATE TABLE public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('allocation', 'purchase', 'refund', 'adjustment', 'reservation', 'debit')),
  amount INT NOT NULL,
  currency_unit TEXT DEFAULT 'credits',
  generation_id UUID REFERENCES public.generations(id),
  idempotency_key TEXT UNIQUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_ledger_user ON public.credit_ledger(user_id, created_at DESC);

-- Admin audit log.
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before JSONB,
  after JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_logs_entity ON public.admin_audit_logs(entity_type, entity_id);
CREATE INDEX idx_admin_audit_logs_admin ON public.admin_audit_logs(admin_user_id, created_at DESC);

-- Row Level Security policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generation_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users read own, admins read all.
CREATE POLICY "profiles_read_self" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Assets: owner or admin read; only owner/admin insert/update.
CREATE POLICY "assets_select" ON public.assets
  FOR SELECT USING (
    owner_user_id = auth.uid()
    OR visibility = 'public'
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "assets_insert" ON public.assets
  FOR INSERT WITH CHECK (
    owner_user_id = auth.uid()
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );

-- Categories: public read, admin write.
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT USING (true);

CREATE POLICY "categories_admin" ON public.categories
  FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Products: public read active+public, admin full control.
CREATE POLICY "products_select" ON public.products
  FOR SELECT USING (
    public_status = 'active' AND visibility = 'public'
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "products_admin" ON public.products
  FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Product versions: admin only.
CREATE POLICY "product_versions_admin" ON public.product_versions
  FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Product fields: public read active fields, admin write.
CREATE POLICY "product_fields_select" ON public.product_fields
  FOR SELECT USING (
    active = TRUE AND product_id IN (SELECT id FROM public.products WHERE public_status = 'active' AND visibility = 'public')
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "product_fields_admin" ON public.product_fields
  FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Product assets: public read non-internal examples for active products, admin all.
CREATE POLICY "product_assets_select" ON public.product_assets
  FOR SELECT USING (
    internal_only = FALSE AND product_id IN (SELECT id FROM public.products WHERE public_status = 'active')
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "product_assets_admin" ON public.product_assets
  FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Generations: owner or admin.
CREATE POLICY "generations_owner" ON public.generations
  FOR ALL USING (user_id = auth.uid() OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Generation outputs: same as assets + generation owner.
CREATE POLICY "generation_outputs_select" ON public.generation_outputs
  FOR SELECT USING (
    generation_id IN (SELECT id FROM public.generations WHERE user_id = auth.uid())
    OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
  );

-- Favorites: own only.
CREATE POLICY "favorites_owner" ON public.favorites
  FOR ALL USING (user_id = auth.uid());

-- Credit ledger: own or admin.
CREATE POLICY "credit_ledger_owner" ON public.credit_ledger
  FOR SELECT USING (user_id = auth.uid() OR (SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Audit logs: admin only.
CREATE POLICY "admin_audit_logs_admin" ON public.admin_audit_logs
  FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid()));

-- Trigger: create profile row after signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, status)
  VALUES (NEW.id, NEW.email, 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: update timestamps.
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
