-- Generation feedback and quality measurement (Phase 10.2)

CREATE TABLE IF NOT EXISTS public.generation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_generation_feedback_user_generation
  ON public.generation_feedback(user_id, generation_id);

CREATE INDEX IF NOT EXISTS idx_generation_feedback_generation
  ON public.generation_feedback(generation_id);

-- RLS: users can only see/submit their own feedback; admins can see all.
ALTER TABLE public.generation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "generation_feedback_owner" ON public.generation_feedback
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "generation_feedback_admin" ON public.generation_feedback
  FOR ALL USING (
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
    OR
    (SELECT is_owner FROM public.profiles WHERE id = auth.uid())
  );
