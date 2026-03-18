


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";






CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";






CREATE OR REPLACE FUNCTION "public"."calculate_recipe_macros"("p_recipe_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."calculate_recipe_macros"("p_recipe_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_creator_support_conversation"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."create_creator_support_conversation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_group_conversation"("p_name" "text", "p_is_public" boolean) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_user_id uuid;
  v_group_id uuid;
  v_conv_id uuid;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();

  -- Verify the user is a creator
  IF NOT EXISTS (SELECT 1 FROM creator WHERE user_id = v_user_id) THEN
    RAISE EXCEPTION 'User is not a creator';
  END IF;

  -- Create the community group
  INSERT INTO community_group (name, is_public, creator_id)
  VALUES (p_name, p_is_public, v_user_id)
  RETURNING id INTO v_group_id;

  -- Create the conversation
  INSERT INTO conversation (type, name, created_by, community_group_id)
  VALUES ('creator_group', p_name, v_user_id, v_group_id)
  RETURNING id INTO v_conv_id;

  -- Add creator as participant
  INSERT INTO conversation_participant (conversation_id, user_id)
  VALUES (v_conv_id, v_user_id);

  RETURN v_conv_id;
END;
$$;


ALTER FUNCTION "public"."create_group_conversation"("p_name" "text", "p_is_public" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_recipe_slug"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."generate_recipe_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_creator_by_username"("p_username" "text") RETURNS json
    LANGUAGE "sql" STABLE
    AS $$
  SELECT row_to_json(creator_public_profile)
  FROM creator_public_profile
  WHERE username = p_username
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_creator_by_username"("p_username" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Create user_profile (id = auth user id)
  INSERT INTO public.user_profile (
    id,
    first_name,
    last_name,
    is_creator,
    onboarding_done,
    locale,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    false,
    false,
    COALESCE(NEW.raw_user_meta_data->>'locale', 'fr'),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_recipe_development_version"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  SELECT COALESCE(MAX(version), 0) + 1
  INTO NEW.version
  FROM public.recipe_development
  WHERE recipe_id = NEW.recipe_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_recipe_development_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_creator_fan_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE creator SET fan_count = (
    SELECT COUNT(*) FROM fan_subscription
    WHERE creator_id = NEW.creator_id AND status = 'active'
  ) WHERE id = NEW.creator_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_creator_fan_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_creator_recipe_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Recalculer le cr├®ateur de la recette supprim├®e
    IF OLD.creator_id IS NOT NULL THEN
      UPDATE creator SET recipe_count = (
        SELECT COUNT(*) FROM recipe
        WHERE creator_id = OLD.creator_id AND is_published = true
      ) WHERE id = OLD.creator_id;
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.creator_id IS DISTINCT FROM NEW.creator_id THEN
      IF OLD.creator_id IS NOT NULL THEN
        UPDATE creator SET recipe_count = (
          SELECT COUNT(*) FROM recipe
          WHERE creator_id = OLD.creator_id AND is_published = true
        ) WHERE id = OLD.creator_id;
      END IF;
      IF NEW.creator_id IS NOT NULL THEN
        UPDATE creator SET recipe_count = (
          SELECT COUNT(*) FROM recipe
          WHERE creator_id = NEW.creator_id AND is_published = true
        ) WHERE id = NEW.creator_id;
      END IF;
    ELSIF OLD.is_published IS DISTINCT FROM NEW.is_published THEN
      IF NEW.creator_id IS NOT NULL THEN
        UPDATE creator SET recipe_count = (
          SELECT COUNT(*) FROM recipe
          WHERE creator_id = NEW.creator_id AND is_published = true
        ) WHERE id = NEW.creator_id;
      END IF;
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.is_published = true AND NEW.creator_id IS NOT NULL THEN
      UPDATE creator SET recipe_count = (
        SELECT COUNT(*) FROM recipe
        WHERE creator_id = NEW.creator_id AND is_published = true
      ) WHERE id = NEW.creator_id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_creator_recipe_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN 
  NEW.updated_at = now();
  RETURN NEW; 
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_conversation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ai_conversation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ai_message" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "tokens_used" integer,
    "sent_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ai_message_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text"])))
);


ALTER TABLE "public"."ai_message" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_message" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "group_id" "uuid",
    "sender_id" "uuid",
    "content" "text" NOT NULL,
    "message_type" "text" DEFAULT 'text'::"text",
    "recipe_id" "uuid",
    "sent_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chat_message_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'recipe_share'::"text"]))),
    CONSTRAINT "check_target" CHECK (((("conversation_id" IS NOT NULL) AND ("group_id" IS NULL)) OR (("conversation_id" IS NULL) AND ("group_id" IS NOT NULL))))
);


ALTER TABLE "public"."chat_message" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_group" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "cover_url" "text",
    "creator_id" "uuid",
    "is_public" boolean DEFAULT true,
    "member_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."community_group" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'private'::"text",
    "name" "text",
    "created_by" "uuid",
    "is_support_open" boolean DEFAULT false,
    "community_group_id" "uuid",
    "closed_at" timestamp with time zone,
    CONSTRAINT "conversation_type_check" CHECK (("type" = ANY (ARRAY['private'::"text", 'creator_group'::"text", 'support'::"text"])))
);


ALTER TABLE "public"."conversation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_participant" (
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "last_read_at" timestamp with time zone
);


ALTER TABLE "public"."conversation_participant" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_request" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid",
    "recipient_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "message" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "responded_at" timestamp with time zone,
    CONSTRAINT "conversation_request_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."conversation_request" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."creator" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "display_name" "text" NOT NULL,
    "bio" "text",
    "profile_image_url" "text",
    "specialties" "text"[],
    "recipe_count" integer DEFAULT 0,
    "fan_count" integer DEFAULT 0,
    "total_revenue" numeric(10,2) DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "username" "text",
    "instagram_handle" "text",
    "tiktok_handle" "text",
    "youtube_handle" "text",
    "website_url" "text",
    "specialty_codes" "text"[],
    "language_codes" "text"[],
    "heritage_region" "text",
    CONSTRAINT "creator_username_format" CHECK (("username" ~ '^[a-z0-9_-]{3,30}$'::"text"))
);


ALTER TABLE "public"."creator" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."creator_balance" (
    "creator_id" "uuid" NOT NULL,
    "available_balance" numeric(10,2) DEFAULT 0,
    "pending_balance" numeric(10,2) DEFAULT 0,
    "lifetime_earnings" numeric(10,2) DEFAULT 0,
    "last_payout_at" timestamp with time zone,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."creator_balance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."creator_revenue_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid",
    "recipe_id" "uuid",
    "revenue_type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "logged_at" "date" DEFAULT CURRENT_DATE,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "creator_revenue_log_revenue_type_check" CHECK (("revenue_type" = ANY (ARRAY['consumption'::"text", 'fan_mode'::"text"])))
);


