-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.tag (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  name_fr text,
  name_en text,
  name_es text,
  name_pt text,
  created_at timestamp with time zone DEFAULT now(),
  name_ar text,
  CONSTRAINT tag_pkey PRIMARY KEY (id)
);
CREATE TABLE public.food_region (
  code text NOT NULL,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  name_es text,
  name_pt text,
  created_at timestamp with time zone DEFAULT now(),
  name_ar text,
  CONSTRAINT food_region_pkey PRIMARY KEY (code)
);
CREATE TABLE public.ingredient_category (
  code text NOT NULL,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  name_ar text,
  CONSTRAINT ingredient_category_pkey PRIMARY KEY (code)
);
CREATE TABLE public.measurement_unit (
  code text NOT NULL,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  name_es text,
  name_pt text,
  created_at timestamp with time zone DEFAULT now(),
  name_ar text,
  CONSTRAINT measurement_unit_pkey PRIMARY KEY (code)
);
CREATE TABLE public.user_profile (
  id uuid NOT NULL,
  username text UNIQUE,
  first_name text,
  last_name text,
  avatar_url text,
  locale text DEFAULT 'fr'::text,
  is_creator boolean DEFAULT false,
  onboarding_done boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  batch_cooking_enabled boolean NOT NULL DEFAULT false,
  modular_meal_enabled boolean NOT NULL DEFAULT false,
  referral_code text DEFAULT ('AKELI-'::text || upper("substring"((gen_random_uuid())::text, 1, 6))) UNIQUE,
  consent_privacy_at timestamp with time zone,
  consent_cgu_at timestamp with time zone,
  batch_cooking_max_portions integer NOT NULL DEFAULT 4 CHECK (batch_cooking_max_portions >= 2 AND batch_cooking_max_portions <= 7),
  is_private boolean NOT NULL DEFAULT false,
  bio text,
  notification_prefs jsonb NOT NULL DEFAULT '{"chat": true, "push": true, "dm_requests": true, "meal_reminders": false}'::jsonb,
  CONSTRAINT user_profile_pkey PRIMARY KEY (id),
  CONSTRAINT user_profile_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_health_profile (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  sex text CHECK (sex = ANY (ARRAY['male'::text, 'female'::text, 'other'::text])),
  birth_date date,
  height_cm numeric,
  weight_kg numeric,
  target_weight_kg numeric,
  activity_level text CHECK (activity_level = ANY (ARRAY['sedentary'::text, 'light'::text, 'moderate'::text, 'active'::text, 'very_active'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  weight_goal text CHECK (weight_goal = ANY (ARRAY['loss'::text, 'maintenance'::text, 'gain'::text])),
  muscle_goal text CHECK (muscle_goal = ANY (ARRAY['loss'::text, 'maintenance'::text, 'gain'::text])),
  cooking_time text CHECK (cooking_time = ANY (ARRAY['quick'::text, 'medium'::text, 'any'::text])),
  starting_weight_kg numeric,
  target_time_weeks integer,
  CONSTRAINT user_health_profile_pkey PRIMARY KEY (id),
  CONSTRAINT user_health_profile_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.user_goal (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  goal_type text CHECK (goal_type = ANY (ARRAY['weight_loss'::text, 'muscle_gain'::text, 'maintenance'::text, 'health'::text, 'performance'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  calorie_goal numeric,
  protein_goal numeric,
  carbs_goal numeric,
  fat_goal numeric,
  CONSTRAINT user_goal_pkey PRIMARY KEY (id),
  CONSTRAINT user_goal_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.user_dietary_restriction (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  restriction text CHECK (restriction = ANY (ARRAY['vegetarian'::text, 'vegan'::text, 'pescatarian'::text, 'halal'::text, 'kosher'::text, 'gluten_free'::text, 'lactose_free'::text, 'nut_free'::text, 'low_sodium'::text, 'diabetic_friendly'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_dietary_restriction_pkey PRIMARY KEY (id),
  CONSTRAINT user_dietary_restriction_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.user_cuisine_preference (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  region text,
  preference_score numeric DEFAULT 1.0 CHECK (preference_score >= 0::numeric AND preference_score <= 1::numeric),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_cuisine_preference_pkey PRIMARY KEY (id),
  CONSTRAINT user_cuisine_preference_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id),
  CONSTRAINT user_cuisine_preference_region_fkey FOREIGN KEY (region) REFERENCES public.food_region(code)
);
CREATE TABLE public.weight_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  weight_kg numeric NOT NULL,
  logged_at date DEFAULT CURRENT_DATE,
  note text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT weight_log_pkey PRIMARY KEY (id),
  CONSTRAINT weight_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.creator (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  display_name text NOT NULL,
  bio text,
  profile_image_url text,
  specialties ARRAY,
  recipe_count integer DEFAULT 0,
  fan_count integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  username text UNIQUE CHECK (username ~ '^[a-z0-9_-]{3,30}$'::text),
  instagram_handle text,
  tiktok_handle text,
  youtube_handle text,
  website_url text,
  specialty_codes ARRAY,
  language_codes ARRAY,
  heritage_region text,
  stripe_account_id text,
  stripe_onboarding_complete boolean DEFAULT false,
  average_rating numeric NOT NULL DEFAULT 0,
  CONSTRAINT creator_pkey PRIMARY KEY (id),
  CONSTRAINT creator_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.ingredient (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_fr text,
  name_en text,
  name_es text,
  name_pt text,
  category text,
  calories_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'validated'::text CHECK (status = ANY (ARRAY['pending'::text, 'validated'::text])),
  tags ARRAY DEFAULT '{}'::text[],
  name_ar text,
  image_url text,
  description_fr text,
  description_en text,
  description_ar text,
  description_es text,
  description_pt text,
  avg_weight_g numeric,
  CONSTRAINT ingredient_pkey PRIMARY KEY (id),
  CONSTRAINT ingredient_category_fkey FOREIGN KEY (category) REFERENCES public.ingredient_category(code)
);
CREATE TABLE public.recipe (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  creator_id uuid,
  title text NOT NULL,
  description text,
  region text,
  difficulty text CHECK (difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text])),
  prep_time_min integer,
  cook_time_min integer,
  servings integer DEFAULT 1,
  is_published boolean DEFAULT false,
  language text DEFAULT 'fr'::text,
  cover_image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  slug text UNIQUE,
  draft_data jsonb,
  is_pork_free boolean DEFAULT false,
  tags ARRAY DEFAULT '{}'::text[],
  parent_recipe_id uuid,
  variant_type text,
  substitution_notes text,
  is_private boolean NOT NULL DEFAULT false,
  owner_user_id uuid,
  compatible_starches ARRAY NOT NULL DEFAULT '{}'::uuid[],
  meal_types ARRAY DEFAULT '{breakfast,lunch,dinner,snack}'::text[],
  total_time_min integer DEFAULT (prep_time_min + cook_time_min),
  preferred_meal_type text NOT NULL DEFAULT 'any'::text CHECK (preferred_meal_type = ANY (ARRAY['breakfast'::text, 'lunch'::text, 'dinner'::text, 'snack'::text, 'any'::text])),
  average_rating numeric NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  save_count integer NOT NULL DEFAULT 0,
  average_rating_taste numeric NOT NULL DEFAULT 0,
  average_rating_ease numeric NOT NULL DEFAULT 0,
  average_rating_satiety numeric NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  allergen_tags ARRAY DEFAULT '{}'::text[],
  CONSTRAINT recipe_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.user_profile(id),
  CONSTRAINT recipe_parent_recipe_id_fkey FOREIGN KEY (parent_recipe_id) REFERENCES public.recipe(id),
  CONSTRAINT recipe_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator(id),
  CONSTRAINT recipe_region_fkey FOREIGN KEY (region) REFERENCES public.food_region(code)
);
CREATE TABLE public.recipe_macro (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_id uuid UNIQUE,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sodium_mg numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  total_weight_g numeric,
  calories_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  CONSTRAINT recipe_macro_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_macro_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.recipe_ingredient (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_id uuid,
  ingredient_id uuid,
  quantity numeric,
  unit text,
  is_optional boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  title text,
  is_section_header boolean NOT NULL DEFAULT false,
  CONSTRAINT recipe_ingredient_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_ingredient_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id),
  CONSTRAINT recipe_ingredient_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredient(id),
  CONSTRAINT recipe_ingredient_unit_fkey FOREIGN KEY (unit) REFERENCES public.measurement_unit(code)
);
CREATE TABLE public.recipe_tag (
  recipe_id uuid NOT NULL,
  tag_id uuid NOT NULL,
  CONSTRAINT recipe_tag_pkey PRIMARY KEY (recipe_id, tag_id),
  CONSTRAINT recipe_tag_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id),
  CONSTRAINT recipe_tag_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tag(id)
);
CREATE TABLE public.recipe_image (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_id uuid,
  url text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recipe_image_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_image_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.recipe_like (
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recipe_like_pkey PRIMARY KEY (user_id, recipe_id),
  CONSTRAINT recipe_like_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id),
  CONSTRAINT recipe_like_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.recipe_comment (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_id uuid,
  user_id uuid,
  content text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  rating_taste integer CHECK (rating_taste >= 1 AND rating_taste <= 5),
  rating_ease integer CHECK (rating_ease >= 1 AND rating_ease <= 5),
  rating_satiety integer CHECK (rating_satiety >= 1 AND rating_satiety <= 5),
  CONSTRAINT recipe_comment_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_comment_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id),
  CONSTRAINT recipe_comment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.user_vector (
  user_id uuid NOT NULL,
  vector USER-DEFINED NOT NULL,
  last_computed timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_vector_pkey PRIMARY KEY (user_id),
  CONSTRAINT user_vector_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.recipe_vector (
  recipe_id uuid NOT NULL,
  vector USER-DEFINED NOT NULL,
  last_computed timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recipe_vector_pkey PRIMARY KEY (recipe_id),
  CONSTRAINT recipe_vector_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.meal_plan (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meal_plan_pkey PRIMARY KEY (id),
  CONSTRAINT meal_plan_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.meal_plan_entry (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  meal_plan_id uuid,
  scheduled_date date NOT NULL,
  meal_type text CHECK (meal_type = ANY (ARRAY['breakfast'::text, 'lunch'::text, 'dinner'::text, 'snack'::text])),
  servings numeric DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  custom_meal_name text,
  custom_calories numeric,
  custom_protein_g numeric,
  custom_carbs_g numeric,
  custom_fat_g numeric,
  is_custom_meal boolean NOT NULL DEFAULT false,
  calories_computed numeric,
  protein_g_computed numeric,
  carbs_g_computed numeric,
  fat_g_computed numeric,
  is_consumed boolean NOT NULL DEFAULT false,
  consumed_at timestamp with time zone,
  CONSTRAINT meal_plan_entry_pkey PRIMARY KEY (id),
  CONSTRAINT meal_plan_entry_meal_plan_id_fkey FOREIGN KEY (meal_plan_id) REFERENCES public.meal_plan(id)
);
CREATE TABLE public.meal_consumption (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  recipe_id uuid,
  meal_plan_entry_id uuid,
  consumed_at timestamp with time zone DEFAULT now(),
  servings integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  consumed_date date DEFAULT ((consumed_at AT TIME ZONE 'UTC'::text))::date,
  consumption_value numeric NOT NULL DEFAULT 1.0,
  component_id uuid,
  creator_id uuid,
  scheduled_date date,
  CONSTRAINT meal_consumption_pkey PRIMARY KEY (id),
  CONSTRAINT meal_consumption_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id),
  CONSTRAINT meal_consumption_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id),
  CONSTRAINT meal_consumption_meal_plan_entry_id_fkey FOREIGN KEY (meal_plan_entry_id) REFERENCES public.meal_plan_entry(id),
  CONSTRAINT meal_consumption_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.meal_plan_entry_component(id),
  CONSTRAINT meal_consumption_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator(id)
);
CREATE TABLE public.shopping_list (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  meal_plan_id uuid UNIQUE,
  name text,
  is_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shopping_list_pkey PRIMARY KEY (id),
  CONSTRAINT shopping_list_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id),
  CONSTRAINT shopping_list_meal_plan_id_fkey FOREIGN KEY (meal_plan_id) REFERENCES public.meal_plan(id)
);
CREATE TABLE public.shopping_list_item (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  shopping_list_id uuid,
  ingredient_id uuid,
  custom_name text,
  quantity numeric NOT NULL,
  unit text,
  is_checked boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shopping_list_item_pkey PRIMARY KEY (id),
  CONSTRAINT shopping_list_item_shopping_list_id_fkey FOREIGN KEY (shopping_list_id) REFERENCES public.shopping_list(id),
  CONSTRAINT shopping_list_item_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredient(id),
  CONSTRAINT shopping_list_item_unit_fkey FOREIGN KEY (unit) REFERENCES public.measurement_unit(code)
);
CREATE TABLE public.daily_nutrition_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  log_date date NOT NULL,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  updated_at timestamp with time zone DEFAULT now(),
  fiber_g numeric DEFAULT 0,
  meals_count integer DEFAULT 0,
  water_ml numeric DEFAULT 0,
  CONSTRAINT daily_nutrition_log_pkey PRIMARY KEY (id),
  CONSTRAINT daily_nutrition_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.meal_reminder (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  meal_type text CHECK (meal_type = ANY (ARRAY['breakfast'::text, 'lunch'::text, 'dinner'::text, 'snack'::text])),
  reminder_time time without time zone NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meal_reminder_pkey PRIMARY KEY (id),
  CONSTRAINT meal_reminder_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.fan_subscription (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  creator_id uuid,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'cancelled'::text])),
  subscribed_at timestamp with time zone DEFAULT now(),
  cancelled_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fan_subscription_pkey PRIMARY KEY (id),
  CONSTRAINT fan_subscription_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id),
  CONSTRAINT fan_subscription_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator(id)
);
CREATE TABLE public.fan_subscription_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subscription_id uuid,
  status text NOT NULL,
  changed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fan_subscription_history_pkey PRIMARY KEY (id),
  CONSTRAINT fan_subscription_history_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.fan_subscription(id)
);
CREATE TABLE public.creator_revenue_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  creator_id uuid,
  recipe_id uuid,
  revenue_type text NOT NULL CHECK (revenue_type = ANY (ARRAY['consumption'::text, 'fan_mode'::text])),
  amount numeric NOT NULL,
  logged_at date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT creator_revenue_log_pkey PRIMARY KEY (id),
  CONSTRAINT creator_revenue_log_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator(id),
  CONSTRAINT creator_revenue_log_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.creator_balance (
  creator_id uuid NOT NULL,
  available_balance numeric DEFAULT 0,
  pending_balance numeric DEFAULT 0,
  lifetime_earnings numeric DEFAULT 0,
  last_payout_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT creator_balance_pkey PRIMARY KEY (creator_id),
  CONSTRAINT creator_balance_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator(id)
);
CREATE TABLE public.payout (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  creator_id uuid,
  amount numeric NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
  stripe_payout_id text,
  requested_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  stripe_transfer_id text,
  CONSTRAINT payout_pkey PRIMARY KEY (id),
  CONSTRAINT payout_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator(id)
);
CREATE TABLE public.subscription (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  status text DEFAULT 'trialing'::text CHECK (status = ANY (ARRAY['active'::text, 'cancelled'::text, 'past_due'::text, 'trialing'::text])),
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscription_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.conversation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  type text DEFAULT 'private'::text CHECK (type = ANY (ARRAY['private'::text, 'creator_group'::text, 'support'::text])),
  name text,
  created_by uuid,
  is_support_open boolean DEFAULT false,
  community_group_id uuid,
  closed_at timestamp with time zone,
  CONSTRAINT conversation_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_community_group_id_fkey FOREIGN KEY (community_group_id) REFERENCES public.community_group(id),
  CONSTRAINT conversation_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profile(id)
);
CREATE TABLE public.conversation_participant (
  conversation_id uuid NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  last_read_at timestamp with time zone,
  CONSTRAINT conversation_participant_pkey PRIMARY KEY (conversation_id, user_id),
  CONSTRAINT conversation_participant_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversation(id),
  CONSTRAINT conversation_participant_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.chat_message (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid,
  group_id uuid,
  sender_id uuid,
  content text NOT NULL,
  message_type text DEFAULT 'text'::text CHECK (message_type = ANY (ARRAY['text'::text, 'image'::text, 'recipe_share'::text])),
  recipe_id uuid,
  sent_at timestamp with time zone DEFAULT now(),
  caption text,
  CONSTRAINT chat_message_pkey PRIMARY KEY (id),
  CONSTRAINT chat_message_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversation(id),
  CONSTRAINT chat_message_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user_profile(id),
  CONSTRAINT chat_message_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.community_group (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cover_url text,
  creator_id uuid,
  is_public boolean DEFAULT true,
  member_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  region_code text,
  language text,
  topic text CHECK (topic = ANY (ARRAY['cuisine_africaine'::text, 'batch_cooking'::text, 'nutrition'::text, 'sport_forme'::text, 'perte_de_poids'::text, 'vegetarien'::text, 'autre'::text])),
  max_members integer,
  CONSTRAINT community_group_pkey PRIMARY KEY (id),
  CONSTRAINT community_group_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.user_profile(id),
  CONSTRAINT community_group_region_code_fkey FOREIGN KEY (region_code) REFERENCES public.food_region(code)
);
CREATE TABLE public.group_member (
  group_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text CHECK (role = ANY (ARRAY['admin'::text, 'member'::text])),
  joined_at timestamp with time zone DEFAULT now(),
  last_read_at timestamp with time zone,
  CONSTRAINT group_member_pkey PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_member_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.community_group(id),
  CONSTRAINT group_member_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.conversation_request (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  requester_id uuid,
  recipient_id uuid,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])),
  message text,
  created_at timestamp with time zone DEFAULT now(),
  responded_at timestamp with time zone,
  CONSTRAINT conversation_request_pkey PRIMARY KEY (id),
  CONSTRAINT conversation_request_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.user_profile(id),
  CONSTRAINT conversation_request_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.notification (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_pkey PRIMARY KEY (id),
  CONSTRAINT notification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.push_token (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  token text NOT NULL UNIQUE,
  platform text CHECK (platform = ANY (ARRAY['ios'::text, 'android'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_token_pkey PRIMARY KEY (id),
  CONSTRAINT push_token_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.referral (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  referrer_id uuid,
  referred_id uuid UNIQUE,
  referral_code text NOT NULL,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'converted'::text])),
  converted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT referral_pkey PRIMARY KEY (id),
  CONSTRAINT referral_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES public.user_profile(id),
  CONSTRAINT referral_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.support_message (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  subject text,
  content text NOT NULL,
  status text DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text])),
  created_at timestamp with time zone DEFAULT now(),
  screenshot_url text,
  CONSTRAINT support_message_pkey PRIMARY KEY (id),
  CONSTRAINT support_message_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.ai_conversation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_conversation_pkey PRIMARY KEY (id),
  CONSTRAINT ai_conversation_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.ai_message (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid,
  role text NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text])),
  content text NOT NULL,
  tokens_used integer,
  sent_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_message_pkey PRIMARY KEY (id),
  CONSTRAINT ai_message_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.ai_conversation(id)
);
CREATE TABLE public.specialty (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_fr text NOT NULL,
  name_en text NOT NULL,
  name_es text,
  name_pt text,
  region text,
  created_at timestamp with time zone DEFAULT now(),
  name_ar text,
  CONSTRAINT specialty_pkey PRIMARY KEY (id),
  CONSTRAINT specialty_region_fkey FOREIGN KEY (region) REFERENCES public.food_region(code)
);
CREATE TABLE public.recipe_translation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_id uuid,
  locale text NOT NULL CHECK (locale = ANY (ARRAY['fr'::text, 'en'::text, 'es'::text, 'pt'::text, 'wo'::text, 'bm'::text, 'ln'::text, 'ar'::text])),
  title text NOT NULL,
  description text,
  is_auto boolean DEFAULT true,
  generated_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recipe_translation_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_translation_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.ingredient_submission (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  submitted_by uuid,
  name text NOT NULL,
  name_fr text,
  name_en text,
  category_hint text,
  notes text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'validated'::text, 'rejected'::text, 'duplicate'::text])),
  ingredient_id uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ingredient_submission_pkey PRIMARY KEY (id),
  CONSTRAINT ingredient_submission_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.user_profile(id),
  CONSTRAINT ingredient_submission_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredient(id)
);
CREATE TABLE public.recipe_step (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  step_number integer NOT NULL,
  title text,
  content text,
  image_url text,
  timer_seconds integer,
  created_at timestamp with time zone DEFAULT now(),
  is_section_header boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  ingredient_ids ARRAY DEFAULT '{}'::uuid[],
  CONSTRAINT recipe_step_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_step_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.recipe_save (
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL,
  saved_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recipe_save_pkey PRIMARY KEY (user_id, recipe_id),
  CONSTRAINT recipe_save_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id),
  CONSTRAINT recipe_save_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.recipe_impression (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  user_id uuid,
  source text NOT NULL CHECK (source = ANY (ARRAY['feed'::text, 'search'::text, 'meal_planner'::text])),
  seen_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recipe_impression_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_impression_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id),
  CONSTRAINT recipe_impression_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.recipe_open (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  user_id uuid,
  source text NOT NULL CHECK (source = ANY (ARRAY['feed'::text, 'search'::text, 'meal_planner'::text])),
  opened_at timestamp with time zone DEFAULT now(),
  closed_at timestamp with time zone,
  session_duration_seconds integer,
  CONSTRAINT recipe_open_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_open_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id),
  CONSTRAINT recipe_open_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.sync_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  sync_type text NOT NULL,
  last_synced_date date,
  last_run_at timestamp with time zone DEFAULT now(),
  last_run_status text CHECK (last_run_status = ANY (ARRAY['success'::text, 'error'::text, 'partial'::text])),
  rows_synced integer DEFAULT 0,
  rows_skipped integer DEFAULT 0,
  rows_errored integer DEFAULT 0,
  error_detail text,
  user_cache jsonb DEFAULT '{}'::jsonb,
  user_cache_built_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sync_log_pkey PRIMARY KEY (id)
);
CREATE TABLE public.recipe_development (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  improvement_date timestamp with time zone NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1,
  inspiration_source text,
  inspiration_notes text,
  discussion_summary text,
  conversation_log jsonb,
  changes_made jsonb,
  change_summary text,
  macros_before jsonb,
  macros_after jsonb,
  outcome_rating integer CHECK (outcome_rating >= 1 AND outcome_rating <= 5),
  outcome_notes text,
  status text NOT NULL DEFAULT 'draft'::text CHECK (status = ANY (ARRAY['draft'::text, 'applied'::text, 'rejected'::text, 'pending_test'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recipe_development_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_development_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.unit_conversion (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  unit text NOT NULL,
  ingredient_id uuid,
  grams_equivalent numeric NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT unit_conversion_pkey PRIMARY KEY (id),
  CONSTRAINT unit_conversion_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredient(id)
);
CREATE TABLE public.recipe_step_translation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL,
  locale text NOT NULL CHECK (locale = ANY (ARRAY['fr'::text, 'en'::text, 'es'::text, 'pt'::text, 'wo'::text, 'bm'::text, 'ln'::text, 'ar'::text])),
  content text,
  title text,
  is_auto boolean NOT NULL DEFAULT true,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recipe_step_translation_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_step_translation_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.recipe_step(id)
);
CREATE TABLE public.recipe_ingredient_translation (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  recipe_ingredient_id uuid NOT NULL,
  locale text NOT NULL CHECK (locale = ANY (ARRAY['fr'::text, 'en'::text, 'es'::text, 'pt'::text, 'wo'::text, 'bm'::text, 'ln'::text, 'ar'::text])),
  quantity numeric,
  unit text,
  title text,
  is_auto boolean NOT NULL DEFAULT true,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recipe_ingredient_translation_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_ingredient_translation_recipe_ingredient_id_fkey FOREIGN KEY (recipe_ingredient_id) REFERENCES public.recipe_ingredient(id),
  CONSTRAINT recipe_ingredient_translation_unit_fkey FOREIGN KEY (unit) REFERENCES public.measurement_unit(code)
);
CREATE TABLE public.creator_stripe_account (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  stripe_account_id text NOT NULL UNIQUE,
  onboarding_complete boolean DEFAULT false,
  charges_enabled boolean DEFAULT false,
  payouts_enabled boolean DEFAULT false,
  country text DEFAULT 'FR'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT creator_stripe_account_pkey PRIMARY KEY (id),
  CONSTRAINT creator_stripe_account_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator(id)
);
CREATE TABLE public.recipe_combination (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  base_recipe_id uuid NOT NULL,
  paired_recipe_id uuid NOT NULL,
  paired_role text NOT NULL CHECK (paired_role = ANY (ARRAY['starch'::text, 'side'::text])),
  source text NOT NULL CHECK (source = ANY (ARRAY['creator'::text, 'cross_creator'::text, 'user'::text])),
  is_validated boolean NOT NULL DEFAULT false,
  owner_user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recipe_combination_pkey PRIMARY KEY (id),
  CONSTRAINT recipe_combination_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.user_profile(id),
  CONSTRAINT recipe_combination_base_recipe_id_fkey FOREIGN KEY (base_recipe_id) REFERENCES public.recipe(id),
  CONSTRAINT recipe_combination_paired_recipe_id_fkey FOREIGN KEY (paired_recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.combination_vector (
  combination_id uuid NOT NULL,
  vector USER-DEFINED NOT NULL,
  last_computed timestamp with time zone DEFAULT now(),
  CONSTRAINT combination_vector_pkey PRIMARY KEY (combination_id),
  CONSTRAINT combination_vector_combination_id_fkey FOREIGN KEY (combination_id) REFERENCES public.recipe_combination(id)
);
CREATE TABLE public.recipe_performance_metrics (
  recipe_id uuid NOT NULL,
  drop_off_rate numeric NOT NULL DEFAULT 0 CHECK (drop_off_rate >= 0::numeric AND drop_off_rate <= 1::numeric),
  adherence_rate numeric NOT NULL DEFAULT 0 CHECK (adherence_rate >= 0::numeric AND adherence_rate <= 1::numeric),
  consumption_rate_7d numeric NOT NULL DEFAULT 0 CHECK (consumption_rate_7d >= 0::numeric),
  computed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recipe_performance_metrics_pkey PRIMARY KEY (recipe_id),
  CONSTRAINT recipe_performance_metrics_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.user_feed (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL,
  position integer NOT NULL,
  segment text NOT NULL CHECK (segment = ANY (ARRAY['personalized'::text, 'exploration'::text, 'fresh'::text])),
  score numeric,
  generated_at timestamp with time zone DEFAULT now(),
  seen_at timestamp with time zone,
  interacted_at timestamp with time zone,
  CONSTRAINT user_feed_pkey PRIMARY KEY (id),
  CONSTRAINT user_feed_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id),
  CONSTRAINT user_feed_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.cooking_session (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  meal_plan_id uuid,
  recipe_id uuid,
  planned_date date NOT NULL,
  total_portions integer NOT NULL CHECK (total_portions > 0),
  portions_used integer NOT NULL DEFAULT 0 CHECK (portions_used >= 0),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  scale_factor numeric,
  is_cooked boolean NOT NULL DEFAULT false,
  CONSTRAINT cooking_session_pkey PRIMARY KEY (id),
  CONSTRAINT cooking_session_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id),
  CONSTRAINT cooking_session_meal_plan_id_fkey FOREIGN KEY (meal_plan_id) REFERENCES public.meal_plan(id),
  CONSTRAINT cooking_session_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);
CREATE TABLE public.meal_plan_entry_component (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  meal_plan_entry_id uuid,
  recipe_id uuid,
  role text NOT NULL CHECK (role = ANY (ARRAY['base'::text, 'starch'::text, 'side'::text])),
  consumption_weight numeric NOT NULL DEFAULT 1.0,
  cooking_session_id uuid,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meal_plan_entry_component_pkey PRIMARY KEY (id),
  CONSTRAINT meal_plan_entry_component_meal_plan_entry_id_fkey FOREIGN KEY (meal_plan_entry_id) REFERENCES public.meal_plan_entry(id),
  CONSTRAINT meal_plan_entry_component_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id),
  CONSTRAINT meal_plan_entry_component_cooking_session_id_fkey FOREIGN KEY (cooking_session_id) REFERENCES public.cooking_session(id)
);
CREATE TABLE public.journal_entry (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meal_type text NOT NULL CHECK (meal_type = ANY (ARRAY['Petit-déjeuner'::text, 'Déjeuner'::text, 'Dîner'::text, 'Collation'::text])),
  description text NOT NULL,
  photo_urls ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT journal_entry_pkey PRIMARY KEY (id),
  CONSTRAINT journal_entry_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.nutrition_plan (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  calorie_goal integer NOT NULL,
  protein_goal_g numeric NOT NULL,
  carb_goal_g numeric NOT NULL,
  fat_goal_g numeric NOT NULL,
  bmr numeric,
  tdee numeric,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT nutrition_plan_pkey PRIMARY KEY (id),
  CONSTRAINT nutrition_plan_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.meal_distribution (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nutrition_plan_id uuid NOT NULL,
  meal_type text NOT NULL,
  sort_order integer NOT NULL,
  calorie_pct numeric NOT NULL,
  calorie_target numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  min_portion_g integer NOT NULL DEFAULT 50,
  max_portion_g integer NOT NULL DEFAULT 1500,
  CONSTRAINT meal_distribution_pkey PRIMARY KEY (id),
  CONSTRAINT meal_distribution_nutrition_plan_id_fkey FOREIGN KEY (nutrition_plan_id) REFERENCES public.nutrition_plan(id)
);
CREATE TABLE public.cooking_session_ingredient (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cooking_session_id uuid,
  ingredient_id uuid,
  ingredient_name text NOT NULL,
  quantity_needed numeric NOT NULL,
  unit text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cooking_session_ingredient_pkey PRIMARY KEY (id),
  CONSTRAINT cooking_session_ingredient_cooking_session_id_fkey FOREIGN KEY (cooking_session_id) REFERENCES public.cooking_session(id),
  CONSTRAINT cooking_session_ingredient_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredient(id)
);
CREATE TABLE public.meal_ingredient (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  meal_plan_entry_id uuid NOT NULL,
  ingredient_id uuid,
  ingredient_name text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT meal_ingredient_pkey PRIMARY KEY (id),
  CONSTRAINT meal_ingredient_meal_plan_entry_id_fkey FOREIGN KEY (meal_plan_entry_id) REFERENCES public.meal_plan_entry(id),
  CONSTRAINT meal_ingredient_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredient(id)
);
CREATE TABLE public.creator_vector (
  creator_id uuid NOT NULL,
  vector USER-DEFINED NOT NULL,
  last_computed timestamp with time zone NOT NULL DEFAULT now(),
  recipe_count_sampled integer NOT NULL DEFAULT 0,
  CONSTRAINT creator_vector_pkey PRIMARY KEY (creator_id),
  CONSTRAINT creator_vector_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creator(id)
);
CREATE TABLE public.group_invite (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT group_invite_pkey PRIMARY KEY (id),
  CONSTRAINT group_invite_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.community_group(id),
  CONSTRAINT group_invite_inviter_id_fkey FOREIGN KEY (inviter_id) REFERENCES public.user_profile(id),
  CONSTRAINT group_invite_invitee_id_fkey FOREIGN KEY (invitee_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.group_vector (
  group_id uuid NOT NULL,
  vector USER-DEFINED NOT NULL,
  last_computed timestamp with time zone NOT NULL DEFAULT now(),
  member_count_sampled integer NOT NULL DEFAULT 0,
  CONSTRAINT group_vector_pkey PRIMARY KEY (group_id),
  CONSTRAINT group_vector_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.community_group(id)
);
CREATE TABLE public.allergen (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label_fr text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  label_en text NOT NULL,
  CONSTRAINT allergen_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ingredient_allergen (
  ingredient_id uuid NOT NULL,
  allergen_id uuid NOT NULL,
  CONSTRAINT ingredient_allergen_pkey PRIMARY KEY (ingredient_id, allergen_id),
  CONSTRAINT ingredient_allergen_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredient(id),
  CONSTRAINT ingredient_allergen_allergen_id_fkey FOREIGN KEY (allergen_id) REFERENCES public.allergen(id)
);
CREATE TABLE public.user_allergy (
  user_id uuid NOT NULL,
  allergen_id uuid NOT NULL,
  CONSTRAINT user_allergy_pkey PRIMARY KEY (user_id, allergen_id),
  CONSTRAINT user_allergy_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id),
  CONSTRAINT user_allergy_allergen_id_fkey FOREIGN KEY (allergen_id) REFERENCES public.allergen(id)
);
CREATE TABLE public.allergen_suggestion (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  label text NOT NULL,
  status text DEFAULT 'pending'::text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT allergen_suggestion_pkey PRIMARY KEY (id),
  CONSTRAINT allergen_suggestion_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.unit_rounding_config (
  unit text NOT NULL,
  rounding_step numeric NOT NULL,
  CONSTRAINT unit_rounding_config_pkey PRIMARY KEY (unit)
);
CREATE TABLE public.ingredient_rounding_rule (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL,
  unit text NOT NULL,
  rounding_step numeric,
  CONSTRAINT ingredient_rounding_rule_pkey PRIMARY KEY (id),
  CONSTRAINT ingredient_rounding_rule_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredient(id)
);
CREATE TABLE public.fan_external_recipe_counter (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month_key text NOT NULL,
  external_recipe_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fan_external_recipe_counter_pkey PRIMARY KEY (id),
  CONSTRAINT fan_external_recipe_counter_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profile(id)
);
CREATE TABLE public.recipe_weight_impact (
  user_id uuid NOT NULL,
  recipe_id uuid NOT NULL,
  meal_type text NOT NULL,
  avg_delta_kg double precision NOT NULL,
  sample_count integer NOT NULL,
  computed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recipe_weight_impact_pkey PRIMARY KEY (user_id, recipe_id, meal_type),
  CONSTRAINT recipe_weight_impact_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT recipe_weight_impact_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipe(id)
);