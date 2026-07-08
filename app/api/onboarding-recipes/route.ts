import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface RecipeMacro {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface DBRecipe {
  id: string;
  title: string;
  description: string | null;
  region: string;
  cover_image_url: string | null;
  meal_types: string[];
  preferred_meal_type: string;
  recipe_macro: RecipeMacro | RecipeMacro[] | null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const region = searchParams.get("region") || "west_africa";

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore cookie mutations in route handlers
            }
          },
        },
      }
    );

    // 1. Fetch published recipes for the selected region
    const { data: regionData, error: regionError } = await supabase
      .from("recipe")
      .select(`
        id,
        title,
        description,
        region,
        cover_image_url,
        meal_types,
        preferred_meal_type,
        recipe_macro (
          calories,
          protein_g,
          carbs_g,
          fat_g
        )
      `)
      .eq("is_published", true)
      .eq("region", region);

    if (regionError) {
      console.error("[onboarding-recipes] Error fetching region recipes:", regionError);
      return NextResponse.json({ error: "Failed to fetch recipes" }, { status: 500 });
    }

    const regionRecipes = (regionData || []) as unknown as DBRecipe[];

    // Helper to find a recipe for a specific meal type
    const findRecipeForMealType = (recipes: DBRecipe[], mealType: string) => {
      // First choice: exact match on preferred_meal_type
      let match = recipes.find(r => r.preferred_meal_type === mealType);
      if (!match) {
        // Second choice: fits within meal_types array
        match = recipes.find(r => r.meal_types?.includes(mealType));
      }
      return match;
    };

    let breakfast = findRecipeForMealType(regionRecipes, "breakfast");
    let lunch = findRecipeForMealType(regionRecipes, "lunch");
    let dinner = findRecipeForMealType(regionRecipes, "dinner");

    // 2. Fetch fallbacks if any meal type is missing
    const needsFallback = !breakfast || !lunch || !dinner;
    let fallbackRecipes: DBRecipe[] = [];

    if (needsFallback) {
      const { data: fallbackData } = await supabase
        .from("recipe")
        .select(`
          id,
          title,
          description,
          region,
          cover_image_url,
          meal_types,
          preferred_meal_type,
          recipe_macro (
            calories,
            protein_g,
            carbs_g,
            fat_g
          )
        `)
        .eq("is_published", true)
        .eq("region", "west_africa"); // West Africa is the primary fallback

      fallbackRecipes = (fallbackData || []) as unknown as DBRecipe[];

      if (!breakfast) {
        breakfast = findRecipeForMealType(fallbackRecipes, "breakfast");
      }
      if (!lunch) {
        // If lunch is missing, look for a dinner recipe and use it as lunch, or pull from fallback
        lunch = findRecipeForMealType(fallbackRecipes, "lunch") || findRecipeForMealType(regionRecipes, "dinner");
      }
      if (!dinner) {
        dinner = findRecipeForMealType(fallbackRecipes, "dinner") || findRecipeForMealType(regionRecipes, "lunch");
      }
    }

    const selectedRecipes = [breakfast, lunch, dinner].filter(Boolean) as DBRecipe[];

    if (selectedRecipes.length === 0) {
      return NextResponse.json({ error: "No recipes found" }, { status: 404 });
    }

    const recipeIds = selectedRecipes.map(r => r.id);

    // 3. Fetch ingredients for these recipes
    const { data: ingredientsData, error: ingError } = await supabase
      .from("recipe_ingredient")
      .select(`
        recipe_id,
        quantity,
        unit,
        is_optional,
        is_section_header,
        ingredient (
          name,
          name_fr,
          calories_per_100g,
          protein_per_100g,
          carbs_per_100g,
          fat_per_100g
        )
      `)
      .in("recipe_id", recipeIds);

    if (ingError) {
      console.error("[onboarding-recipes] Error fetching ingredients:", ingError);
      return NextResponse.json({ error: "Failed to fetch ingredients" }, { status: 500 });
    }

    // Map and format recipes with their macros and ingredients
    const result = {
      breakfast: breakfast ? formatRecipe(breakfast, ingredientsData) : null,
      lunch: lunch ? formatRecipe(lunch, ingredientsData) : null,
      dinner: dinner ? formatRecipe(dinner, ingredientsData) : null,
    };

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error("[onboarding-recipes] Unexpected error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function formatRecipe(recipe: DBRecipe, ingredientsList: any[]) {
  const macrosObj = Array.isArray(recipe.recipe_macro)
    ? recipe.recipe_macro[0]
    : recipe.recipe_macro;

  const rawMacros = macrosObj || { calories: 600, protein_g: 30, carbs_g: 70, fat_g: 20 };

  const ingredients = ingredientsList
    .filter(ing => ing.recipe_id === recipe.id && !ing.is_section_header && ing.ingredient)
    .map(ing => ({
      name: ing.ingredient.name,
      name_fr: ing.ingredient.name_fr || ing.ingredient.name,
      quantity: Number(ing.quantity) || 0,
      unit: ing.unit || "g",
      calories_per_100g: Number(ing.ingredient.calories_per_100g) || 0,
      protein_per_100g: Number(ing.ingredient.protein_per_100g) || 0,
      carbs_per_100g: Number(ing.ingredient.carbs_per_100g) || 0,
      fat_per_100g: Number(ing.ingredient.fat_per_100g) || 0,
    }));

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    cover_image_url: recipe.cover_image_url,
    macros: {
      calories: Number(rawMacros.calories) || 0,
      protein_g: Number(rawMacros.protein_g) || 0,
      carbs_g: Number(rawMacros.carbs_g) || 0,
      fat_g: Number(rawMacros.fat_g) || 0,
    },
    ingredients,
  };
}
