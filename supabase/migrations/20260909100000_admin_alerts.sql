-- Admin alerts and monitoring (Phase 10.4)

CREATE TABLE IF NOT EXISTS public.admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_alerts_unack
  ON public.admin_alerts(created_at DESC)
  WHERE acknowledged_at IS NULL AND resolved_at IS NULL;

-- RLS: admin or owner only.
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_alerts_admin" ON public.admin_alerts
  FOR ALL USING ((SELECT is_admin FROM public.profiles WHERE id = auth.uid())
                 OR (SELECT is_owner FROM public.profiles WHERE id = auth.uid()));
