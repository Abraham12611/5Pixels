-- Pause-all notification preference (25_MOBILE_WEB_POLISH 14 §4.1).
-- A single global toggle that suppresses in-app notification inserts.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notifications_paused BOOLEAN NOT NULL DEFAULT false;

-- Gate the generation-status trigger on the preference. Recreated identically
-- except for the early return while paused.
CREATE OR REPLACE FUNCTION public.notify_on_generation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = NEW.user_id AND notifications_paused
  ) THEN
    RETURN NEW;
  END IF;

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
