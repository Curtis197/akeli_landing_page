-- ============================================================
-- Akeli V1 — Custom SQL Functions & Triggers
-- Synced from Supabase on 2026-03-11
-- ============================================================

-- Extensions required
-- CREATE EXTENSION IF NOT EXISTS unaccent;
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE EXTENSION IF NOT EXISTS vector;


-- Trigger: handle_new_user
-- Creates user_profile + creator rows when a new auth.users record is inserted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_profile (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.creator (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;


-- Trigger: generate_recipe_slug
-- Auto-generates a URL-safe slug when a recipe is first published
CREATE OR REPLACE FUNCTION public.generate_recipe_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.slug IS NULL AND NEW.is_published = true THEN
    NEW.slug := lower(
      regexp_replace(
        regexp_replace(
          unaccent(NEW.title),
          '[^a-zA-Z0-9\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      )
    ) || '-' || substring(NEW.id::text, 1, 6);
  END IF;
  RETURN NEW;
END;
$function$;


-- Trigger: create_creator_support_conversation
-- Creates a support conversation when a new creator is onboarded
CREATE OR REPLACE FUNCTION public.create_creator_support_conversation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_conversation_id uuid;
BEGIN
  INSERT INTO conversation (type, name, created_by, is_support_open)
  VALUES ('support', 'Support Akeli', NEW.user_id, true)
  RETURNING id INTO v_conversation_id;

  INSERT INTO conversation_participant (conversation_id, user_id)
  VALUES (v_conversation_id, NEW.user_id);

  RETURN NEW;
END;
$function$;


-- Trigger: update_creator_recipe_count
-- Keeps creator.recipe_count in sync when recipes are published/unpublished
CREATE OR REPLACE FUNCTION public.update_creator_recipe_count()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE creator SET recipe_count = (
    SELECT COUNT(*) FROM recipe
    WHERE creator_id = NEW.creator_id AND is_published = true
  ) WHERE id = NEW.creator_id;
  RETURN NEW;
END;
$function$;


-- Trigger: update_creator_fan_count
-- Keeps creator.fan_count in sync when fan subscriptions change status
CREATE OR REPLACE FUNCTION public.update_creator_fan_count()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE creator SET fan_count = (
    SELECT COUNT(*) FROM fan_subscription
    WHERE creator_id = NEW.creator_id AND status = 'active'
  ) WHERE id = NEW.creator_id;
  RETURN NEW;
END;
$function$;


-- Trigger: update_updated_at
-- Generic trigger to set updated_at = now() on any table
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;


-- Function: calculate_recipe_macros(p_recipe_id uuid)
-- Computes per-serving macros for a recipe from its validated ingredients
CREATE OR REPLACE FUNCTION public.calculate_recipe_macros(p_recipe_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  v_servings int;
  v_result   json;
BEGIN
  SELECT servings INTO v_servings FROM recipe WHERE id = p_recipe_id;
  IF v_servings IS NULL OR v_servings = 0 THEN
    v_servings := 1;
  END IF;

  SELECT json_build_object(
    'calories',                ROUND((SUM((ri.quantity / 100.0) * i.calories_per_100g)  / v_servings)::numeric, 1),
    'protein_g',               ROUND((SUM((ri.quantity / 100.0) * i.protein_per_100g)  / v_servings)::numeric, 1),
    'carbs_g',                 ROUND((SUM((ri.quantity / 100.0) * i.carbs_per_100g)    / v_servings)::numeric, 1),
    'fat_g',                   ROUND((SUM((ri.quantity / 100.0) * i.fat_per_100g)      / v_servings)::numeric, 1),
    'ingredients_with_macros', COUNT(CASE WHEN i.calories_per_100g IS NOT NULL THEN 1 END),
    'ingredients_total',       COUNT(ri.id),
    'macros_complete',         BOOL_AND(i.calories_per_100g IS NOT NULL)
  )
  INTO v_result
  FROM recipe_ingredient ri
  JOIN ingredient i ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = p_recipe_id
    AND i.status = 'validated';

  RETURN v_result;
END;
$function$;


-- Function: get_creator_by_username(p_username text)
-- Returns the public profile of a creator by username (uses creator_public_profile view)
CREATE OR REPLACE FUNCTION public.get_creator_by_username(p_username text)
RETURNS json
LANGUAGE sql
STABLE
AS $function$
  SELECT row_to_json(creator_public_profile)
  FROM creator_public_profile
  WHERE username = p_username
  LIMIT 1;
$function$;
