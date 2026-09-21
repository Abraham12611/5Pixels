-- Notifications table + automatic notifications for generation status changes.
-- Users receive a row when a generation completes, fails, or is blocked.

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('generation', 'billing', 'system')),
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, created_at DESC)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications.
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications read (only read_at may change).
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No client-side insert/delete: notifications are created server-side.

-- Trigger function: notify on terminal generation status transitions.
CREATE OR REPLACE FUNCTION public.notify_on_generation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'completed' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        NEW.user_id,
        'generation',
        'Your result is ready',
        'Generation completed successfully.',
        '/app/results/' || NEW.id::text
      );
    ELSIF NEW.status = 'failed' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        NEW.user_id,
        'generation',
        'Generation failed',
        'Your credits were refunded. Please try again.',
        '/app/generations/' || NEW.id::text
      );
    ELSIF NEW.status = 'blocked' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        NEW.user_id,
        'generation',
        'Generation blocked by moderation',
        'This generation did not pass the content policy.',
        '/app/generations/' || NEW.id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_generation_status ON public.generations;
CREATE TRIGGER notify_generation_status
  AFTER UPDATE OF status ON public.generations
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_generation_status_change();