ALTER TABLE "public"."creator_revenue_log" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."creator_dashboard_stats" WITH ("security_invoker"='on') AS
 SELECT "id" AS "creator_id",
    "display_name",
    "username",
    "recipe_count",
    "fan_count",
    "total_revenue",
    ("recipe_count" >= 30) AS "is_fan_eligible",
    COALESCE(( SELECT "sum"("creator_revenue_log"."amount") AS "sum"
           FROM "public"."creator_revenue_log"
          WHERE (("creator_revenue_log"."creator_id" = "c"."id") AND ("date_trunc"('month'::"text", ("creator_revenue_log"."logged_at")::timestamp with time zone) = "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone)))), (0)::numeric) AS "revenue_current_month",
    COALESCE(( SELECT "sum"("creator_revenue_log"."amount") AS "sum"
           FROM "public"."creator_revenue_log"
          WHERE (("creator_revenue_log"."creator_id" = "c"."id") AND ("date_trunc"('month'::"text", ("creator_revenue_log"."logged_at")::timestamp with time zone) = "date_trunc"('month'::"text", (CURRENT_DATE - '1 mon'::interval))))), (0)::numeric) AS "revenue_last_month",
    COALESCE(( SELECT "count"(*) AS "count"
           FROM "public"."creator_revenue_log"
          WHERE (("creator_revenue_log"."creator_id" = "c"."id") AND ("creator_revenue_log"."revenue_type" = 'consumption'::"text") AND ("date_trunc"('month'::"text", ("creator_revenue_log"."logged_at")::timestamp with time zone) = "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone)))), (0)::bigint) AS "consumptions_current_month",
    (30 - (COALESCE(( SELECT "count"(*) AS "count"
           FROM "public"."creator_revenue_log"
          WHERE (("creator_revenue_log"."creator_id" = "c"."id") AND ("creator_revenue_log"."revenue_type" = 'consumption'::"text") AND ("date_trunc"('month'::"text", ("creator_revenue_log"."logged_at")::timestamp with time zone) = "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone)))), (0)::bigint) % (30)::bigint)) AS "consumptions_to_next_euro"
   FROM "public"."creator" "c";


ALTER VIEW "public"."creator_dashboard_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."creator_public_profile" WITH ("security_invoker"='on') AS
 SELECT "id",
    "username",
    "display_name",
    "bio",
    "profile_image_url",
    "specialty_codes",
    "language_codes",
    "instagram_handle",
    "tiktok_handle",
    "youtube_handle",
    "website_url",
    "recipe_count",
    "fan_count",
    "total_revenue",
    "created_at",
    ("recipe_count" >= 30) AS "is_fan_eligible"
   FROM "public"."creator" "c"
  WHERE ("username" IS NOT NULL);


ALTER VIEW "public"."creator_public_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."daily_nutrition_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "date" "date" NOT NULL,
    "total_calories" numeric(7,1),
    "total_protein_g" numeric(6,1),
    "total_carbs_g" numeric(6,1),
    "total_fat_g" numeric(6,1),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."daily_nutrition_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fan_external_recipe_counter" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid",
    "external_recipe_url" "text" NOT NULL,
    "consumption_count" integer DEFAULT 0,
    "last_consumed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fan_external_recipe_counter" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fan_subscription" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "creator_id" "uuid",
    "status" "text" DEFAULT 'active'::"text",
    "subscribed_at" timestamp with time zone DEFAULT "now"(),
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "fan_subscription_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."fan_subscription" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fan_subscription_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "subscription_id" "uuid",
    "status" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fan_subscription_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."food_region" (
    "code" "text" NOT NULL,
    "name_fr" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_es" "text",
    "name_pt" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."food_region" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_member" (
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "last_read_at" timestamp with time zone,
    CONSTRAINT "group_member_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."group_member" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ingredient" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "name_fr" "text",
    "name_en" "text",
    "name_es" "text",
    "name_pt" "text",
    "category" "text",
    "calories_per_100g" numeric(6,1),
    "protein_per_100g" numeric(5,1),
    "carbs_per_100g" numeric(5,1),
    "fat_per_100g" numeric(5,1),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'validated'::"text",
    CONSTRAINT "ingredient_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'validated'::"text"])))
);


ALTER TABLE "public"."ingredient" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ingredient_category" (
    "code" "text" NOT NULL,
    "name_fr" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ingredient_category" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ingredient_submission" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submitted_by" "uuid",
    "name" "text" NOT NULL,
    "name_fr" "text",
    "name_en" "text",
    "category_hint" "text",
    "notes" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "ingredient_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ingredient_submission_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'validated'::"text", 'rejected'::"text", 'duplicate'::"text"])))
);


ALTER TABLE "public"."ingredient_submission" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meal_consumption" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "recipe_id" "uuid",
    "meal_plan_entry_id" "uuid",
    "consumed_at" timestamp with time zone DEFAULT "now"(),
    "servings" integer DEFAULT 1,
    "rating" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "consumed_date" "date" GENERATED ALWAYS AS ((("consumed_at" AT TIME ZONE 'UTC'::"text"))::"date") STORED,
    CONSTRAINT "meal_consumption_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5)))
);


ALTER TABLE "public"."meal_consumption" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meal_plan" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "name" "text",
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."meal_plan" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meal_plan_entry" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "meal_plan_id" "uuid",
    "recipe_id" "uuid",
    "date" "date" NOT NULL,
    "meal_type" "text",
    "servings" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "meal_plan_entry_meal_type_check" CHECK (("meal_type" = ANY (ARRAY['breakfast'::"text", 'lunch'::"text", 'dinner'::"text", 'snack'::"text"])))
);


ALTER TABLE "public"."meal_plan_entry" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meal_reminder" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "meal_type" "text",
    "reminder_time" time without time zone NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "meal_reminder_meal_type_check" CHECK (("meal_type" = ANY (ARRAY['breakfast'::"text", 'lunch'::"text", 'dinner'::"text", 'snack'::"text"])))
);


ALTER TABLE "public"."meal_reminder" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."measurement_unit" (
    "code" "text" NOT NULL,
    "name_fr" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_es" "text",
    "name_pt" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."measurement_unit" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text" NOT NULL,
    "data" "jsonb",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payout" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid",
    "amount" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "stripe_payout_id" "text",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "payout_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."payout" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."push_token" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "token" "text" NOT NULL,
    "platform" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "push_token_platform_check" CHECK (("platform" = ANY (ARRAY['ios'::"text", 'android'::"text"])))
);


ALTER TABLE "public"."push_token" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "region" "text",
    "difficulty" "text",
    "prep_time_min" integer,
    "cook_time_min" integer,
    "servings" integer DEFAULT 1,
    "is_published" boolean DEFAULT false,
    "language" "text" DEFAULT 'fr'::"text",
    "cover_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text",
    "draft_data" "jsonb",
    "is_pork_free" boolean DEFAULT false,
    CONSTRAINT "recipe_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text"])))
);


ALTER TABLE "public"."recipe" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_comment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid",
    "user_id" "uuid",
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recipe_comment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_development" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "improvement_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "inspiration_source" "text",
    "inspiration_notes" "text",
    "discussion_summary" "text",
    "conversation_log" "jsonb",
    "changes_made" "jsonb",
    "change_summary" "text",
    "macros_before" "jsonb",
    "macros_after" "jsonb",
    "outcome_rating" integer,
    "outcome_notes" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recipe_development_outcome_rating_check" CHECK ((("outcome_rating" >= 1) AND ("outcome_rating" <= 5))),
    CONSTRAINT "recipe_development_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'applied'::"text", 'rejected'::"text", 'pending_test'::"text"])))
);


ALTER TABLE "public"."recipe_development" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_image" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid",
    "url" "text" NOT NULL,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recipe_image" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_impression" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "source" "text" NOT NULL,
    "seen_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recipe_impression_source_check" CHECK (("source" = ANY (ARRAY['feed'::"text", 'search'::"text", 'meal_planner'::"text"])))
);


ALTER TABLE "public"."recipe_impression" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_ingredient" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid",
    "ingredient_id" "uuid",
    "quantity" numeric(8,2),
    "unit" "text",
    "is_optional" boolean DEFAULT false,
    "sort_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "title" "text",
    "is_section_header" boolean DEFAULT false NOT NULL,
    CONSTRAINT "chk_recipe_ingredient_section_header" CHECK (((("is_section_header" = true) AND ("title" IS NOT NULL) AND ("ingredient_id" IS NULL)) OR (("is_section_header" = false) AND ("ingredient_id" IS NOT NULL) AND ("quantity" IS NOT NULL))))
);


ALTER TABLE "public"."recipe_ingredient" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_like" (
    "user_id" "uuid" NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recipe_like" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_macro" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid",
    "calories" numeric(7,1),
    "protein_g" numeric(6,1),
    "carbs_g" numeric(6,1),
    "fat_g" numeric(6,1),
    "fiber_g" numeric(6,1),
    "sodium_mg" numeric(7,1),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recipe_macro" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_open" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "source" "text" NOT NULL,
    "opened_at" timestamp with time zone DEFAULT "now"(),
    "closed_at" timestamp with time zone,
    "session_duration_seconds" integer,
    CONSTRAINT "recipe_open_source_check" CHECK (("source" = ANY (ARRAY['feed'::"text", 'search'::"text", 'meal_planner'::"text"])))
);


ALTER TABLE "public"."recipe_open" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."recipe_performance_summary" WITH ("security_invoker"='on') AS
 SELECT "r"."id" AS "recipe_id",
    "r"."creator_id",
    "r"."title",
    "r"."cover_image_url",
    "r"."is_published",
    "r"."created_at" AS "published_at",
    "count"(DISTINCT "mc"."id") AS "total_consumptions",
    "count"(DISTINCT "mc"."user_id") AS "unique_users",
    COALESCE("sum"("crl"."amount"), (0)::numeric) AS "total_revenue",
    "count"(DISTINCT "mc"."id") FILTER (WHERE ("date_trunc"('month'::"text", "mc"."consumed_at") = "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone))) AS "consumptions_this_month",
    COALESCE("sum"("crl"."amount") FILTER (WHERE ("date_trunc"('month'::"text", ("crl"."logged_at")::timestamp with time zone) = "date_trunc"('month'::"text", (CURRENT_DATE)::timestamp with time zone))), (0)::numeric) AS "revenue_this_month",
    "count"(DISTINCT "mc"."id") FILTER (WHERE ("date_trunc"('month'::"text", "mc"."consumed_at") = "date_trunc"('month'::"text", (CURRENT_DATE - '1 mon'::interval)))) AS "consumptions_last_month"
   FROM (("public"."recipe" "r"
     LEFT JOIN "public"."meal_consumption" "mc" ON (("mc"."recipe_id" = "r"."id")))
     LEFT JOIN "public"."creator_revenue_log" "crl" ON (("crl"."recipe_id" = "r"."id")))
  GROUP BY "r"."id", "r"."creator_id", "r"."title", "r"."cover_image_url", "r"."is_published", "r"."created_at";


ALTER VIEW "public"."recipe_performance_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_save" (
    "user_id" "uuid" NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "saved_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recipe_save" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_step" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid" NOT NULL,
    "step_number" integer NOT NULL,
    "title" "text",
    "content" "text",
    "image_url" "text",
    "timer_seconds" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_section_header" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "chk_recipe_step_section_header" CHECK (((("is_section_header" = true) AND ("title" IS NOT NULL) AND ("content" IS NULL)) OR (("is_section_header" = false) AND ("content" IS NOT NULL))))
);


ALTER TABLE "public"."recipe_step" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_tag" (
    "recipe_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL
);


ALTER TABLE "public"."recipe_tag" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_translation" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipe_id" "uuid",
    "locale" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "instructions" "text" NOT NULL,
    "is_auto" boolean DEFAULT true,
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "recipe_translation_locale_check" CHECK (("locale" = ANY (ARRAY['fr'::"text", 'en'::"text", 'es'::"text", 'pt'::"text", 'wo'::"text", 'bm'::"text", 'ln'::"text", 'ar'::"text"])))
);


ALTER TABLE "public"."recipe_translation" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."recipe_vector" (
    "recipe_id" "uuid" NOT NULL,
    "vector" "public"."vector"(50) NOT NULL,
    "last_computed" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."recipe_vector" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."referral" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "referrer_id" "uuid",
    "referred_id" "uuid",
    "referral_code" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "converted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "referral_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'converted'::"text"])))
);


