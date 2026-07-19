import { z } from "zod";

export const CATEGORY_OPTIONS = [
  { value: "recette", label: "Recette" },
  { value: "culture", label: "Culture" },
  { value: "technique", label: "Technique" },
  { value: "ingredients", label: "Ingrédients" },
  { value: "parcours", label: "Parcours" },
  { value: "actualite", label: "Actualité" },
] as const;

const paragraphBlockSchema = z.object({
  id: z.string(),
  type: z.literal("paragraph"),
  text: z.string(),
});

const headingBlockSchema = z.object({
  id: z.string(),
  type: z.literal("heading"),
  level: z.union([z.literal(2), z.literal(3)]),
  text: z.string(),
});

const quoteBlockSchema = z.object({
  id: z.string(),
  type: z.literal("quote"),
  text: z.string(),
  author: z.string().optional(),
});

const dividerBlockSchema = z.object({
  id: z.string(),
  type: z.literal("divider"),
});

const imageBlockSchema = z.object({
  id: z.string(),
  type: z.literal("image"),
  url: z.string(),
  caption: z.string().optional(),
});

const imageGalleryBlockSchema = z.object({
  id: z.string(),
  type: z.literal("image_gallery"),
  urls: z.array(z.string()).min(2).max(4),
});

const videoEmbedBlockSchema = z.object({
  id: z.string(),
  type: z.literal("video_embed"),
  url: z.string(),
});

const recipeEmbedBlockSchema = z.object({
  id: z.string(),
  type: z.literal("recipe_embed"),
  recipe_id: z.string(),
  recipe_title: z.string(),
  recipe_image_url: z.string().nullable(),
});

export const postBlockSchema = z.discriminatedUnion("type", [
  paragraphBlockSchema,
  headingBlockSchema,
  quoteBlockSchema,
  dividerBlockSchema,
  imageBlockSchema,
  imageGalleryBlockSchema,
  videoEmbedBlockSchema,
  recipeEmbedBlockSchema,
]);

export type PostBlock = z.infer<typeof postBlockSchema>;

export const postContentSchema = z.object({
  title: z.string().min(3, "Minimum 3 caractères").max(120, "Maximum 120 caractères"),
  language: z.enum(["fr", "en"]),
  blocks: z.array(postBlockSchema),
});

export type PostContentData = z.infer<typeof postContentSchema>;

export const postSettingsSchema = z.object({
  category: z.enum(
    ["recette", "culture", "technique", "ingredients", "parcours", "actualite"],
    { message: "Sélectionne une catégorie" }
  ),
  tags: z.array(z.string()).max(8, "Maximum 8 tags"),
  excerpt: z.string().max(200, "Maximum 200 caractères"),
  seo_title: z.string().max(70, "Maximum 70 caractères"),
  seo_description: z.string().max(160, "Maximum 160 caractères"),
  visibility: z.enum(["public", "followers", "fans"]),
});

export type PostSettingsData = z.infer<typeof postSettingsSchema>;
