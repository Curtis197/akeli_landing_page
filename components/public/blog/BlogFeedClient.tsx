"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { fetchCreatorBlogFeed } from "@/lib/queries/blog-posts";
import type { BlogFeedPost } from "@/lib/queries/blog-posts";
import Navbar from "@/components/layout/Navbar";

export default function BlogFeedClient() {
  const t = useTranslations("blog");
  const params = useParams();
  const creatorId = String(params.username);

  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [posts, setPosts] = useState<BlogFeedPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("creator").select("display_name").eq("id", creatorId).single(),
      fetchCreatorBlogFeed(creatorId),
    ]).then(([{ data: creator }, feedPosts]) => {
      setCreatorName(creator?.display_name ?? null);
      setPosts(feedPosts);
      setLoading(false);
    });
  }, [creatorId]);

  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          {t("feedTitle", { name: creatorName ?? "" })}
        </h1>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-secondary animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground">{t("noPosts")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {posts.map((post) => {
              const card = (
                <>
                  {post.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className={`w-full aspect-video object-cover ${post.can_read ? "" : "blur-md"}`}
                    />
                  ) : (
                    <div className="w-full aspect-video bg-secondary flex items-center justify-center text-3xl">📝</div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      {post.category && (
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {t(`categories.${post.category}` as any)}
                        </span>
                      )}
                      {!post.can_read && (
                        <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          🔒 {t("gatedTitle")}
                        </span>
                      )}
                    </div>
                    <h2 className="font-semibold text-foreground line-clamp-2">{post.title}</h2>
                    {post.can_read && post.excerpt && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.excerpt}</p>
                    )}
                    {post.can_read && post.reading_time_min != null && (
                      <p className="text-xs text-muted-foreground mt-2">{t("minRead", { min: post.reading_time_min })}</p>
                    )}
                  </div>
                </>
              );

              return post.can_read ? (
                <Link
                  key={post.id}
                  href={`/creator/${creatorId}/blog/${post.slug}`}
                  className="rounded-xl border border-border overflow-hidden hover:shadow-md transition-shadow"
                >
                  {card}
                </Link>
              ) : (
                <div key={post.id} className="rounded-xl border border-border overflow-hidden opacity-90">
                  {card}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