ALTER TABLE "public"."referral" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shopping_list" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "meal_plan_id" "uuid",
    "name" "text",
    "is_completed" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shopping_list" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shopping_list_item" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "shopping_list_id" "uuid",
    "ingredient_id" "uuid",
    "custom_name" "text",
    "quantity" numeric(8,2) NOT NULL,
    "unit" "text",
    "is_checked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."shopping_list_item" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."specialty" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "name_fr" "text" NOT NULL,
    "name_en" "text" NOT NULL,
    "name_es" "text",
    "name_pt" "text",
    "region" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."specialty" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subscription" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "status" "text" DEFAULT 'trialing'::"text",
    "current_period_start" timestamp with time zone,
    "current_period_end" timestamp with time zone,
    "cancel_at_period_end" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "subscription_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'cancelled'::"text", 'past_due'::"text", 'trialing'::"text"])))
);


ALTER TABLE "public"."subscription" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_message" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "subject" "text",
    "content" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "support_message_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."support_message" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sync_type" "text" NOT NULL,
    "last_synced_date" "date",
    "last_run_at" timestamp with time zone DEFAULT "now"(),
    "last_run_status" "text",
    "rows_synced" integer DEFAULT 0,
    "rows_skipped" integer DEFAULT 0,
    "rows_errored" integer DEFAULT 0,
    "error_detail" "text",
    "user_cache" "jsonb" DEFAULT '{}'::"jsonb",
    "user_cache_built_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sync_log_last_run_status_check" CHECK (("last_run_status" = ANY (ARRAY['success'::"text", 'error'::"text", 'partial'::"text"])))
);


ALTER TABLE "public"."sync_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tag" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "name_fr" "text",
    "name_en" "text",
    "name_es" "text",
    "name_pt" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tag" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_cuisine_preference" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "region" "text",
    "preference_score" numeric(3,2) DEFAULT 1.0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_cuisine_preference_preference_score_check" CHECK ((("preference_score" >= (0)::numeric) AND ("preference_score" <= (1)::numeric)))
);


ALTER TABLE "public"."user_cuisine_preference" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_dietary_restriction" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "restriction" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_dietary_restriction_restriction_check" CHECK (("restriction" = ANY (ARRAY['vegetarian'::"text", 'vegan'::"text", 'pescatarian'::"text", 'halal'::"text", 'kosher'::"text", 'gluten_free'::"text", 'lactose_free'::"text", 'nut_free'::"text", 'low_sodium'::"text", 'diabetic_friendly'::"text"])))
);


ALTER TABLE "public"."user_dietary_restriction" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_goal" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "goal_type" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_goal_goal_type_check" CHECK (("goal_type" = ANY (ARRAY['weight_loss'::"text", 'muscle_gain'::"text", 'maintenance'::"text", 'health'::"text", 'performance'::"text"])))
);


