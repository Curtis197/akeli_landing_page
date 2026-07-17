// app/[locale]/(creator)/dashboard/posts/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { CATEGORY_OPTIONS } from "@/lib/validations/post.schema";

type StatusFilter = "all" | "published" | "draft";

interface Post {
  id: string;
  is_published: boolean;
  category: string | null;
  view_count: number;
  created_at: string;
  slug: string | null;
  blog_post_translation: { title: string }[];
}

export default function PostsListPage() {
  const supabase = createClient();
  const router = useRouter();
  const { creator } = useAuthStore();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!creator) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from("blog_post")
        .select("id, is_published, category, view_count, created_at, slug, blog_post_translation ( title )")
        .eq("creator_id", creator.id)
        .order("created_at", { ascending: false });
      if (data) setPosts(data as any);
    } finally {
      setLoading(false);
    }
  }, [creator, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function titleOf(post: Post) {
    return post.blog_post_translation?.[0]?.title || "Sans titre";
  }

  // Only ever flips is_published directly — never call this to publish a post
  // that hasn't gone through PostWizard's handlePublish at least once (i.e. has
  // no slug yet). That flow is the only place slug/published_at/recipe_embeds
  // get materialized; a bare is_published flip on a never-published draft would
  // mark it live with slug = NULL, which the Phase-1 newsletter trigger reads
  // as a genuine publish transition (sending a broken link) and which Phase 3's
  // public post page won't be able to resolve at all. Unpublishing, and
  // re-publishing a post that already has a slug, are always safe.
  async function togglePublish(id: string, currentlyPublished: boolean) {
    setActionLoading(id);
    try {
      await supabase.from("blog_post").update({ is_published: !currentlyPublished }).eq("id", id);
      setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, is_published: !currentlyPublished } : p)));
    } finally {
      setActionLoading(null);
    }
  }

  async function deletePost(id: string) {
    setActionLoading(id);
    try {
      await supabase.from("blog_post").delete().eq("id", id);
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  }

  const displayed = posts.filter((p) => {
    if (statusFilter === "published" && !p.is_published) return false;
    if (statusFilter === "draft" && p.is_published) return false;
    if (search && !titleOf(p).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categoryLabel = (value: string | null) =>
    CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? value ?? "";

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4" style={{ borderBottom: "2px solid var(--color-brand-dark)", paddingBottom: "1.25rem" }}>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">Espace Créateur</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground" style={{ fontFamily: "var(--font-display)" }}>
            Mes Articles
          </h1>
        </div>
        <Link
          href="/dashboard/posts/new"
          className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ background: "var(--color-brand-dark)", color: "var(--color-brand-cream)" }}
        >
          + Nouvel article
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["all", "published", "draft"] as StatusFilter[]).map((s) => {
            const labels = { all: "Tous", published: "Publiés", draft: "Brouillons" };
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={"px-3 py-1.5 text-xs font-medium transition-colors " + (statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary")}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-xl bg-secondary animate-pulse" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
          <p className="text-4xl">✍️</p>
          <p className="font-semibold text-foreground">{posts.length === 0 ? "Aucun article pour le moment" : "Aucun résultat"}</p>
          {posts.length === 0 && (
            <Link
              href="/dashboard/posts/new"
              className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "var(--color-brand-dark)", color: "var(--color-brand-cream)" }}
            >
              + Écrire mon premier article
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {displayed.map((post) => (
            <li key={post.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors">
              <div
                className="flex-1 min-w-0 space-y-1 cursor-pointer"
                onClick={() => router.push(("/dashboard/posts/" + post.id + "/edit") as any)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground truncate">{titleOf(post)}</span>
                  <span className={"px-2 py-0.5 rounded-full text-[10px] font-medium " + (post.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")}>
                    {post.is_published ? "Publié" : "Brouillon"}
                  </span>
                  {post.category && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-muted-foreground">
                      {categoryLabel(post.category)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {post.is_published && <span>{post.view_count} vue{post.view_count !== 1 ? "s" : ""}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => router.push(("/dashboard/posts/" + post.id + "/edit") as any)}
                  disabled={actionLoading === post.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-secondary disabled:opacity-40"
                >
                  Éditer
                </button>
                <button
                  onClick={() =>
                    post.is_published || post.slug
                      ? togglePublish(post.id, post.is_published)
                      : router.push(("/dashboard/posts/" + post.id + "/edit") as any)
                  }
                  disabled={actionLoading === post.id}
                  title={!post.is_published && !post.slug ? "Termine la publication depuis l'éditeur" : undefined}
                  className={"px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-40 " + (post.is_published ? "border border-destructive text-destructive hover:bg-destructive/10" : "bg-primary text-primary-foreground hover:bg-primary/90")}
                >
                  {post.is_published ? "Dépublier" : "Publier"}
                </button>
                <button
                  onClick={() => setConfirmDelete(post.id)}
                  disabled={actionLoading === post.id}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setConfirmDelete(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">Supprimer l'article ?</h2>
              <p className="text-sm text-muted-foreground">Cette action est irréversible.</p>
              <div className="flex items-center gap-3 justify-end">
                <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors">
                  Annuler
                </button>
                <button
                  onClick={() => deletePost(confirmDelete)}
                  disabled={actionLoading === confirmDelete}
                  className="px-4 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {actionLoading === confirmDelete ? "Suppression..." : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
