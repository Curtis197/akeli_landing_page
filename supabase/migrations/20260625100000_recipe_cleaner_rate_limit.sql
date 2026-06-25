-- Rate-limit table + RPC for recipe-cleaner.
--
-- recipe_cleaner_call: one row per invocation (commit or preview). Checked
-- before the Gemini call so we don't burn tokens on callers over quota.
-- Generous default: 200 calls/creator/day.

CREATE TABLE IF NOT EXISTS public.recipe_cleaner_call (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  called_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS recipe_cleaner_call_creator_at
  ON public.recipe_cleaner_call (creator_id, called_at DESC);

ALTER TABLE public.recipe_cleaner_call
  ENABLE ROW LEVEL SECURITY;

-- Creators can read their own call history; only service_role may insert.
CREATE POLICY "creators_read_own_calls"
  ON public.recipe_cleaner_call
  FOR SELECT
  USING (auth.uid() IN (
    SELECT user_id FROM public.creator WHERE id = creator_id
  ));

-- check_and_record_cleaner_call:
--   Count calls in the rolling window. If under the limit, insert a new row
--   and return TRUE (allowed). If at/over the limit, return FALSE (denied).
--   SECURITY DEFINER so the edge function's service-role client can call it
--   without needing direct INSERT on the table.
CREATE OR REPLACE FUNCTION public.check_and_record_cleaner_call(
  p_creator_id   uuid,
  p_limit        int  DEFAULT 200,
  p_window_hours int  DEFAULT 24
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.recipe_cleaner_call
  WHERE creator_id = p_creator_id
    AND called_at  > now() - (p_window_hours || ' hours')::interval;

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.recipe_cleaner_call (creator_id) VALUES (p_creator_id);
  RETURN true;
END;
$$;

-- Only service_role may call this (the edge function's admin client).
REVOKE ALL ON FUNCTION public.check_and_record_cleaner_call(uuid, int, int)
  FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_cleaner_call(uuid, int, int)
  TO service_role;
ALTER FUNCTION public.check_and_record_cleaner_call(uuid, int, int)
  OWNER TO postgres;