ALTER TABLE "public"."user_goal" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_health_profile" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "sex" "text",
    "birth_date" "date",
    "height_cm" numeric(5,1),
    "weight_kg" numeric(5,1),
    "target_weight_kg" numeric(5,1),
    "activity_level" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_health_profile_activity_level_check" CHECK (("activity_level" = ANY (ARRAY['sedentary'::"text", 'light'::"text", 'moderate'::"text", 'active'::"text", 'very_active'::"text"]))),
    CONSTRAINT "user_health_profile_sex_check" CHECK (("sex" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."user_health_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profile" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "first_name" "text",
    "last_name" "text",
    "avatar_url" "text",
    "locale" "text" DEFAULT 'fr'::"text",
    "is_creator" boolean DEFAULT false,
    "onboarding_done" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profile" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_vector" (
    "user_id" "uuid" NOT NULL,
    "vector" "public"."vector"(50) NOT NULL,
    "last_computed" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_vector" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weight_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "weight_kg" numeric(5,1) NOT NULL,
    "logged_at" "date" DEFAULT CURRENT_DATE,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."weight_log" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_conversation"
    ADD CONSTRAINT "ai_conversation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_message"
    ADD CONSTRAINT "ai_message_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_message"
    ADD CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_group"
    ADD CONSTRAINT "community_group_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participant"
    ADD CONSTRAINT "conversation_participant_pkey" PRIMARY KEY ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation"
    ADD CONSTRAINT "conversation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_request"
    ADD CONSTRAINT "conversation_request_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."creator_balance"
    ADD CONSTRAINT "creator_balance_pkey" PRIMARY KEY ("creator_id");



ALTER TABLE ONLY "public"."creator"
    ADD CONSTRAINT "creator_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."creator_revenue_log"
    ADD CONSTRAINT "creator_revenue_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."creator"
    ADD CONSTRAINT "creator_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."creator"
    ADD CONSTRAINT "creator_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."daily_nutrition_log"
    ADD CONSTRAINT "daily_nutrition_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."daily_nutrition_log"
    ADD CONSTRAINT "daily_nutrition_log_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."fan_external_recipe_counter"
    ADD CONSTRAINT "fan_external_recipe_counter_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fan_subscription_history"
    ADD CONSTRAINT "fan_subscription_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fan_subscription"
    ADD CONSTRAINT "fan_subscription_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fan_subscription"
    ADD CONSTRAINT "fan_subscription_user_id_creator_id_key" UNIQUE ("user_id", "creator_id");



ALTER TABLE ONLY "public"."food_region"
    ADD CONSTRAINT "food_region_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."group_member"
    ADD CONSTRAINT "group_member_pkey" PRIMARY KEY ("group_id", "user_id");



ALTER TABLE ONLY "public"."ingredient_category"
    ADD CONSTRAINT "ingredient_category_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."ingredient"
    ADD CONSTRAINT "ingredient_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ingredient_submission"
    ADD CONSTRAINT "ingredient_submission_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_consumption"
    ADD CONSTRAINT "meal_consumption_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_plan_entry"
    ADD CONSTRAINT "meal_plan_entry_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_plan"
    ADD CONSTRAINT "meal_plan_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_reminder"
    ADD CONSTRAINT "meal_reminder_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meal_reminder"
    ADD CONSTRAINT "meal_reminder_user_id_meal_type_key" UNIQUE ("user_id", "meal_type");



ALTER TABLE ONLY "public"."measurement_unit"
    ADD CONSTRAINT "measurement_unit_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."notification"
    ADD CONSTRAINT "notification_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payout"
    ADD CONSTRAINT "payout_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_token"
    ADD CONSTRAINT "push_token_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."push_token"
    ADD CONSTRAINT "push_token_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."recipe_comment"
    ADD CONSTRAINT "recipe_comment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_development"
    ADD CONSTRAINT "recipe_development_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_image"
    ADD CONSTRAINT "recipe_image_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_impression"
    ADD CONSTRAINT "recipe_impression_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_ingredient"
    ADD CONSTRAINT "recipe_ingredient_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_like"
    ADD CONSTRAINT "recipe_like_pkey" PRIMARY KEY ("user_id", "recipe_id");



ALTER TABLE ONLY "public"."recipe_macro"
    ADD CONSTRAINT "recipe_macro_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_macro"
    ADD CONSTRAINT "recipe_macro_recipe_id_key" UNIQUE ("recipe_id");



ALTER TABLE ONLY "public"."recipe_open"
    ADD CONSTRAINT "recipe_open_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe"
    ADD CONSTRAINT "recipe_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_save"
    ADD CONSTRAINT "recipe_save_pkey" PRIMARY KEY ("user_id", "recipe_id");



ALTER TABLE ONLY "public"."recipe"
    ADD CONSTRAINT "recipe_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."recipe_step"
    ADD CONSTRAINT "recipe_step_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_tag"
    ADD CONSTRAINT "recipe_tag_pkey" PRIMARY KEY ("recipe_id", "tag_id");



ALTER TABLE ONLY "public"."recipe_translation"
    ADD CONSTRAINT "recipe_translation_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."recipe_translation"
    ADD CONSTRAINT "recipe_translation_recipe_id_locale_key" UNIQUE ("recipe_id", "locale");



ALTER TABLE ONLY "public"."recipe_vector"
    ADD CONSTRAINT "recipe_vector_pkey" PRIMARY KEY ("recipe_id");



ALTER TABLE ONLY "public"."referral"
    ADD CONSTRAINT "referral_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."referral"
    ADD CONSTRAINT "referral_referred_id_key" UNIQUE ("referred_id");



ALTER TABLE ONLY "public"."shopping_list_item"
    ADD CONSTRAINT "shopping_list_item_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopping_list"
    ADD CONSTRAINT "shopping_list_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."specialty"
    ADD CONSTRAINT "specialty_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."specialty"
    ADD CONSTRAINT "specialty_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "subscription_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "subscription_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "subscription_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "subscription_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."support_message"
    ADD CONSTRAINT "support_message_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_log"
    ADD CONSTRAINT "sync_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tag"
    ADD CONSTRAINT "tag_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."tag"
    ADD CONSTRAINT "tag_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_cuisine_preference"
    ADD CONSTRAINT "user_cuisine_preference_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_cuisine_preference"
    ADD CONSTRAINT "user_cuisine_preference_user_id_region_key" UNIQUE ("user_id", "region");



ALTER TABLE ONLY "public"."user_dietary_restriction"
    ADD CONSTRAINT "user_dietary_restriction_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_dietary_restriction"
    ADD CONSTRAINT "user_dietary_restriction_user_id_restriction_key" UNIQUE ("user_id", "restriction");



ALTER TABLE ONLY "public"."user_goal"
    ADD CONSTRAINT "user_goal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_health_profile"
    ADD CONSTRAINT "user_health_profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_health_profile"
    ADD CONSTRAINT "user_health_profile_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."user_vector"
    ADD CONSTRAINT "user_vector_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."weight_log"
    ADD CONSTRAINT "weight_log_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_ai_message_conv" ON "public"."ai_message" USING "btree" ("conversation_id", "sent_at" DESC);



CREATE INDEX "idx_chat_message_conversation" ON "public"."chat_message" USING "btree" ("conversation_id", "sent_at" DESC);



CREATE INDEX "idx_chat_message_group" ON "public"."chat_message" USING "btree" ("group_id", "sent_at" DESC);



CREATE INDEX "idx_creator_user" ON "public"."creator" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_creator_username" ON "public"."creator" USING "btree" ("username") WHERE ("username" IS NOT NULL);



CREATE INDEX "idx_fan_subscription_creator" ON "public"."fan_subscription" USING "btree" ("creator_id");



CREATE INDEX "idx_ingredient_submission_status" ON "public"."ingredient_submission" USING "btree" ("status");



CREATE INDEX "idx_ingredient_submission_user" ON "public"."ingredient_submission" USING "btree" ("submitted_by");



CREATE INDEX "idx_meal_consumption_recipe" ON "public"."meal_consumption" USING "btree" ("recipe_id");



CREATE UNIQUE INDEX "idx_meal_consumption_unique" ON "public"."meal_consumption" USING "btree" ("user_id", "recipe_id", "consumed_date");



CREATE INDEX "idx_meal_consumption_user" ON "public"."meal_consumption" USING "btree" ("user_id");



CREATE INDEX "idx_meal_plan_entry_date" ON "public"."meal_plan_entry" USING "btree" ("date");



CREATE INDEX "idx_meal_plan_entry_plan" ON "public"."meal_plan_entry" USING "btree" ("meal_plan_id");



CREATE INDEX "idx_meal_plan_user" ON "public"."meal_plan" USING "btree" ("user_id");



CREATE INDEX "idx_notification_user" ON "public"."notification" USING "btree" ("user_id", "is_read");



CREATE INDEX "idx_payout_creator" ON "public"."payout" USING "btree" ("creator_id");



CREATE INDEX "idx_recipe_creator" ON "public"."recipe" USING "btree" ("creator_id");



CREATE INDEX "idx_recipe_development_date" ON "public"."recipe_development" USING "btree" ("improvement_date" DESC);



CREATE INDEX "idx_recipe_development_recipe_id" ON "public"."recipe_development" USING "btree" ("recipe_id");



CREATE INDEX "idx_recipe_impression_recipe" ON "public"."recipe_impression" USING "btree" ("recipe_id");



CREATE INDEX "idx_recipe_impression_user" ON "public"."recipe_impression" USING "btree" ("user_id");



CREATE INDEX "idx_recipe_ingredient_recipe" ON "public"."recipe_ingredient" USING "btree" ("recipe_id");



CREATE INDEX "idx_recipe_open_recipe" ON "public"."recipe_open" USING "btree" ("recipe_id");



CREATE INDEX "idx_recipe_open_user" ON "public"."recipe_open" USING "btree" ("user_id");



CREATE INDEX "idx_recipe_published" ON "public"."recipe" USING "btree" ("is_published");



CREATE INDEX "idx_recipe_region" ON "public"."recipe" USING "btree" ("region");



CREATE INDEX "idx_recipe_save_user" ON "public"."recipe_save" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_recipe_slug" ON "public"."recipe" USING "btree" ("slug") WHERE ("slug" IS NOT NULL);



CREATE INDEX "idx_recipe_step_recipe" ON "public"."recipe_step" USING "btree" ("recipe_id");



CREATE INDEX "idx_recipe_translation_locale" ON "public"."recipe_translation" USING "btree" ("locale");



CREATE INDEX "idx_recipe_translation_recipe" ON "public"."recipe_translation" USING "btree" ("recipe_id");



CREATE INDEX "idx_recipe_vector_ivfflat" ON "public"."recipe_vector" USING "ivfflat" ("vector" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE INDEX "idx_referral_code" ON "public"."referral" USING "btree" ("referral_code");



CREATE INDEX "idx_referral_referrer" ON "public"."referral" USING "btree" ("referrer_id");



CREATE INDEX "idx_revenue_log_creator" ON "public"."creator_revenue_log" USING "btree" ("creator_id");



CREATE INDEX "idx_revenue_log_date" ON "public"."creator_revenue_log" USING "btree" ("logged_at");



CREATE UNIQUE INDEX "idx_sync_log_type" ON "public"."sync_log" USING "btree" ("sync_type");



CREATE INDEX "idx_user_vector_ivfflat" ON "public"."user_vector" USING "ivfflat" ("vector" "public"."vector_cosine_ops") WITH ("lists"='100');



CREATE OR REPLACE TRIGGER "trg_creator_support_conversation" AFTER INSERT ON "public"."creator" FOR EACH ROW EXECUTE FUNCTION "public"."create_creator_support_conversation"();



CREATE OR REPLACE TRIGGER "trg_fan_count" AFTER INSERT OR UPDATE ON "public"."fan_subscription" FOR EACH ROW EXECUTE FUNCTION "public"."update_creator_fan_count"();



CREATE OR REPLACE TRIGGER "trg_recipe_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."recipe" FOR EACH ROW EXECUTE FUNCTION "public"."update_creator_recipe_count"();



CREATE OR REPLACE TRIGGER "trg_recipe_development_version" BEFORE INSERT ON "public"."recipe_development" FOR EACH ROW EXECUTE FUNCTION "public"."set_recipe_development_version"();



CREATE OR REPLACE TRIGGER "trg_recipe_slug" BEFORE INSERT OR UPDATE ON "public"."recipe" FOR EACH ROW EXECUTE FUNCTION "public"."generate_recipe_slug"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."ai_conversation" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."community_group" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."conversation" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."creator" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."creator_balance" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."meal_plan" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."push_token" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."recipe" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."recipe_comment" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."recipe_macro" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."recipe_vector" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."shopping_list" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."subscription" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."user_cuisine_preference" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."user_health_profile" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."user_profile" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trg_updated_at" BEFORE UPDATE ON "public"."user_vector" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."ai_conversation"
    ADD CONSTRAINT "ai_conversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ai_message"
    ADD CONSTRAINT "ai_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_conversation"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_message"
    ADD CONSTRAINT "chat_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_message"
    ADD CONSTRAINT "chat_message_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."chat_message"
    ADD CONSTRAINT "chat_message_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."user_profile"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."community_group"
    ADD CONSTRAINT "community_group_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."user_profile"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversation"
    ADD CONSTRAINT "conversation_community_group_id_fkey" FOREIGN KEY ("community_group_id") REFERENCES "public"."community_group"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversation"
    ADD CONSTRAINT "conversation_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profile"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversation_participant"
    ADD CONSTRAINT "conversation_participant_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participant"
    ADD CONSTRAINT "conversation_participant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_request"
    ADD CONSTRAINT "conversation_request_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_request"
    ADD CONSTRAINT "conversation_request_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."creator_balance"
    ADD CONSTRAINT "creator_balance_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."creator_revenue_log"
    ADD CONSTRAINT "creator_revenue_log_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."creator_revenue_log"
    ADD CONSTRAINT "creator_revenue_log_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."creator"
    ADD CONSTRAINT "creator_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."daily_nutrition_log"
    ADD CONSTRAINT "daily_nutrition_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fan_external_recipe_counter"
    ADD CONSTRAINT "fan_external_recipe_counter_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."fan_subscription"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fan_subscription"
    ADD CONSTRAINT "fan_subscription_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fan_subscription_history"
    ADD CONSTRAINT "fan_subscription_history_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "public"."fan_subscription"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fan_subscription"
    ADD CONSTRAINT "fan_subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_member"
    ADD CONSTRAINT "group_member_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."community_group"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_member"
    ADD CONSTRAINT "group_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ingredient"
    ADD CONSTRAINT "ingredient_category_fkey" FOREIGN KEY ("category") REFERENCES "public"."ingredient_category"("code");



ALTER TABLE ONLY "public"."ingredient_submission"
    ADD CONSTRAINT "ingredient_submission_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ingredient_submission"
    ADD CONSTRAINT "ingredient_submission_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."user_profile"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meal_consumption"
    ADD CONSTRAINT "meal_consumption_meal_plan_entry_id_fkey" FOREIGN KEY ("meal_plan_entry_id") REFERENCES "public"."meal_plan_entry"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."meal_consumption"
    ADD CONSTRAINT "meal_consumption_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_consumption"
    ADD CONSTRAINT "meal_consumption_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_plan_entry"
    ADD CONSTRAINT "meal_plan_entry_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plan"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_plan_entry"
    ADD CONSTRAINT "meal_plan_entry_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_plan"
    ADD CONSTRAINT "meal_plan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."meal_reminder"
    ADD CONSTRAINT "meal_reminder_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification"
    ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payout"
    ADD CONSTRAINT "payout_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."push_token"
    ADD CONSTRAINT "push_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_comment"
    ADD CONSTRAINT "recipe_comment_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_comment"
    ADD CONSTRAINT "recipe_comment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe"
    ADD CONSTRAINT "recipe_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."creator"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recipe_development"
    ADD CONSTRAINT "recipe_development_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_image"
    ADD CONSTRAINT "recipe_image_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_impression"
    ADD CONSTRAINT "recipe_impression_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_impression"
    ADD CONSTRAINT "recipe_impression_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recipe_ingredient"
    ADD CONSTRAINT "recipe_ingredient_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id");



ALTER TABLE ONLY "public"."recipe_ingredient"
    ADD CONSTRAINT "recipe_ingredient_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_ingredient"
    ADD CONSTRAINT "recipe_ingredient_unit_fkey" FOREIGN KEY ("unit") REFERENCES "public"."measurement_unit"("code");



ALTER TABLE ONLY "public"."recipe_like"
    ADD CONSTRAINT "recipe_like_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_like"
    ADD CONSTRAINT "recipe_like_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_macro"
    ADD CONSTRAINT "recipe_macro_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_open"
    ADD CONSTRAINT "recipe_open_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_open"
    ADD CONSTRAINT "recipe_open_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."recipe"
    ADD CONSTRAINT "recipe_region_fkey" FOREIGN KEY ("region") REFERENCES "public"."food_region"("code");



ALTER TABLE ONLY "public"."recipe_save"
    ADD CONSTRAINT "recipe_save_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_save"
    ADD CONSTRAINT "recipe_save_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_step"
    ADD CONSTRAINT "recipe_step_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_tag"
    ADD CONSTRAINT "recipe_tag_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_tag"
    ADD CONSTRAINT "recipe_tag_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_translation"
    ADD CONSTRAINT "recipe_translation_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."recipe_vector"
    ADD CONSTRAINT "recipe_vector_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral"
    ADD CONSTRAINT "referral_referred_id_fkey" FOREIGN KEY ("referred_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."referral"
    ADD CONSTRAINT "referral_referrer_id_fkey" FOREIGN KEY ("referrer_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_list_item"
    ADD CONSTRAINT "shopping_list_item_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredient"("id");



ALTER TABLE ONLY "public"."shopping_list_item"
    ADD CONSTRAINT "shopping_list_item_shopping_list_id_fkey" FOREIGN KEY ("shopping_list_id") REFERENCES "public"."shopping_list"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_list_item"
    ADD CONSTRAINT "shopping_list_item_unit_fkey" FOREIGN KEY ("unit") REFERENCES "public"."measurement_unit"("code");



ALTER TABLE ONLY "public"."shopping_list"
    ADD CONSTRAINT "shopping_list_meal_plan_id_fkey" FOREIGN KEY ("meal_plan_id") REFERENCES "public"."meal_plan"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopping_list"
    ADD CONSTRAINT "shopping_list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."specialty"
    ADD CONSTRAINT "specialty_region_fkey" FOREIGN KEY ("region") REFERENCES "public"."food_region"("code");



ALTER TABLE ONLY "public"."subscription"
    ADD CONSTRAINT "subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_message"
    ADD CONSTRAINT "support_message_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_cuisine_preference"
    ADD CONSTRAINT "user_cuisine_preference_region_fkey" FOREIGN KEY ("region") REFERENCES "public"."food_region"("code");



ALTER TABLE ONLY "public"."user_cuisine_preference"
    ADD CONSTRAINT "user_cuisine_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_dietary_restriction"
    ADD CONSTRAINT "user_dietary_restriction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_goal"
    ADD CONSTRAINT "user_goal_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_health_profile"
    ADD CONSTRAINT "user_health_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profile"
    ADD CONSTRAINT "user_profile_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_vector"
    ADD CONSTRAINT "user_vector_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weight_log"
    ADD CONSTRAINT "weight_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profile"("id") ON DELETE CASCADE;



ALTER TABLE "public"."ai_conversation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ai_message" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow_select_food_region" ON "public"."food_region" FOR SELECT USING (true);



CREATE POLICY "authenticated insert impression" ON "public"."recipe_impression" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



CREATE POLICY "authenticated insert open" ON "public"."recipe_open" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") OR ("user_id" IS NULL)));



ALTER TABLE "public"."chat_message" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."community_group" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversation creator can add participants" ON "public"."conversation_participant" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversation"
  WHERE (("conversation"."id" = "conversation_participant"."conversation_id") AND ("conversation"."created_by" = "auth"."uid"())))));



CREATE POLICY "conversation creator can update" ON "public"."conversation" FOR UPDATE USING (("created_by" = "auth"."uid"())) WITH CHECK (("created_by" = "auth"."uid"()));



ALTER TABLE "public"."conversation_participant" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_request" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."creator" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "creator manages" ON "public"."recipe_macro" USING (("recipe_id" IN ( SELECT "r"."id"
   FROM ("public"."recipe" "r"
     JOIN "public"."creator" "c" ON (("r"."creator_id" = "c"."id")))
  WHERE ("c"."user_id" = "auth"."uid"()))));



