-- Atomic step replacement for the recipe-cleaner edge function.
--
-- The edge function previously did DELETE then INSERT as two separate service-role calls;
-- a mid-insert failure (e.g. a recipe_step check-constraint violation) left a recipe with
-- zero steps and no rollback. A plpgsql function runs in a single implicit transaction, so
-- any failure below rolls back the DELETE too — delete + insert become atomic.

CREATE OR REPLACE FUNCTION public.replace_recipe_steps(
  p_recipe_id uuid,
  p_steps     jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF p_steps IS NULL OR jsonb_typeof(p_steps) <> 'array' OR jsonb_array_length(p_steps) = 0 THEN
    RAISE EXCEPTION 'replace_recipe_steps: p_steps must be a non-empty JSON array';
  END IF;

  DELETE FROM public.recipe_step WHERE recipe_id = p_recipe_id;

  INSERT INTO public.recipe_step
    (recipe_id, step_number, sort_order, title, content, timer_seconds, is_section_header)
  SELECT
    p_recipe_id,
    (s->>'step_number')::int,
    (s->>'sort_order')::int,
    NULLIF(s->>'title', ''),
    NULLIF(s->>'content', ''),
    NULLIF(s->>'timer_seconds', '')::int,
    COALESCE((s->>'is_section_header')::boolean, false)
  FROM jsonb_array_elements(p_steps) AS s;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Only the service role (the recipe-cleaner edge function's admin client) may call this.
-- Without this REVOKE, SECURITY DEFINER + default PUBLIC execute would let any logged-in
-- user replace any recipe's steps via PostgREST (IDOR). Ownership stays enforced in the
-- edge function before this RPC is ever called.
REVOKE ALL ON FUNCTION public.replace_recipe_steps(uuid, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_recipe_steps(uuid, jsonb) TO service_role;
ALTER FUNCTION public.replace_recipe_steps(uuid, jsonb) OWNER TO postgres;
