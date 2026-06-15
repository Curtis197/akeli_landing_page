-- ============================================================
-- MIGRATION: meal_plan_entry_ingredient
-- Stores scaled ingredients per meal plan entry
-- Scaling is based on user TDEE adjusted by goal_type
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meal_plan_entry_ingredient (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_entry_id  uuid NOT NULL REFERENCES public.meal_plan_entry(id) ON DELETE CASCADE,
  ingredient_id       uuid NOT NULL REFERENCES public.ingredient(id),
  quantity_scaled     numeric NOT NULL,
  unit                text NOT NULL,
  calories_scaled     numeric,
  protein_scaled      numeric,
  carbs_scaled        numeric,
  fat_scaled          numeric,
  scaling_ratio       numeric,   -- ratio applied, useful for debugging
  computed_at         timestamptz DEFAULT now(),

  CONSTRAINT meal_plan_entry_ingredient_qty_positive CHECK (quantity_scaled > 0)
);

-- Index for fast lookup by entry
CREATE INDEX IF NOT EXISTS idx_mpei_entry_id
  ON public.meal_plan_entry_ingredient(meal_plan_entry_id);

-- Index for fast lookup by ingredient
CREATE INDEX IF NOT EXISTS idx_mpei_ingredient_id
  ON public.meal_plan_entry_ingredient(ingredient_id);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.meal_plan_entry_ingredient ENABLE ROW LEVEL SECURITY;

-- Users can only read their own scaled ingredients
-- (join through meal_plan_entry → meal_plan → user_id)
CREATE POLICY "user_read_own_mpei"
  ON public.meal_plan_entry_ingredient
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.meal_plan_entry mpe
      JOIN public.meal_plan mp ON mp.id = mpe.meal_plan_id
      WHERE mpe.id = meal_plan_entry_ingredient.meal_plan_entry_id
        AND mp.user_id = auth.uid()
    )
  );

-- Only service_role can insert/update/delete (scaling done server-side)
CREATE POLICY "service_role_manage_mpei"
  ON public.meal_plan_entry_ingredient
  FOR ALL
  USING (auth.role() = 'service_role');
