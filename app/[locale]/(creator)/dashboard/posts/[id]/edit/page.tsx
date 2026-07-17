// app/[locale]/(creator)/dashboard/posts/[id]/edit/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PostWizard from "@/components/creator/post-form/PostWizard";
import type { PostFormState } from "@/components/creator/post-form/PostWizard";

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
  const supabase = createClient();

  const [initialData, setInitialData] = useState<Partial<PostFormState> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function loadPost() {
      const { data, error: err } = await supabase
        .from("blog_post")
        .select(`
          id, cover_image_url, category, tags, visibility, is_published, draft_data,
          blog_post_translation ( locale, title, content_json, excerpt, seo_title, seo_description )
        `)
        .eq("id", id)
        .single();

      if (err || !data) {
        setError("Article introuvable ou accès refusé.");
        setLoading(false);
        return;
      }

      setIsPublished((data as any).is_published ?? false);

      // A saved draft holds the full PostFormState verbatim (PostWizard stores it as-is).
      // Prefer it over live tables so in-progress edits survive a page reload.
      if ((data as any).draft_data && typeof (data as any).draft_data === "object") {
        setInitialData((data as any).draft_data as Partial<PostFormState>);
        setLoading(false);
        return;
      }

      const translation = ((data as any).blog_post_translation ?? [])[0];

      const mapped: Partial<PostFormState> = {
        title: translation?.title ?? "",
        language: (translation?.locale as "fr" | "en") ?? "fr",
        blocks: translation?.content_json ?? [],
        cover_image_url: (data as any).cover_image_url ?? "",
        category: (data as any).category ?? "",
        tags: (data as any).tags ?? [],
        excerpt: translation?.excerpt ?? "",
        seo_title: translation?.seo_title ?? "",
        seo_description: translation?.seo_description ?? "",
        visibility: (data as any).visibility ?? "public",
      };

      setInitialData(mapped);
      setLoading(false);
    }

    loadPost();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !initialData) {
    return (
      <div className="text-center py-16 space-y-2">
        <p className="text-foreground font-medium">{error ?? "Erreur inconnue"}</p>
        <a href="/dashboard/posts" className="text-sm text-primary hover:underline">
          ← Retour à mes articles
        </a>
      </div>
    );
  }

  return (
    <main className="py-6 px-4 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <a href="/dashboard/posts" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Mes articles
        </a>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-base font-semibold text-foreground truncate">
          Éditer — {initialData.title || "Sans titre"}
        </h1>
      </div>
      <PostWizard postId={id} initialData={initialData} initialIsPublished={isPublished} />
    </main>
  );
}
