-- Public result sharing by link

ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS public_share_id UUID UNIQUE,
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_generations_public_share
  ON public.generations(public_share_id);