CREATE POLICY "creator manages own" ON "public"."recipe" USING (("creator_id" IN ( SELECT "creator"."id"
   FROM "public"."creator"
  WHERE ("creator"."user_id" = "auth"."uid"()))));



CREATE POLICY "creator manages own" ON "public"."recipe_translation" USING (("recipe_id" IN ( SELECT "r"."id"
   FROM ("public"."recipe" "r"
     JOIN "public"."creator" "c" ON (("r"."creator_id" = "c"."id")))
  WHERE ("c"."user_id" = "auth"."uid"()))));



CREATE POLICY "creator manages own ingredients" ON "public"."recipe_ingredient" USING (("recipe_id" IN ( SELECT "r"."id"
   FROM ("public"."recipe" "r"
     JOIN "public"."creator" "c" ON (("r"."creator_id" = "c"."id")))
  WHERE ("c"."user_id" = "auth"."uid"()))));



CREATE POLICY "creator manages own steps" ON "public"."recipe_step" USING (("recipe_id" IN ( SELECT "r"."id"
   FROM ("public"."recipe" "r"
     JOIN "public"."creator" "c" ON (("r"."creator_id" = "c"."id")))
  WHERE ("c"."user_id" = "auth"."uid"()))));



CREATE POLICY "creator reads own" ON "public"."creator_balance" FOR SELECT USING (("creator_id" IN ( SELECT "creator"."id"
   FROM "public"."creator"
  WHERE ("creator"."user_id" = "auth"."uid"()))));



