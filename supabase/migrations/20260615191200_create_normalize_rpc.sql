-- Migration to create the RPC that normalizes recipe ingredients to Metric

CREATE OR REPLACE FUNCTION public.normalize_recipe_ingredients_to_metric(p_recipe_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
BEGIN
    -- Loop through all ingredients for the given recipe
    FOR r IN 
        SELECT 
            ri.id as recipe_ingredient_id,
            ri.quantity,
            ri.unit as current_unit,
            i.default_us_unit,
            i.default_metric_unit,
            i.us_to_metric_factor
        FROM public.recipe_ingredient ri
        JOIN public.ingredient i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = p_recipe_id
    LOOP
        -- Check if the row needs conversion (i.e., it was saved in a US unit)
        -- We compare the current_unit to the ingredient's default_us_unit.
        IF r.current_unit = r.default_us_unit AND r.us_to_metric_factor IS NOT NULL THEN
            -- Convert the quantity and update the unit to the Metric baseline
            UPDATE public.recipe_ingredient
            SET 
                quantity = ROUND(r.quantity * r.us_to_metric_factor, 1),
                unit = r.default_metric_unit
            WHERE id = r.recipe_ingredient_id;
        END IF;
    END LOOP;
END;
$$;
