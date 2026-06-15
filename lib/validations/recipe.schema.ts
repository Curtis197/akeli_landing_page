import { z } from "zod";

export const step1Schema = z.object({
  title: z.string().min(3, "Minimum 3 caractères").max(80, "Maximum 80 caractères"),
  description: z.string().max(300, "Maximum 300 caractères").optional(),
  region: z.string().min(1, "Région culinaire requise"),
  meal_types: z.array(z.string()).min(1, "Sélectionne au moins un type de repas"),
  preferred_meal_type: z.enum(["any", "breakfast", "lunch", "dinner", "snack"]),
  difficulty: z.enum(["easy", "medium", "hard"], {
    message: "Sélectionne un niveau de difficulté",
  }),
  prep_time_min: z.number().int().min(1).max(480),
  cook_time_min: z.number().int().min(0).max(480).optional(),
  servings: z.number().int().min(1).max(50),
});

export const ingredientItemSchema = z.object({
  id: z.string(),
  ingredient_id: z.string().optional(),
  name: z.string().optional().default(""),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  is_optional: z.boolean().default(false),
  sort_order: z.number().int(),
  is_section_header: z.boolean().default(false),
  title: z.string().optional(),
  // Nutritional data from catalog (not persisted to recipe_ingredient, used for Step 4)
  calories_per_100g: z.number().nullable().optional(),
  protein_per_100g: z.number().nullable().optional(),
  carbs_per_100g: z.number().nullable().optional(),
  fat_per_100g: z.number().nullable().optional(),
});

export const step2Schema = z.object({
  ingredients: z
    .array(ingredientItemSchema)
    .refine(
      (items) => items.filter((i) => !i.is_section_header).length >= 3,
      { message: "Minimum 3 ingrédients (hors sections)" }
    )
    .refine(
      (items) =>
        items
          .filter((i) => !i.is_section_header)
          .every((i) => !!i.ingredient_id),
      { message: "Tous les ingrédients doivent être liés au catalogue" }
    ),
});

export const stepItemSchema = z.object({
  id: z.string(),
  step_number: z.number().int(),
  title: z.string().optional(),
  content: z.string()
    .optional()
    .refine(
      (val) => !val || !/(?<!\b(cuisson|four|mijoter|température)\s*.{0,20})\b\d+(?:[\.,]\d+)?\s*(g|kg|ml|l|cl|oz|lb|cup|cups|tasse|tasses|c\.à\.s|c\.à\.c|tbsp|tsp|cuillère)\b/i.test(val),
      { message: "Veuillez ne pas inclure de quantités exactes dans les instructions. Utilisez la section Ingrédients." }
    ),
  image_url: z.string().optional(),
  timer_seconds: z.number().int().min(0).optional(),
  sort_order: z.number().int(),
  is_section_header: z.boolean().default(false),
  ingredient_ids: z.array(z.string()).default([]),
});

export const step3Schema = z.object({
  steps: z
    .array(stepItemSchema)
    .refine(
      (items) => items.filter((i) => !i.is_section_header).length >= 3,
      { message: "Minimum 3 étapes (hors sections)" }
    )
    .refine(
      (items) =>
        items
          .filter((i) => !i.is_section_header)
          .every((i) => i.content && i.content.length >= 10),
      { message: "Chaque étape doit contenir au moins 10 caractères" }
    ),
});

export const step5Schema = z.object({
  cover_image_url: z.string().min(1, "Image de couverture requise"),
  gallery_urls: z.array(z.string()).max(5).default([]),
});

export const step6Schema = z.object({
  tags: z.array(z.string()).max(8, "Maximum 8 tags"),
  is_pork_free: z.boolean().default(false),
  is_private: z.boolean().default(false),
  allergen_tags: z.array(z.string()).default([]),
});

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step5Data = z.infer<typeof step5Schema>;
export type Step6Data = z.infer<typeof step6Schema>;
export type IngredientItem = z.infer<typeof ingredientItemSchema>;
export type StepItem = z.infer<typeof stepItemSchema>;

export const MEAL_TYPES = [
  { value: "breakfast", label: "Petit-déjeuner" },
  { value: "lunch", label: "Déjeuner" },
  { value: "dinner", label: "Dîner" },
  { value: "snack", label: "Snack" },
  { value: "dessert", label: "Dessert" },
] as const;

export const PREFERRED_MEAL_TYPES = [
  { value: "any", label: "Peu importe" },
  { value: "breakfast", label: "Petit-déj" },
  { value: "lunch", label: "Déjeuner" },
  { value: "dinner", label: "Dîner" },
  { value: "snack", label: "Snack" },
] as const;

export const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Facile" },
  { value: "medium", label: "Moyen" },
  { value: "hard", label: "Difficile" },
] as const;
