-- Auto-link recipe_step.ingredient_ids from step content.
--
-- match_ingredient_ids_for_step_content() does accent/case-insensitive, word-boundary,
-- simple-plural-tolerant matching of a recipe's non-header ingredient names against a
-- step's content. replace_recipe_steps() (called by both the recipe wizard's Step 3 save
-- and recipe-cleaner's apply path) now recomputes ingredient_ids for every non-header step
-- right after inserting them, so linking stays correct for all future saves with no extra
-- client round trip. The trailing UPDATE backfills the ~1,784 existing steps that predate
-- this function and have never had ingredient_ids populated.

CREATE OR REPLACE FUNCTION public.match_ingredient_ids_for_step_content(p_recipe_id uuid, p_content text)
RETURNS uuid[]
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT COALESCE(array_agg(DISTINCT ri.ingredient_id), '{}'::uuid[])
  FROM recipe_ingredient ri
  JOIN ingredient i ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = p_recipe_id
    AND NOT ri.is_section_header
    AND ri.ingredient_id IS NOT NULL
    AND p_content IS NOT NULL
    AND lower(unaccent(p_content)) ~ (
      '\y' || (
        SELECT string_agg(regexp_replace(word, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g') || 's?', '\s+')
        FROM unnest(regexp_split_to_array(lower(unaccent(i.name_fr)), '\s+')) AS word
      ) || '\y'
    )
$$;

CREATE OR REPLACE FUNCTION public.replace_recipe_steps(p_recipe_id uuid, p_steps jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_role  text := COALESCE(auth.jwt() ->> 'role', 'none'); -- 'none' = direct DB connection (psql, cron, tests)
BEGIN
  IF v_role NOT IN ('service_role', 'none') THEN
    IF NOT EXISTS (
      SELECT 1 FROM recipe r
      JOIN creator c ON c.id = r.creator_id
      WHERE r.id = p_recipe_id AND c.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'replace_recipe_steps: caller does not own recipe %', p_recipe_id
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  IF p_steps IS NULL OR jsonb_typeof(p_steps) <> 'array' OR jsonb_array_length(p_steps) = 0 THEN
    RAISE EXCEPTION 'replace_recipe_steps: p_steps must be a non-empty JSON array';
  END IF;

  DELETE FROM public.recipe_step WHERE recipe_id = p_recipe_id;

  INSERT INTO public.recipe_step
    (recipe_id, step_number, sort_order, title, content, image_url, timer_seconds, is_section_header, ingredient_ids)
  SELECT
    p_recipe_id,
    (s->>'step_number')::int,
    (s->>'sort_order')::int,
    NULLIF(s->>'title', ''),
    NULLIF(s->>'content', ''),
    NULLIF(s->>'image_url', ''),
    NULLIF(s->>'timer_seconds', '')::int,
    COALESCE((s->>'is_section_header')::boolean, false),
    COALESCE(
      (SELECT array_agg(x::uuid) FROM jsonb_array_elements_text(s->'ingredient_ids') AS x),
      '{}'::uuid[]
    )
  FROM jsonb_array_elements(p_steps) AS s;

  UPDATE public.recipe_step rs
  SET ingredient_ids = public.match_ingredient_ids_for_step_content(rs.recipe_id, rs.content)
  WHERE rs.recipe_id = p_recipe_id
    AND NOT rs.is_section_header
    AND rs.content IS NOT NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

-- One-time backfill for steps that predate this function.
UPDATE public.recipe_step rs
SET ingredient_ids = public.match_ingredient_ids_for_step_content(rs.recipe_id, rs.content)
WHERE NOT rs.is_section_header
  AND rs.content IS NOT NULL;
