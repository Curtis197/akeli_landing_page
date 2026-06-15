ALTER TABLE public.ingredient
  ADD COLUMN IF NOT EXISTS name_ar text;

ALTER TABLE public.ingredient_category
  ADD COLUMN IF NOT EXISTS name_ar text;
