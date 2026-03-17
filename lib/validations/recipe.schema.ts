import { z } from "zod";

export const step1Schema = z.object({
  title: z.string().min(3, "Minimum 3 caractères").max(80, "Maximum 80 caractères"),
  description: z.string().max(300, "Maximum 300 caractères").optional(),
  region: z.string().min(1, "Région culinaire requise"),
  meal_types: z.array(z.string()).min(1, "Sélectionne au moins un type de repas"),
  difficulty: z.enum(["easy", "medium", "hard"], {
    message: "Sélectionne un niveau de difficulté",
  }),
  prep_time_min: z.number().int().min(1, "Minimum 1 minute").max(480, "Maximum 8 heures"),
  cook_time_min: z.number().int().min(0).max(480).optional(),
  servings: z.number().int().min(1, "Minimum 1 portion").max(50, "Maximum 50 portions"),
});

// ─── Ingredient list item (discriminated union) ───────────────────────────────

export const ingredientSectionHeaderSchema = z.object({
  id:               z.string(),
  type:             z.literal("section_header"),
  title:            z.string().min(1, "Le titre de section ne peut pas être vide").max(80),
  sort_order:       z.number().int(),
  is_section_header: z.literal(true),
});

export const ingredientItemSchema = z.object({
  id:   z.string(),
  type: z.literal("ingredient"),
  ingredient: z.object({
    id:       z.string().uuid(),
    name:     z.string(),
    category: z.string().nullable(),
    status:   z.enum(["validated", "pending"]),
  }),
  quantity:          z.number().positive("La quantité doit être positive"),
  unit:              z.string().min(1, "Unité requise"),
  is_optional:       z.boolean().default(false),
  sort_order:        z.number().int(),
  is_section_header: z.literal(false),
});

export const ingredientListItemSchema = z.discriminatedUnion("type", [
  ingredientSectionHeaderSchema,
  ingredientItemSchema,
]);

export type IngredientSectionHeader = z.infer<typeof ingredientSectionHeaderSchema>;
export type IngredientItem = z.infer<typeof ingredientItemSchema>;
export type IngredientListItem = z.infer<typeof ingredientListItemSchema>;

export const step2Schema = z.object({
  ingredients: z
    .array(ingredientListItemSchema)
    .refine(
      (items) => items.filter((i) => i.type === "ingredient").length >= 3,
      { message: "Minimum 3 ingrédients requis (hors titres de section)" }
    ),
});

// ─── Step list item (discriminated union) ─────────────────────────────────────

export const stepSectionHeaderSchema = z.object({
  id:               z.string(),
  type:             z.literal("section_header"),
  title:            z.string().min(1, "Le titre de section ne peut pas être vide").max(80),
  sort_order:       z.number().int(),
  is_section_header: z.literal(true),
});

export const stepItemSchema = z.object({
  id:               z.string(),
  type:             z.literal("step"),
  title:            z.string().max(80).nullable().optional(),
  content:          z.string().min(5, "Étape trop courte").max(2000),
  sort_order:       z.number().int(),
  is_section_header: z.literal(false),
});

export const stepListItemSchema = z.discriminatedUnion("type", [
  stepSectionHeaderSchema,
  stepItemSchema,
]);

export type StepSectionHeader = z.infer<typeof stepSectionHeaderSchema>;
export type StepItem = z.infer<typeof stepItemSchema>;
export type StepListItem = z.infer<typeof stepListItemSchema>;

export const step3Schema = z.object({
  steps: z
    .array(stepListItemSchema)
    .refine(
      (items) => items.filter((i) => i.type === "step").length >= 2,
      { message: "Minimum 2 étapes requises (hors titres de section)" }
    ),
});

export const step4Schema = z.object({
  calories: z.number().int().min(0).optional(),
  protein_g: z.number().min(0).optional(),
  carbs_g: z.number().min(0).optional(),
  fat_g: z.number().min(0).optional(),
  fiber_g: z.number().min(0).optional(),
  macros_skipped: z.boolean().default(false),
});

export const step5Schema = z.object({
  cover_image_url: z.string().url("Image de couverture requise"),
  gallery_urls: z.array(z.string().url()).max(5).default([]),
});

export const step6Schema = z.object({
  tags: z.array(z.string()).max(8, "Maximum 8 tags"),
  is_pork_free: z.boolean().default(false),
  is_published: z.boolean().default(false),
});

export const fullRecipeSchema = step1Schema
  .merge(step2Schema)
  .merge(step3Schema)
  .merge(step4Schema)
  .merge(step5Schema)
  .merge(step6Schema);

export type Step1Data = z.infer<typeof step1Schema>;
export type Step2Data = z.infer<typeof step2Schema>;
export type Step3Data = z.infer<typeof step3Schema>;
export type Step4Data = z.infer<typeof step4Schema>;
export type Step5Data = z.infer<typeof step5Schema>;
export type Step6Data = z.infer<typeof step6Schema>;
export type FullRecipeData = z.infer<typeof fullRecipeSchema>;

export const MEAL_TYPES = [
  { value: "breakfast", label: "Petit-déjeuner" },
  { value: "lunch", label: "Déjeuner" },
  { value: "dinner", label: "Dîner" },
  { value: "snack", label: "Snack" },
  { value: "dessert", label: "Dessert" },
] as const;

export const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Facile" },
  { value: "medium", label: "Moyen" },
  { value: "hard", label: "Difficile" },
] as const;

export const UNITS = [
  "g", "kg", "ml", "L", "cl",
  "cuillère à soupe", "cuillère à café",
  "tasse", "pincée", "unité(s)", "tranche(s)",
  "morceau(x)", "bouquet", "feuille(s)",
] as const;

/** Maps UNITS display labels → measurement_unit.code (FK in recipe_ingredient) */
export const UNIT_TO_CODE: Record<string, string> = {
  "g":                  "g",
  "kg":                 "kg",
  "ml":                 "ml",
  "L":                  "l",
  "cl":                 "cl",
  "cuillère à soupe":   "tbsp",
  "cuillère à café":    "tsp",
  "tasse":              "cup",
  "pincée":             "pinch",
  "unité(s)":           "unit",
  "tranche(s)":         "slice",
  "morceau(x)":         "piece",
  "bouquet":            "bunch",
  "feuille(s)":         "leaf",
};

/** Reverse map: measurement_unit.code → UNITS display label */
export const CODE_TO_UNIT: Record<string, string> = Object.fromEntries(
  Object.entries(UNIT_TO_CODE).map(([label, code]) => [code, label])
);
