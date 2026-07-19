import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.a-keli.com";
const locales = ["fr", "en"] as const;

const staticPaths = [
  "",
  "/about",
  "/become-creator",
  "/creators",
  "/recipes",
  "/legal/terms",
  "/legal/privacy",
  "/legal/mentions",
];

function pathEntries(path: string): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(
    locales.map((locale) => [locale, `${siteUrl}/${locale}${path}`])
  );
  return locales.map((locale) => ({
    url: `${siteUrl}/${locale}${path}`,
    alternates: { languages },
  }));
}

async function fetchDynamicPaths(): Promise<string[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  );

  const [recipes, creators] = await Promise.all([
    supabase.from("recipe").select("slug").eq("is_published", true),
    supabase.from("creator").select("id, recipe_count").gt("recipe_count", 0),
  ]);

  const recipePaths = (recipes.data ?? [])
    .filter((r) => r.slug)
    .map((r) => `/recipe/${r.slug}`);
  const creatorPaths = (creators.data ?? []).map((c) => `/creator/${c.id}`);

  return [...recipePaths, ...creatorPaths];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let dynamicPaths: string[] = [];
  try {
    dynamicPaths = await fetchDynamicPaths();
  } catch {
    // Supabase hiccup — ship the static sitemap rather than fail the route.
  }

  return [...staticPaths, ...dynamicPaths].flatMap(pathEntries);
}
