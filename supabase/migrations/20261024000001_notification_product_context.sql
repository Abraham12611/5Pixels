-- Notification context + inbox list index.
--
-- 1) Generation notifications named the preset that produced them. The old
--    trigger wrote an identical "Your result is ready" for every completion,
--    making a list of them indistinguishable. Titles now read
--    '"<product>" is ready' (and '"<product>" failed' / '"<product>" was
--    blocked by moderation'), falling back to the old generic text when the
--    product row is gone. The notifications_paused gate is preserved.
--
-- 2) The inbox query (user_id, created_at DESC LIMIT 15 over read+unread
--    rows) could not use the partial unread-only index. Add a general index
--    alongside it.

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_on_generation_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_name TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.user_settings
    WHERE user_id = NEW.user_id AND notifications_paused
  ) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT p.name INTO v_product_name
    FROM public.products p
    WHERE p.id = NEW.product_id;

    IF NEW.status = 'completed' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        NEW.user_id,
        'generation',
        COALESCE('"' || v_product_name || '" is ready', 'Your result is ready'),
        'Generation completed successfully.',
        '/app/results/' || NEW.id::text
      );
    ELSIF NEW.status = 'failed' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        NEW.user_id,
        'generation',
        COALESCE('"' || v_product_name || '" failed', 'Generation failed'),
        'Your credits were refunded. Please try again.',
        '/app/generations/' || NEW.id::text
      );
    ELSIF NEW.status = 'blocked' THEN
      INSERT INTO public.notifications (user_id, type, title, body, link)
      VALUES (
        NEW.user_id,
        'generation',
        COALESCE(
          '"' || v_product_name || '" was blocked by moderation',
          'Generation blocked by moderation'
        ),
        'This generation did not pass the content policy.',
        '/app/generations/' || NEW.id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
