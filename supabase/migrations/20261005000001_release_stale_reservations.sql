-- Backfill: terminalize credit reservations left live by the pre-integrity
-- failure paths (see 20261004000001_credit_ledger_integrity.sql).
--
-- Before that migration, fail_generation_refund inserted a +refund but left
-- the -reservation row open, so the hold still rendered as an in-progress
-- debit in raw/admin views. Generations that reached 'cancelled'/'blocked'
-- through other paths may hold a reservation with no refund at all, which
-- under the new SUM(all) availability rule would permanently short the
-- balance — so those rows also receive a compensating refund for the exact
-- held amount, keyed with the same `refund:{generation_id}` idempotency key
-- fail_generation_refund uses so no double-refund is possible.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT g.id AS generation_id,
           g.user_id,
           SUM(-cl.amount) AS held
    FROM public.generations g
    JOIN public.credit_ledger cl
      ON cl.generation_id = g.id
     AND cl.entry_type = 'reservation'
    WHERE g.status IN ('failed', 'cancelled', 'blocked')
    GROUP BY g.id, g.user_id
  LOOP
    UPDATE public.credit_ledger
    SET entry_type = 'reservation_released',
        metadata = metadata || jsonb_build_object(
          'released_at', NOW()::text,
          'backfill', '20261005000001'
        )
    WHERE generation_id = r.generation_id
      AND entry_type = 'reservation';

    IF r.held > 0
       AND NOT EXISTS (
         SELECT 1
         FROM public.credit_ledger
         WHERE generation_id = r.generation_id
           AND entry_type = 'refund'
       )
    THEN
      INSERT INTO public.credit_ledger (
        user_id, entry_type, amount, generation_id, idempotency_key, metadata
      ) VALUES (
        r.user_id,
        'refund',
        r.held,
        r.generation_id,
        'refund:' || r.generation_id::text,
        jsonb_build_object(
          'backfill', '20261005000001',
          'reason', 'terminal_generation_without_refund'
        )
      );
    END IF;
  END LOOP;
END;
$$;
