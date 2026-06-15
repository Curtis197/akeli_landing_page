-- ============================================================
-- FUNCTION 1: compute_user_target_calories(user_id)
-- Returns daily calorie target based on TDEE + goal adjustment
-- Formula: Harris-Benedict (revised Mifflin-St Jeor)
-- ============================================================

CREATE OR REPLACE FUNCTION public.compute_user_target_calories(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sex           text;
  v_weight_kg     numeric;
  v_height_cm     numeric;
  v_age_years     numeric;
  v_activity      text;
  v_goal_type     text;
  v_bmr           numeric;
  v_tdee          numeric;
  v_target        numeric;

  -- Activity multipliers
  v_activity_mult numeric;

  -- Goal adjustments (kcal/day)
  v_goal_adjust   numeric;
BEGIN
  -- Fetch health profile
  SELECT
    sex, weight_kg, height_cm,
    EXTRACT(YEAR FROM age(birth_date)) AS age_years,
    activity_level
  INTO v_sex, v_weight_kg, v_height_cm, v_age_years, v_activity
  FROM public.user_health_profile
  WHERE user_id = p_user_id;

  -- Return NULL if profile is incomplete
  IF v_weight_kg IS NULL OR v_height_cm IS NULL OR v_age_years IS NULL THEN
    RETURN NULL;
  END IF;

  -- Mifflin-St Jeor BMR
  IF v_sex = 'male' THEN
    v_bmr := (10 * v_weight_kg) + (6.25 * v_height_cm) - (5 * v_age_years) + 5;
  ELSIF v_sex = 'female' THEN
    v_bmr := (10 * v_weight_kg) + (6.25 * v_height_cm) - (5 * v_age_years) - 161;
  ELSE
    -- 'other' — use average of male/female
    v_bmr := (10 * v_weight_kg) + (6.25 * v_height_cm) - (5 * v_age_years) - 78;
  END IF;

  -- Activity multiplier
  v_activity_mult := CASE v_activity
    WHEN 'sedentary'   THEN 1.2
    WHEN 'light'       THEN 1.375
    WHEN 'moderate'    THEN 1.55
    WHEN 'active'      THEN 1.725
    WHEN 'very_active' THEN 1.9
    ELSE 1.2  -- default to sedentary if unknown
  END;

  v_tdee := v_bmr * v_activity_mult;

  -- Fetch active goal
  SELECT goal_type INTO v_goal_type
  FROM public.user_goal
  WHERE user_id = p_user_id AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  -- Goal adjustment
  v_goal_adjust := CASE v_goal_type
    WHEN 'weight_loss'   THEN -500
    WHEN 'muscle_gain'   THEN  300
    WHEN 'maintenance'   THEN    0
    WHEN 'health'        THEN    0
    WHEN 'performance'   THEN  200
    ELSE 0
  END;

  v_target := v_tdee + v_goal_adjust;

  -- Floor at 1200 kcal (safe minimum)
  RETURN GREATEST(v_target, 1200);
END;
$$;


-- ============================================================
-- FUNCTION 2: scale_meal_plan_entries(user_id)
-- Computes and persists scaled ingredients for all active
-- meal plan entries of a given user.
-- Called via rpc() from Flutter or from the Edge Function batch.
-- ============================================================

CREATE OR REPLACE FUNCTION public.scale_meal_plan_entries(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_target_calories   numeric;
  v_entry             record;
  v_recipe_calories   numeric;
  v_meal_calories     numeric;
  v_ratio             numeric;
  v_ingredient        record;

  -- Caloric distribution per meal type
  v_meal_ratio        numeric;
BEGIN
  -- Step 1: Get user's daily calorie target
  v_target_calories := public.compute_user_target_calories(p_user_id);

  -- Cannot scale without a calorie target
  IF v_target_calories IS NULL THEN
    RAISE NOTICE 'No health profile found for user %, skipping scaling.', p_user_id;
    RETURN;
  END IF;

  -- Step 2: Iterate over all active meal plan entries for this user
  FOR v_entry IN
    SELECT
      mpe.id            AS entry_id,
      mpe.recipe_id,
      mpe.meal_type,
      mpe.servings
    FROM public.meal_plan_entry mpe
    JOIN public.meal_plan mp ON mp.id = mpe.meal_plan_id
    WHERE mp.user_id   = p_user_id
      AND mp.is_active = true
      AND mp.end_date  >= CURRENT_DATE
  LOOP

    -- Step 3: Get recipe total calories (for 1 serving)
    SELECT COALESCE(calories, 0)
    INTO v_recipe_calories
    FROM public.recipe_macro
    WHERE recipe_id = v_entry.recipe_id;

    -- Skip if no macro data for this recipe
    IF v_recipe_calories IS NULL OR v_recipe_calories = 0 THEN
      CONTINUE;
    END IF;

    -- Step 4: Calculate target calories for this meal_type
    v_meal_ratio := CASE v_entry.meal_type
      WHEN 'breakfast' THEN 0.25
      WHEN 'lunch'     THEN 0.35
      WHEN 'dinner'    THEN 0.30
      WHEN 'snack'     THEN 0.10
      ELSE 0.25
    END;

    -- Target calories for this meal (considering number of servings)
    v_meal_calories := v_target_calories * v_meal_ratio;

    -- Scaling ratio: how much to scale recipe ingredients
    -- v_entry.servings already factored in (user chose N servings)
    v_ratio := v_meal_calories / (v_recipe_calories * v_entry.servings);

    -- Step 5: Delete existing scaled ingredients for this entry
    DELETE FROM public.meal_plan_entry_ingredient
    WHERE meal_plan_entry_id = v_entry.entry_id;

    -- Step 6: Insert scaled ingredients
    FOR v_ingredient IN
      SELECT
        ri.ingredient_id,
        ri.quantity,
        ri.unit,
        i.calories_per_100g,
        i.protein_per_100g,
        i.carbs_per_100g,
        i.fat_per_100g
      FROM public.recipe_ingredient ri
      JOIN public.ingredient i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = v_entry.recipe_id
    LOOP
      INSERT INTO public.meal_plan_entry_ingredient (
        meal_plan_entry_id,
        ingredient_id,
        quantity_scaled,
        unit,
        calories_scaled,
        protein_scaled,
        carbs_scaled,
        fat_scaled,
        scaling_ratio,
        computed_at
      ) VALUES (
        v_entry.entry_id,
        v_ingredient.ingredient_id,
        -- Scale quantity by ratio × servings
        ROUND(v_ingredient.quantity * v_entry.servings * v_ratio, 1),
        v_ingredient.unit,
        -- Recalculate macros from ingredient data per 100g
        ROUND((v_ingredient.quantity * v_entry.servings * v_ratio / 100.0) * COALESCE(v_ingredient.calories_per_100g, 0), 1),
        ROUND((v_ingredient.quantity * v_entry.servings * v_ratio / 100.0) * COALESCE(v_ingredient.protein_per_100g, 0), 1),
        ROUND((v_ingredient.quantity * v_entry.servings * v_ratio / 100.0) * COALESCE(v_ingredient.carbs_per_100g, 0), 1),
        ROUND((v_ingredient.quantity * v_entry.servings * v_ratio / 100.0) * COALESCE(v_ingredient.fat_per_100g, 0), 1),
        ROUND(v_ratio, 4),
        now()
      );
    END LOOP;

  END LOOP;
END;
$$;

-- ============================================================
-- GRANT: Allow Flutter (authenticated users) to call via rpc()
-- ============================================================
GRANT EXECUTE ON FUNCTION public.scale_meal_plan_entries(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_user_target_calories(uuid) TO authenticated;
