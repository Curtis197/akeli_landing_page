import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import RecipeDetailClient from "./RecipeDetailClient";

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;

  const { data: recipe } = await supabase()
    .from("recipe")
    .select("id, title, description, cover_image_url")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!recipe) notFound();

  const { data: translation } = await supabase()
    .from("recipe_translation")
    .select("title, description")
    .eq("recipe_id", recipe.id)
    .eq("locale", locale)
    .maybeSingle();

  const title = translation?.title ?? recipe.title;
  const description = translation?.description ?? recipe.description ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: recipe.cover_image_url ? [{ url: recipe.cover_image_url }] : undefined,
    },
  };
}

export default function RecipeDetailPage() {
  return <RecipeDetailClient />;
}
