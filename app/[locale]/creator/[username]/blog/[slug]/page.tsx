import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { Link } from "@/lib/i18n/navigation";
import { fetchBlogPostForReaderServer, fetchEmbeddedRecipes } from "@/lib/queries/blog-posts";
import type { EmbeddedRecipe } from "@/lib/queries/blog-posts";
import PostBlockView from "@/components/public/blog/PostBlockView";
import TrackPostView from "@/components/public/blog/TrackPostView";
import Navbar from "@/components/layout/Navbar";

function metadataSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string; slug: string; locale: string }>;
}): Promise<Metadata> {
  const { username, slug, locale } = await params;

  // Teaser metadata (title/cover/excerpt) is fine to expose in Open Graph
  // regardless of gating — real-world subscription content previews the
  // same way when shared on social media. Full content_json is never
  // requested here.
  //
  // Deliberately routed through the get_blog_post_for_reader RPC rather
  // than a direct blog_post/blog_post_translation select: blog_post's RLS
  // only grants SELECT on is_published+visibility='public' rows to
  // non-owning callers, so a direct select for a 'followers'/'fans' post
  // returns 0 rows for every anonymous/non-qualifying viewer. That made
  // `post` null and triggered notFound() from inside generateMetadata,
  // which — confirmed via manual browser verification — swaps the whole
  // route to Next's real not-found page after hydration, even though the
  // page body below renders a correct gated teaser. The RPC is SECURITY
  // DEFINER and always returns title/excerpt/seo_title/seo_description/
  // cover_image_url regardless of the caller's access; only content_json
  // is withheld for non-qualifying readers.
  const { data: post } = (await metadataSupabase()
    .rpc("get_blog_post_for_reader", { p_creator_id: username, p_slug: slug })
    .maybeSingle()) as { data: any };

  if (!post) notFound();

  const title = post.seo_title || post.title || "Article";
  const description = post.seo_description || post.excerpt || undefined;
  const ogLocale = post.locale === "en" ? "en_US" : "fr_FR";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      locale: ogLocale,
      images: post.cover_image_url ? [{ url: post.cover_image_url }] : undefined,
      publishedTime: post.published_at ?? undefined,
    },
    alternates: {
      canonical: `/creator/${username}/blog/${slug}`,
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ username: string; slug: string }>;
}) {
  const { username, slug } = await params;
  const t = await getTranslations("blog");

  const supabase = await createServerClient();
  const post = await fetchBlogPostForReaderServer(supabase, username, slug);

  if (!post) notFound();

  let embeddedRecipes = new Map<string, EmbeddedRecipe>();
  if (post.can_read && post.recipe_embeds.length > 0) {
    const recipes = await fetchEmbeddedRecipes(supabase, post.recipe_embeds);
    embeddedRecipes = new Map(recipes.map((r) => [r.id, r]));
  }

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <Link href={`/creator/${username}/blog`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {t("backToBlog")}
        </Link>

        {post.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image_url}
            alt={post.title}
            className={`w-full aspect-video object-cover rounded-xl mt-4 mb-6 ${post.can_read ? "" : "blur-md"}`}
          />
        )}

        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
          {post.category && <span>{t(`categories.${post.category}` as any)}</span>}
          {post.can_read && post.reading_time_min != null && <span>· {t("minRead", { min: post.reading_time_min })}</span>}
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">{post.title}</h1>

        {post.creator_display_name && (
          <p className="text-sm text-muted-foreground mb-8">{t("byAuthor", { name: post.creator_display_name })}</p>
        )}

        {post.can_read ? (
          <article>
            {post.blocks.map((block) => (
              <PostBlockView key={block.id} block={block} embeddedRecipes={embeddedRecipes} viewRecipeLabel={t("viewRecipe")} />
            ))}
          </article>
        ) : (
          <div className="rounded-xl border border-border p-6 text-center space-y-3">
            <p className="font-medium text-foreground">
              {post.visibility === "fans"
                ? t("gatedFans", { name: post.creator_display_name ?? "" })
                : t("gatedFollowers", { name: post.creator_display_name ?? "" })}
            </p>
            <Link href={`/creator/${username}`} className="inline-block text-sm text-primary hover:underline">
              {t("gatedCta", { name: post.creator_display_name ?? "" })}
            </Link>
          </div>
        )}
      </main>

      {post.can_read && <TrackPostView postId={post.id} />}
    </>
  );
}
