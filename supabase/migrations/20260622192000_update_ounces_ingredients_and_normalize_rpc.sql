-- Rename the Ounces ingredients to remove ' (Ounces)' suffix
UPDATE public.ingredient 
SET name = 'Wheat Flour', name_fr = 'Farine de blé', name_en = 'Wheat Flour' 
WHERE id = '5df7820c-fafa-4f92-9def-c4fa4bd1c291';

UPDATE public.ingredient 
SET name = 'Cornmeal', name_fr = 'Farine de maïs', name_en = 'Cornmeal' 
WHERE id = '18e234c6-7b19-4d44-b090-be582bf3bd2b';

UPDATE public.ingredient 
SET name = 'Cassava Flour', name_fr = 'Farine de manioc', name_en = 'Cassava Flour' 
WHERE id = 'b6cfd0a8-24d4-4325-9879-8587785ee402';

UPDATE public.ingredient 
SET name = 'Teff Flour', name_fr = 'Farine de teff', name_en = 'Teff Flour' 
WHERE id = 'a5f80293-4f90-4bf2-9905-057877db9999';

UPDATE public.ingredient 
SET name = 'Sugar', name_fr = 'Sucre', name_en = 'Sugar' 
WHERE id = 'ebc37455-bfad-471e-9197-3d4544cd8d04';


-- Redefine the normalization function to swap IDs to international counterparts
CREATE OR REPLACE FUNCTION public.normalize_recipe_ingredients_to_metric(p_recipe_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    v_target_ingredient_id UUID;
BEGIN
    FOR r IN 
        SELECT 
            ri.id as recipe_ingredient_id,
            ri.ingredient_id,
            ri.quantity,
            ri.unit as current_unit,
            i.default_us_unit,
            i.default_metric_unit,
            i.us_to_metric_factor
        FROM public.recipe_ingredient ri
        JOIN public.ingredient i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = p_recipe_id
    LOOP
        -- Determine if this ingredient needs to be swapped for its international counterpart
        v_target_ingredient_id := r.ingredient_id;
        IF r.ingredient_id = '5df7820c-fafa-4f92-9def-c4fa4bd1c291' THEN -- Wheat Flour (Ounces)
            v_target_ingredient_id := '0bb80446-58e5-43b2-92a0-dba5a0e2914c'; -- Farine de blé
        ELSIF r.ingredient_id = '18e234c6-7b19-4d44-b090-be582bf3bd2b' THEN -- Cornmeal (Ounces)
            v_target_ingredient_id := '16496886-5655-4372-a41a-56198d46e62b'; -- Farine de maïs
        ELSIF r.ingredient_id = 'b6cfd0a8-24d4-4325-9879-8587785ee402' THEN -- Cassava Flour (Ounces)
            v_target_ingredient_id := '10e1c90f-d3f6-4671-8d9e-66de83de5a4f'; -- Farine de manioc
        ELSIF r.ingredient_id = 'a5f80293-4f90-4bf2-9905-057877db9999' THEN -- Teff Flour (Ounces)
            v_target_ingredient_id := '447e1f54-7513-41d9-89e3-319caee3b21a'; -- Farine de teff
        ELSIF r.ingredient_id = 'ebc37455-bfad-471e-9197-3d4544cd8d04' THEN -- Sugar (Ounces)
            v_target_ingredient_id := 'f311de50-07dd-4954-bda3-d04b08c8bddc'; -- Sucre
        END IF;

        -- Convert quantity and update unit to Metric, and swap ingredient_id
        IF r.current_unit = r.default_us_unit AND r.us_to_metric_factor IS NOT NULL THEN
            UPDATE public.recipe_ingredient
            SET 
                quantity = ROUND(r.quantity * r.us_to_metric_factor, 1),
                unit = r.default_metric_unit,
                ingredient_id = v_target_ingredient_id
            WHERE id = r.recipe_ingredient_id;
        ELSIF v_target_ingredient_id != r.ingredient_id THEN
            -- Just swap the ID if it was already metric but used the Ounces ID
            UPDATE public.recipe_ingredient
            SET ingredient_id = v_target_ingredient_id
            WHERE id = r.recipe_ingredient_id;
        END IF;
    END LOOP;
END;
$$;
