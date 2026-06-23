-- Migration to add swappable_ingredient_ids column to recipe_ingredient table
ALTER TABLE public.recipe_ingredient 
ADD COLUMN swappable_ingredient_ids uuid[] DEFAULT '{}'::uuid[];

-- Add a comment to describe the column's purpose
COMMENT ON COLUMN public.recipe_ingredient.swappable_ingredient_ids 
IS 'Array of ingredient IDs that can be used as alternatives or substitutes for this ingredient in the recipe.';
