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

export const step2Schema = z.object({
  ingredients: z
    .array(
      z.object({
        id: z.string(),
        ingredient_id: z.string().optional(),
        name: z.string().min(1),
        quantity: z.number().positive("Quantité invalide"),
        unit: z.string().min(1, "Unité requise"),
        is_optional: z.boolean().default(false),
        sort_order: z.number().int(),
      })
    )
    .min(3, "Minimum 3 ingrédients"),
});

export const step3Schema = z.object({
  steps: z
    .array(
      z.object({
        id: z.string(),
        content: z.string().min(10, "Étape trop courte (minimum 10 caractères)"),
        sort_order: z.number().int(),
      })
    )
    .min(3, "Minimum 3 étapes"),
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
