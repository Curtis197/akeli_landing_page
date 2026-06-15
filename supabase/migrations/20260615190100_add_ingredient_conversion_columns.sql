-- 1. Add the new columns for conversion and UX handling
ALTER TABLE public.ingredient 
ADD COLUMN default_metric_unit TEXT,
ADD COLUMN default_us_unit TEXT,
ADD COLUMN us_to_metric_factor NUMERIC,
ADD COLUMN hide_in_metric BOOLEAN DEFAULT false;

-- 2. Update existing baking ingredients to use Cups (Volume) as US default
UPDATE public.ingredient 
SET default_metric_unit = 'g', default_us_unit = 'cup', us_to_metric_factor = 120 
WHERE name = 'Farine de blé';

UPDATE public.ingredient 
SET default_metric_unit = 'g', default_us_unit = 'cup', us_to_metric_factor = 150 
WHERE name = 'Farine de maïs';

UPDATE public.ingredient 
SET default_metric_unit = 'g', default_us_unit = 'cup', us_to_metric_factor = 130 
WHERE name = 'Farine de manioc';

UPDATE public.ingredient 
SET default_metric_unit = 'g', default_us_unit = 'cup', us_to_metric_factor = 140 
WHERE name = 'Farine de teff';

UPDATE public.ingredient 
SET default_metric_unit = 'g', default_us_unit = 'cup', us_to_metric_factor = 200 
WHERE name = 'Sucre';

-- 3. Insert duplicate rows for Ounces (Weight) with hide_in_metric = true
INSERT INTO public.ingredient 
(id, name, name_en, category, status, default_metric_unit, default_us_unit, us_to_metric_factor, hide_in_metric)
VALUES 
(gen_random_uuid(), 'Farine de blé (Ounces)', 'Wheat flour (Ounces)', 'starch', 'validated', 'g', 'oz', 28.35, true),
(gen_random_uuid(), 'Farine de maïs (Ounces)', 'Corn flour (Ounces)', 'starch', 'validated', 'g', 'oz', 28.35, true),
(gen_random_uuid(), 'Farine de manioc (Ounces)', 'Cassava flour (Ounces)', 'starch', 'validated', 'g', 'oz', 28.35, true),
(gen_random_uuid(), 'Farine de teff (Ounces)', 'Teff flour (Ounces)', 'starch', 'validated', 'g', 'oz', 28.35, true),
(gen_random_uuid(), 'Sucre (Ounces)', 'Sugar (Ounces)', 'other', 'validated', 'g', 'oz', 28.35, true);

-- 4. Create the global Conversion RPC Function
CREATE OR REPLACE FUNCTION public.convert_ingredient_unit(
    p_ingredient_id UUID,
    p_quantity NUMERIC,
    p_from_system TEXT, -- 'us' or 'metric'
    p_to_system TEXT    -- 'us' or 'metric'
) RETURNS TABLE (
    converted_quantity NUMERIC, 
    target_unit TEXT
) LANGUAGE plpgsql AS $$
DECLARE
    v_metric_unit TEXT;
    v_us_unit TEXT;
    v_factor NUMERIC;
BEGIN
    -- Look up the rules for the specific ingredient
    SELECT default_metric_unit, default_us_unit, us_to_metric_factor
    INTO v_metric_unit, v_us_unit, v_factor
    FROM public.ingredient
    WHERE id = p_ingredient_id;

    -- If the ingredient hasn't been configured yet, fail gracefully
    IF v_factor IS NULL THEN
        RETURN QUERY SELECT p_quantity, 'unknown';
        RETURN;
    END IF;

    -- Do the conversion math
    IF p_from_system = 'us' AND p_to_system = 'metric' THEN
        RETURN QUERY SELECT ROUND(p_quantity * v_factor, 1), v_metric_unit;
    ELSIF p_from_system = 'metric' AND p_to_system = 'us' THEN
        RETURN QUERY SELECT ROUND(p_quantity / v_factor, 2), v_us_unit;
    ELSE
        -- No conversion needed, just return original system
        IF p_from_system = 'us' THEN
            RETURN QUERY SELECT p_quantity, v_us_unit;
        ELSE
            RETURN QUERY SELECT p_quantity, v_metric_unit;
        END IF;
    END IF;
END;
$$;