CREATE POLICY "creator reads own" ON "public"."creator_revenue_log" FOR SELECT USING (("creator_id" IN ( SELECT "creator"."id"
   FROM "public"."creator"
  WHERE ("creator"."user_id" = "auth"."uid"()))));



CREATE POLICY "creator reads own" ON "public"."payout" FOR SELECT USING (("creator_id" IN ( SELECT "creator"."id"
   FROM "public"."creator"
  WHERE ("creator"."user_id" = "auth"."uid"()))));



CREATE POLICY "creator reads own fans" ON "public"."fan_subscription" FOR SELECT USING (("creator_id" IN ( SELECT "creator"."id"
   FROM "public"."creator"
  WHERE ("creator"."user_id" = "auth"."uid"()))));



CREATE POLICY "creator reads own impressions" ON "public"."recipe_impression" FOR SELECT USING (("recipe_id" IN ( SELECT "r"."id"
   FROM ("public"."recipe" "r"
     JOIN "public"."creator" "c" ON (("r"."creator_id" = "c"."id")))
  WHERE ("c"."user_id" = "auth"."uid"()))));



CREATE POLICY "creator reads own opens" ON "public"."recipe_open" FOR SELECT USING (("recipe_id" IN ( SELECT "r"."id"
   FROM ("public"."recipe" "r"
     JOIN "public"."creator" "c" ON (("r"."creator_id" = "c"."id")))
  WHERE ("c"."user_id" = "auth"."uid"()))));



CREATE POLICY "creator reads own pending" ON "public"."ingredient" FOR SELECT USING ((("status" = 'pending'::"text") AND ("id" IN ( SELECT "ingredient_submission"."ingredient_id"
   FROM "public"."ingredient_submission"
  WHERE ("ingredient_submission"."submitted_by" = "auth"."uid"())))));



CREATE POLICY "creator submits" ON "public"."ingredient_submission" FOR INSERT WITH CHECK ((("auth"."uid"() = "submitted_by") AND ("auth"."uid"() IN ( SELECT "creator"."user_id"
   FROM "public"."creator"))));



ALTER TABLE "public"."creator_balance" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "creator_insert_own_recipe_development" ON "public"."recipe_development" FOR INSERT WITH CHECK (("recipe_id" IN ( SELECT "r"."id"
   FROM ("public"."recipe" "r"
     JOIN "public"."creator" "c" ON (("c"."id" = "r"."creator_id")))
  WHERE ("c"."user_id" = "auth"."uid"()))));



CREATE POLICY "creator_read_own_recipe_development" ON "public"."recipe_development" FOR SELECT USING (("recipe_id" IN ( SELECT "r"."id"
   FROM ("public"."recipe" "r"
     JOIN "public"."creator" "c" ON (("c"."id" = "r"."creator_id")))
  WHERE ("c"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."creator_revenue_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "creator_update_own_recipe_development" ON "public"."recipe_development" FOR UPDATE USING (("recipe_id" IN ( SELECT "r"."id"
   FROM ("public"."recipe" "r"
     JOIN "public"."creator" "c" ON (("c"."id" = "r"."creator_id")))
  WHERE ("c"."user_id" = "auth"."uid"()))));



CREATE POLICY "creators can create groups" ON "public"."community_group" FOR INSERT WITH CHECK ((("auth"."uid"() IN ( SELECT "creator"."user_id"
   FROM "public"."creator")) AND ("creator_id" = "auth"."uid"())));



CREATE POLICY "creators create conversations" ON "public"."conversation" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "creator"."user_id"
   FROM "public"."creator")));



