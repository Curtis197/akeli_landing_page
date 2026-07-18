import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { PostBlock } from "@/lib/validations/post.schema";

export type BlogFeedPost = {
  id: string;
  slug: string | null;
  cover_image_url: string | null;
  category: string | null;
  published_at: string | null;
  visibility: "public" | "followers" | "fans";
  can_read: boolean;
  title: string;
  excerpt: string | null;
  reading_time_min: number | null;
};

export type BlogPostDetail = {
  id: string;
  slug: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[];
  visibility: "public" | "followers" | "fans";
  published_at: string | null;
  view_count: number;
  recipe_embeds: string[];
  creator_id: string;
  creator_display_name: string | null;
  can_read: boolean;
  title: string;
  blocks: PostBlock[];
  excerpt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  reading_time_min: number | null;
};

export type EmbeddedRecipe = {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
};

// Called client-side by the feed (Task 5). can_read is computed per-row by
// the RPC using the caller's own auth.uid() — a non-qualifying or anonymous
// reader still gets every published post back, just with can_read=false on
// gated ones, so the feed can render them as locked teaser cards.
export async function fetchCreatorBlogFeed(creatorId: string): Promise<BlogFeedPost[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_creator_blog_feed", { p_creator_id: creatorId });
  if (error) throw error;
  return (data ?? []) as BlogFeedPost[];
}

// Accepts a pre-built client so the same helper works from the Server
// Component post page (cookie-aware @/lib/supabase/server client, so
// visibility reflects the actual logged-in viewer) without duplicating the
// RPC-shaping logic.
export async function fetchBlogPostForReaderServer(
  supabase: SupabaseClient,
  creatorId: string,
  slug: string
): Promise<BlogPostDetail | null> {
  const { data, error } = await supabase
    .rpc("get_blog_post_for_reader", { p_creator_id: creatorId, p_slug: slug })
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as any;
  return {
    id: row.id,
    slug: row.slug,
    cover_image_url: row.cover_image_url,
    category: row.category,
    tags: row.tags ?? [],
    visibility: row.visibility,
    published_at: row.published_at,
    view_count: row.view_count ?? 0,
    recipe_embeds: row.recipe_embeds ?? [],
    creator_id: row.creator_id,
    creator_display_name: row.creator_display_name,
    can_read: row.can_read,
    title: row.title ?? "",
    blocks: (row.content_json ?? []) as PostBlock[],
    excerpt: row.excerpt,
    seo_title: row.seo_title,
    seo_description: row.seo_description,
    reading_time_min: row.reading_time_min,
  };
}

export async function fetchEmbeddedRecipes(supabase: SupabaseClient, recipeIds: string[]): Promise<EmbeddedRecipe[]> {
  if (recipeIds.length === 0) return [];
  const { data, error } = await supabase
    .from("recipe")
    .select("id, slug, title, cover_image_url")
    .in("id", recipeIds)
    .eq("is_published", true);

  if (error) throw error;
  return data ?? [];
}