ALTER TABLE "public"."daily_nutrition_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fan_external_recipe_counter" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fan_subscription" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fan_subscription_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."food_region" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."group_member" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ingredient" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ingredient_category" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ingredient_submission" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meal_consumption" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meal_plan" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meal_plan_entry" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meal_reminder" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."measurement_unit" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "member reads own membership" ON "public"."group_member" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "member reads private groups" ON "public"."community_group" FOR SELECT USING (("id" IN ( SELECT "group_member"."group_id"
   FROM "public"."group_member"
  WHERE ("group_member"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."notification" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "owner manages" ON "public"."creator" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner manages" ON "public"."fan_subscription" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner manages" ON "public"."recipe_comment" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner manages" ON "public"."recipe_like" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."ai_conversation" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."daily_nutrition_log" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."meal_consumption" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."meal_plan" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."meal_reminder" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."notification" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."push_token" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."recipe_save" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."shopping_list" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."subscription" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."user_cuisine_preference" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."user_dietary_restriction" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."user_goal" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."user_health_profile" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."user_vector" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner only" ON "public"."weight_log" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner reads own" ON "public"."referral" USING (("auth"."uid"() = "referrer_id"));



CREATE POLICY "owner reads own" ON "public"."support_message" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "owner update open" ON "public"."recipe_open" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "owner via conversation" ON "public"."ai_message" FOR SELECT USING (("conversation_id" IN ( SELECT "ai_conversation"."id"
   FROM "public"."ai_conversation"
  WHERE ("ai_conversation"."user_id" = "auth"."uid"()))));



CREATE POLICY "owner via meal_plan" ON "public"."meal_plan_entry" FOR SELECT USING (("meal_plan_id" IN ( SELECT "meal_plan"."id"
   FROM "public"."meal_plan"
  WHERE ("meal_plan"."user_id" = "auth"."uid"()))));



CREATE POLICY "owner via shopping_list" ON "public"."shopping_list_item" FOR SELECT USING (("shopping_list_id" IN ( SELECT "shopping_list"."id"
   FROM "public"."shopping_list"
  WHERE ("shopping_list"."user_id" = "auth"."uid"()))));



CREATE POLICY "participant can send message" ON "public"."chat_message" FOR INSERT WITH CHECK ((("sender_id" = "auth"."uid"()) AND ("conversation_id" IN ( SELECT "conversation_participant"."conversation_id"
   FROM "public"."conversation_participant"
  WHERE ("conversation_participant"."user_id" = "auth"."uid"())))));



CREATE POLICY "participant manages" ON "public"."conversation_participant" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "participant reads" ON "public"."chat_message" FOR SELECT USING ((("conversation_id" IN ( SELECT "conversation_participant"."conversation_id"
   FROM "public"."conversation_participant"
  WHERE ("conversation_participant"."user_id" = "auth"."uid"()))) OR ("group_id" IN ( SELECT "group_member"."group_id"
   FROM "public"."group_member"
  WHERE ("group_member"."user_id" = "auth"."uid"())))));



CREATE POLICY "participant reads" ON "public"."conversation" FOR SELECT USING (("id" IN ( SELECT "conversation_participant"."conversation_id"
   FROM "public"."conversation_participant"
  WHERE ("conversation_participant"."user_id" = "auth"."uid"()))));



CREATE POLICY "participants can close private conversation" ON "public"."conversation" FOR UPDATE USING ((("type" = 'private'::"text") AND ("id" IN ( SELECT "conversation_participant"."conversation_id"
   FROM "public"."conversation_participant"
  WHERE ("conversation_participant"."user_id" = "auth"."uid"()))))) WITH CHECK ((("type" = 'private'::"text") AND ("id" IN ( SELECT "conversation_participant"."conversation_id"
   FROM "public"."conversation_participant"
  WHERE ("conversation_participant"."user_id" = "auth"."uid"())))));



CREATE POLICY "participants read own conversations" ON "public"."conversation" FOR SELECT USING ((("id" IN ( SELECT "conversation_participant"."conversation_id"
   FROM "public"."conversation_participant"
  WHERE ("conversation_participant"."user_id" = "auth"."uid"()))) OR ("type" = 'creator_group'::"text")));



ALTER TABLE "public"."payout" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "public can read published recipes" ON "public"."recipe" FOR SELECT USING (("is_published" = true));



CREATE POLICY "public count reads" ON "public"."recipe_like" FOR SELECT USING (true);



CREATE POLICY "public reads" ON "public"."creator" FOR SELECT USING (true);



CREATE POLICY "public reads" ON "public"."food_region" FOR SELECT USING (true);



CREATE POLICY "public reads" ON "public"."ingredient_category" FOR SELECT USING (true);



CREATE POLICY "public reads" ON "public"."measurement_unit" FOR SELECT USING (true);



CREATE POLICY "public reads" ON "public"."recipe_comment" FOR SELECT USING (true);



CREATE POLICY "public reads" ON "public"."recipe_image" FOR SELECT USING (true);



CREATE POLICY "public reads" ON "public"."recipe_ingredient" FOR SELECT USING (true);



CREATE POLICY "public reads" ON "public"."recipe_macro" FOR SELECT USING (true);



CREATE POLICY "public reads" ON "public"."recipe_tag" FOR SELECT USING (true);



CREATE POLICY "public reads" ON "public"."recipe_translation" FOR SELECT USING (true);



CREATE POLICY "public reads" ON "public"."recipe_vector" FOR SELECT USING (true);



CREATE POLICY "public reads" ON "public"."specialty" FOR SELECT USING (true);



CREATE POLICY "public reads" ON "public"."tag" FOR SELECT USING (true);



CREATE POLICY "public reads minimal profile" ON "public"."user_profile" FOR SELECT USING (true);



CREATE POLICY "public reads public groups" ON "public"."community_group" FOR SELECT USING (("is_public" = true));



CREATE POLICY "public reads published" ON "public"."recipe" FOR SELECT USING (("is_published" = true));



CREATE POLICY "public reads published steps" ON "public"."recipe_step" FOR SELECT USING (("recipe_id" IN ( SELECT "recipe"."id"
   FROM "public"."recipe"
  WHERE ("recipe"."is_published" = true))));



CREATE POLICY "public reads validated" ON "public"."ingredient" FOR SELECT USING (("status" = 'validated'::"text"));



ALTER TABLE "public"."push_token" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "recipe owner manages images" ON "public"."recipe_image" USING (("recipe_id" IN ( SELECT "r"."id"
   FROM ("public"."recipe" "r"
     JOIN "public"."creator" "c" ON (("r"."creator_id" = "c"."id")))
  WHERE ("c"."user_id" = "auth"."uid"())))) WITH CHECK (("recipe_id" IN ( SELECT "r"."id"
   FROM ("public"."recipe" "r"
     JOIN "public"."creator" "c" ON (("r"."creator_id" = "c"."id")))
  WHERE ("c"."user_id" = "auth"."uid"()))));



CREATE POLICY "recipe owner manages tags" ON "public"."recipe_tag" USING (("recipe_id" IN ( SELECT "r"."id"
   FROM ("public"."recipe" "r"
     JOIN "public"."creator" "c" ON (("r"."creator_id" = "c"."id")))
  WHERE ("c"."user_id" = "auth"."uid"())))) WITH CHECK (("recipe_id" IN ( SELECT "r"."id"
   FROM ("public"."recipe" "r"
     JOIN "public"."creator" "c" ON (("r"."creator_id" = "c"."id")))
  WHERE ("c"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."recipe_comment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_development" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_image" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_impression" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_ingredient" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_like" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_macro" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_open" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_save" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_step" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_tag" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_translation" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."recipe_vector" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."referral" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "requester or recipient" ON "public"."conversation_request" FOR SELECT USING ((("auth"."uid"() = "requester_id") OR ("auth"."uid"() = "recipient_id")));



ALTER TABLE "public"."shopping_list" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."shopping_list_item" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."specialty" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "submitter reads own" ON "public"."ingredient_submission" FOR SELECT USING (("auth"."uid"() = "submitted_by"));



ALTER TABLE "public"."subscription" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_message" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tag" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user reads own profile" ON "public"."user_profile" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "user updates own profile" ON "public"."user_profile" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."user_cuisine_preference" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_dietary_restriction" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_goal" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_health_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profile" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_vector" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "via subscription" ON "public"."fan_external_recipe_counter" FOR SELECT USING (("subscription_id" IN ( SELECT "fan_subscription"."id"
   FROM "public"."fan_subscription"
  WHERE ("fan_subscription"."user_id" = "auth"."uid"()))));



CREATE POLICY "via subscription" ON "public"."fan_subscription_history" FOR SELECT USING (("subscription_id" IN ( SELECT "fan_subscription"."id"
   FROM "public"."fan_subscription"
  WHERE ("fan_subscription"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."weight_log" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";












GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_out"("public"."gtrgm") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_out"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_send"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_out"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_send"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_in"("cstring", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_out"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_recv"("internal", "oid", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_send"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_typmod_in"("cstring"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(real[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(double precision[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(integer[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_halfvec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_sparsevec"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_to_vector"(numeric[], integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_float4"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_sparsevec"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_to_vector"("public"."halfvec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_halfvec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_to_vector"("public"."sparsevec", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_float4"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_halfvec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_to_sparsevec"("public"."vector", integer, boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector"("public"."vector", integer, boolean) TO "service_role";














































































































































































GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."binary_quantize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_recipe_macros"("p_recipe_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_recipe_macros"("p_recipe_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_recipe_macros"("p_recipe_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cosine_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_creator_support_conversation"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_creator_support_conversation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_creator_support_conversation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_group_conversation"("p_name" "text", "p_is_public" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."create_group_conversation"("p_name" "text", "p_is_public" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_group_conversation"("p_name" "text", "p_is_public" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_recipe_slug"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_recipe_slug"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_recipe_slug"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_creator_by_username"("p_username" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_creator_by_username"("p_username" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_creator_by_username"("p_username" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_query_trgm"("text", "internal", smallint, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_extract_value_trgm"("text", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_consistent"("internal", smallint, "text", integer, "internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gin_trgm_triconsistent"("internal", smallint, "text", integer, "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_distance"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_options"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_same"("public"."gtrgm", "public"."gtrgm", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gtrgm_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_accum"(double precision[], "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_add"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_cmp"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_concat"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_eq"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ge"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_gt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_l2_squared_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_le"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_lt"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_mul"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_ne"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_negative_inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_spherical_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."halfvec_sub"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."hamming_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnsw_sparsevec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."hnswhandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_bit_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflat_halfvec_support"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ivfflathandler"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "postgres";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "anon";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "authenticated";
GRANT ALL ON FUNCTION "public"."jaccard_distance"(bit, bit) TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l1_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."halfvec", "public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_norm"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."l2_normalize"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "postgres";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "anon";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_limit"(real) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_recipe_development_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_recipe_development_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_recipe_development_version"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_limit"() TO "postgres";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_limit"() TO "service_role";



GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."show_trgm"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_dist"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_cmp"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_eq"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ge"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_gt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_l2_squared_distance"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_le"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_lt"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_ne"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "anon";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sparsevec_negative_inner_product"("public"."sparsevec", "public"."sparsevec") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strict_word_similarity_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."halfvec", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."subvector"("public"."vector", integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent"("regdictionary", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_init"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unaccent_lexize"("internal", "internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_creator_fan_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_creator_fan_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_creator_fan_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_creator_recipe_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_creator_recipe_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_creator_recipe_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_accum"(double precision[], "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_add"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_avg"(double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_cmp"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "anon";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_combine"(double precision[], double precision[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_concat"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_dims"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_eq"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ge"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_gt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_l2_squared_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_le"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_lt"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_mul"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_ne"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_negative_inner_product"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_norm"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_spherical_distance"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."vector_sub"("public"."vector", "public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_commutator_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_dist_op"("text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."word_similarity_op"("text", "text") TO "service_role";












GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."avg"("public"."vector") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."halfvec") TO "service_role";



GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "postgres";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "anon";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "authenticated";
GRANT ALL ON FUNCTION "public"."sum"("public"."vector") TO "service_role";















GRANT ALL ON TABLE "public"."ai_conversation" TO "anon";
GRANT ALL ON TABLE "public"."ai_conversation" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_conversation" TO "service_role";



GRANT ALL ON TABLE "public"."ai_message" TO "anon";
GRANT ALL ON TABLE "public"."ai_message" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_message" TO "service_role";



GRANT ALL ON TABLE "public"."chat_message" TO "anon";
GRANT ALL ON TABLE "public"."chat_message" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_message" TO "service_role";



GRANT ALL ON TABLE "public"."community_group" TO "anon";
GRANT ALL ON TABLE "public"."community_group" TO "authenticated";
GRANT ALL ON TABLE "public"."community_group" TO "service_role";



GRANT ALL ON TABLE "public"."conversation" TO "anon";
GRANT ALL ON TABLE "public"."conversation" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participant" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participant" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participant" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_request" TO "anon";
GRANT ALL ON TABLE "public"."conversation_request" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_request" TO "service_role";



GRANT ALL ON TABLE "public"."creator" TO "anon";
GRANT ALL ON TABLE "public"."creator" TO "authenticated";
GRANT ALL ON TABLE "public"."creator" TO "service_role";



GRANT ALL ON TABLE "public"."creator_balance" TO "anon";
GRANT ALL ON TABLE "public"."creator_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_balance" TO "service_role";



GRANT ALL ON TABLE "public"."creator_revenue_log" TO "anon";
GRANT ALL ON TABLE "public"."creator_revenue_log" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_revenue_log" TO "service_role";



GRANT ALL ON TABLE "public"."creator_dashboard_stats" TO "anon";
GRANT ALL ON TABLE "public"."creator_dashboard_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_dashboard_stats" TO "service_role";



GRANT ALL ON TABLE "public"."creator_public_profile" TO "anon";
GRANT ALL ON TABLE "public"."creator_public_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."creator_public_profile" TO "service_role";



GRANT ALL ON TABLE "public"."daily_nutrition_log" TO "anon";
GRANT ALL ON TABLE "public"."daily_nutrition_log" TO "authenticated";
GRANT ALL ON TABLE "public"."daily_nutrition_log" TO "service_role";



GRANT ALL ON TABLE "public"."fan_external_recipe_counter" TO "anon";
GRANT ALL ON TABLE "public"."fan_external_recipe_counter" TO "authenticated";
GRANT ALL ON TABLE "public"."fan_external_recipe_counter" TO "service_role";



GRANT ALL ON TABLE "public"."fan_subscription" TO "anon";
GRANT ALL ON TABLE "public"."fan_subscription" TO "authenticated";
GRANT ALL ON TABLE "public"."fan_subscription" TO "service_role";



GRANT ALL ON TABLE "public"."fan_subscription_history" TO "anon";
GRANT ALL ON TABLE "public"."fan_subscription_history" TO "authenticated";
GRANT ALL ON TABLE "public"."fan_subscription_history" TO "service_role";



GRANT ALL ON TABLE "public"."food_region" TO "anon";
GRANT ALL ON TABLE "public"."food_region" TO "authenticated";
GRANT ALL ON TABLE "public"."food_region" TO "service_role";



GRANT ALL ON TABLE "public"."group_member" TO "anon";
GRANT ALL ON TABLE "public"."group_member" TO "authenticated";
GRANT ALL ON TABLE "public"."group_member" TO "service_role";



GRANT ALL ON TABLE "public"."ingredient" TO "anon";
GRANT ALL ON TABLE "public"."ingredient" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredient" TO "service_role";



GRANT ALL ON TABLE "public"."ingredient_category" TO "anon";
GRANT ALL ON TABLE "public"."ingredient_category" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredient_category" TO "service_role";



GRANT ALL ON TABLE "public"."ingredient_submission" TO "anon";
GRANT ALL ON TABLE "public"."ingredient_submission" TO "authenticated";
GRANT ALL ON TABLE "public"."ingredient_submission" TO "service_role";



GRANT ALL ON TABLE "public"."meal_consumption" TO "anon";
GRANT ALL ON TABLE "public"."meal_consumption" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_consumption" TO "service_role";



GRANT ALL ON TABLE "public"."meal_plan" TO "anon";
GRANT ALL ON TABLE "public"."meal_plan" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_plan" TO "service_role";



GRANT ALL ON TABLE "public"."meal_plan_entry" TO "anon";
GRANT ALL ON TABLE "public"."meal_plan_entry" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_plan_entry" TO "service_role";



GRANT ALL ON TABLE "public"."meal_reminder" TO "anon";
GRANT ALL ON TABLE "public"."meal_reminder" TO "authenticated";
GRANT ALL ON TABLE "public"."meal_reminder" TO "service_role";



GRANT ALL ON TABLE "public"."measurement_unit" TO "anon";
GRANT ALL ON TABLE "public"."measurement_unit" TO "authenticated";
GRANT ALL ON TABLE "public"."measurement_unit" TO "service_role";



GRANT ALL ON TABLE "public"."notification" TO "anon";
GRANT ALL ON TABLE "public"."notification" TO "authenticated";
GRANT ALL ON TABLE "public"."notification" TO "service_role";



GRANT ALL ON TABLE "public"."payout" TO "anon";
GRANT ALL ON TABLE "public"."payout" TO "authenticated";
GRANT ALL ON TABLE "public"."payout" TO "service_role";



GRANT ALL ON TABLE "public"."push_token" TO "anon";
GRANT ALL ON TABLE "public"."push_token" TO "authenticated";
GRANT ALL ON TABLE "public"."push_token" TO "service_role";



GRANT ALL ON TABLE "public"."recipe" TO "anon";
GRANT ALL ON TABLE "public"."recipe" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_comment" TO "anon";
GRANT ALL ON TABLE "public"."recipe_comment" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_comment" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_development" TO "anon";
GRANT ALL ON TABLE "public"."recipe_development" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_development" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_image" TO "anon";
GRANT ALL ON TABLE "public"."recipe_image" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_image" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_impression" TO "anon";
GRANT ALL ON TABLE "public"."recipe_impression" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_impression" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_ingredient" TO "anon";
GRANT ALL ON TABLE "public"."recipe_ingredient" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_ingredient" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_like" TO "anon";
GRANT ALL ON TABLE "public"."recipe_like" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_like" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_macro" TO "anon";
GRANT ALL ON TABLE "public"."recipe_macro" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_macro" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_open" TO "anon";
GRANT ALL ON TABLE "public"."recipe_open" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_open" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_performance_summary" TO "anon";
GRANT ALL ON TABLE "public"."recipe_performance_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_performance_summary" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_save" TO "anon";
GRANT ALL ON TABLE "public"."recipe_save" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_save" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_step" TO "anon";
GRANT ALL ON TABLE "public"."recipe_step" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_step" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_tag" TO "anon";
GRANT ALL ON TABLE "public"."recipe_tag" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_tag" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_translation" TO "anon";
GRANT ALL ON TABLE "public"."recipe_translation" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_translation" TO "service_role";



GRANT ALL ON TABLE "public"."recipe_vector" TO "anon";
GRANT ALL ON TABLE "public"."recipe_vector" TO "authenticated";
GRANT ALL ON TABLE "public"."recipe_vector" TO "service_role";



GRANT ALL ON TABLE "public"."referral" TO "anon";
GRANT ALL ON TABLE "public"."referral" TO "authenticated";
GRANT ALL ON TABLE "public"."referral" TO "service_role";



GRANT ALL ON TABLE "public"."shopping_list" TO "anon";
GRANT ALL ON TABLE "public"."shopping_list" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_list" TO "service_role";



GRANT ALL ON TABLE "public"."shopping_list_item" TO "anon";
GRANT ALL ON TABLE "public"."shopping_list_item" TO "authenticated";
GRANT ALL ON TABLE "public"."shopping_list_item" TO "service_role";



GRANT ALL ON TABLE "public"."specialty" TO "anon";
GRANT ALL ON TABLE "public"."specialty" TO "authenticated";
GRANT ALL ON TABLE "public"."specialty" TO "service_role";



GRANT ALL ON TABLE "public"."subscription" TO "anon";
GRANT ALL ON TABLE "public"."subscription" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription" TO "service_role";



GRANT ALL ON TABLE "public"."support_message" TO "anon";
GRANT ALL ON TABLE "public"."support_message" TO "authenticated";
GRANT ALL ON TABLE "public"."support_message" TO "service_role";



GRANT ALL ON TABLE "public"."sync_log" TO "anon";
GRANT ALL ON TABLE "public"."sync_log" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_log" TO "service_role";



GRANT ALL ON TABLE "public"."tag" TO "anon";
GRANT ALL ON TABLE "public"."tag" TO "authenticated";
GRANT ALL ON TABLE "public"."tag" TO "service_role";



GRANT ALL ON TABLE "public"."user_cuisine_preference" TO "anon";
GRANT ALL ON TABLE "public"."user_cuisine_preference" TO "authenticated";
GRANT ALL ON TABLE "public"."user_cuisine_preference" TO "service_role";



GRANT ALL ON TABLE "public"."user_dietary_restriction" TO "anon";
GRANT ALL ON TABLE "public"."user_dietary_restriction" TO "authenticated";
GRANT ALL ON TABLE "public"."user_dietary_restriction" TO "service_role";



GRANT ALL ON TABLE "public"."user_goal" TO "anon";
GRANT ALL ON TABLE "public"."user_goal" TO "authenticated";
GRANT ALL ON TABLE "public"."user_goal" TO "service_role";



GRANT ALL ON TABLE "public"."user_health_profile" TO "anon";
GRANT ALL ON TABLE "public"."user_health_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."user_health_profile" TO "service_role";



GRANT ALL ON TABLE "public"."user_profile" TO "anon";
GRANT ALL ON TABLE "public"."user_profile" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profile" TO "service_role";



GRANT ALL ON TABLE "public"."user_vector" TO "anon";
GRANT ALL ON TABLE "public"."user_vector" TO "authenticated";
GRANT ALL ON TABLE "public"."user_vector" TO "service_role";



GRANT ALL ON TABLE "public"."weight_log" TO "anon";
GRANT ALL ON TABLE "public"."weight_log" TO "authenticated";
GRANT ALL ON TABLE "public"."weight_log" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































