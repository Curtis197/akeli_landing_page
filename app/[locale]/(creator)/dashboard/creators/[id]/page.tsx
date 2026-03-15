"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import {
  getExistingDirectConversation,
  createDirectConversation,
} from "@/lib/queries/chat";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreatorProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  profile_image_url: string | null;
  heritage_region: string | null;
  specialties: string[];
  recipe_count: number;
  fan_count: number;
}

interface RecipeTeaser {
  id: string;
  slug: string | null;
  title: string;
  cover_image_url: string | null;
  difficulty: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
}

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Facile",
  medium: "Moyen",
  hard: "Difficile",
};

const FAN_MODE_THRESHOLD = 30;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreatorDetailPage() {
  const params = useParams();
  const creatorId = String(params.id);
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuthStore();

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [recipes, setRecipes] = useState<RecipeTeaser[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [existingConvId, setExistingConvId] = useState<string | null>(null);
  const [convClosed, setConvClosed] = useState(false);
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteConv, setConfirmDeleteConv] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase
        .from("creator")
        .select(
          "id, user_id, display_name, username, bio, profile_image_url, heritage_region, specialties, recipe_count, fan_count"
        )
        .eq("id", creatorId)
        .single(),
      supabase
        .from("recipe")
        .select("id, slug, title, cover_image_url, difficulty, prep_time_min, cook_time_min")
        .eq("creator_id", creatorId)
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
    ]).then(([creatorRes, recipesRes]) => {
      if (!creatorRes.data) {
        setNotFound(true);
      } else {
        setCreator({
          ...creatorRes.data,
          specialties: creatorRes.data.specialties ?? [],
          recipe_count: creatorRes.data.recipe_count ?? 0,
          fan_count: creatorRes.data.fan_count ?? 0,
        });
      }
      if (recipesRes.data) setRecipes(recipesRes.data as RecipeTeaser[]);
      setLoading(false);
    });
  }, [creatorId, supabase]);

  // Load existing conversation state
  useEffect(() => {
    if (!user?.id || !creator?.user_id) return;
    getExistingDirectConversation(supabase, user.id, creator.user_id).then(async (convId) => {
      if (!convId) return;
      setExistingConvId(convId);
      const { data } = await supabase
        .from("conversation")
        .select("closed_at")
        .eq("id", convId)
        .single();
      setConvClosed(!!data?.closed_at);
    });
  }, [creator?.user_id, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleMessage() {
    if (!user?.id || !creator?.user_id || messaging) return;
    setMessaging(true);
    try {
      if (existingConvId) {
        router.push(`/chat/${existingConvId}` as any);
      } else {
        const newId = await createDirectConversation(supabase, user.id, creator.user_id);
        router.push(`/chat/${newId}` as any);
      }
    } catch (err) {
      console.error("Failed to open conversation:", err);
      setMessaging(false);
    }
  }

  async function handleCloseConversation() {
    if (!existingConvId || closing) return;
    setClosing(true);
    const { error } = await supabase
      .from("conversation")
      .update({ closed_at: new Date().toISOString() })
      .eq("id", existingConvId);
    if (!error) setConvClosed(true);
    setClosing(false);
  }

  async function handleDeleteConversation() {
    if (!existingConvId || deleting) return;
    setDeleting(true);
    try {
      // Delete child records first in case FK lacks CASCADE
      await supabase.from("chat_message").delete().eq("conversation_id", existingConvId);
      await supabase.from("conversation_participant").delete().eq("conversation_id", existingConvId);
      const { error } = await supabase.from("conversation").delete().eq("id", existingConvId);
      if (error) throw error;
      setExistingConvId(null);
      setConvClosed(false);
      setConfirmDeleteConv(false);
    } catch (err) {
      console.error("Delete conversation failed:", err);
      alert("La suppression a échoué. Veuillez réessayer.");
    } finally {
      setDeleting(false);
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-32 rounded-2xl bg-secondary animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-secondary animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !creator) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-4xl">😕</p>
        <p className="text-lg font-semibold text-foreground">Créateur introuvable</p>
        <Link href="/chat" className="text-sm text-primary hover:underline">
          ← Retour aux messages
        </Link>
      </div>
    );
  }

  const initials = (creator.display_name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const fanMode = creator.recipe_count >= FAN_MODE_THRESHOLD;
  const isOwnProfile = user?.id === creator.user_id;

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link
        href="/chat"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Messages
      </Link>

      {/* Profile header */}
      <section className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Avatar */}
        {creator.profile_image_url ? (
          <img
            src={creator.profile_image_url}
            alt={creator.display_name ?? ""}
            className="w-24 h-24 rounded-full object-cover border-4 border-border shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-secondary border-4 border-border flex items-center justify-center text-2xl font-bold text-muted-foreground shrink-0">
            {initials}
          </div>
        )}

        <div className="flex-1 space-y-3">
          {/* Name + badges */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">
                {creator.display_name ?? "Créateur"}
              </h1>
              {fanMode && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  ⭐ Mode Fan
                </span>
              )}
            </div>
            {creator.username && (
              <p className="text-sm text-muted-foreground">@{creator.username}</p>
            )}
            {creator.heritage_region && (
              <p className="text-sm text-muted-foreground">📍 {creator.heritage_region}</p>
            )}
          </div>

          {/* Bio */}
          {creator.bio && (
            <p className="text-sm text-foreground leading-relaxed max-w-xl">{creator.bio}</p>
          )}

          {/* Specialties */}
          {creator.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {creator.specialties.map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-foreground border border-border"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{creator.recipe_count}</strong>{" "}
              recette{creator.recipe_count !== 1 ? "s" : ""}
            </span>
            {creator.fan_count > 0 && (
              <span>
                <strong className="text-foreground">{creator.fan_count}</strong> fan
                {creator.fan_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1 flex-wrap">
            {!isOwnProfile && (
              <>
                {convClosed ? (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-destructive/40 bg-destructive/5 text-destructive text-sm font-medium">
                    Conversation terminée
                  </span>
                ) : (
                  <button
                    onClick={handleMessage}
                    disabled={messaging}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {messaging ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "✉️"
                    )}
                    {existingConvId ? "Ouvrir la conversation" : "Envoyer un message"}
                  </button>
                )}
                {existingConvId && !convClosed && (
                  <button
                    onClick={handleCloseConversation}
                    disabled={closing}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-destructive text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    {closing ? "Fermeture…" : "Terminer la conversation"}
                  </button>
                )}
                {existingConvId && (
                  <button
                    onClick={() => setConfirmDeleteConv(true)}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-destructive/60 text-destructive text-sm font-semibold hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    Supprimer la conversation
                  </button>
                )}
              </>
            )}
            <Link
              href={`/creator/${creatorId}` as any}
              className="px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Voir le profil public →
            </Link>
          </div>
        </div>
      </section>

      {/* Recipes */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">
          Recettes publiées{creator.display_name ? ` par ${creator.display_name.split(" ")[0]}` : ""}
        </h2>

        {recipes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <p className="text-sm text-muted-foreground">Aucune recette publiée pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </section>

      {/* Delete conversation dialog */}
      {confirmDeleteConv && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setConfirmDeleteConv(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-base font-semibold text-foreground">Supprimer la conversation ?</h2>
              <p className="text-sm text-muted-foreground">
                Tous les messages seront définitivement supprimés. Cette action est irréversible.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setConfirmDeleteConv(false)}
                  className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteConversation}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Suppression…" : "Supprimer"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── RecipeCard ───────────────────────────────────────────────────────────────

function RecipeCard({ recipe }: { recipe: RecipeTeaser }) {
  const totalMin = (recipe.prep_time_min ?? 0) + (recipe.cook_time_min ?? 0);
  const timeLabel =
    totalMin >= 60
      ? `${Math.floor(totalMin / 60)}h${totalMin % 60 > 0 ? `${totalMin % 60}min` : ""}`
      : totalMin > 0
      ? `${totalMin} min`
      : null;

  return (
    <Link
      href={(recipe.slug ? `/recipe/${recipe.slug}` : "#") as any}
      className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-md hover:border-primary/30 transition-all"
    >
      {recipe.cover_image_url ? (
        <img
          src={recipe.cover_image_url}
          alt={recipe.title}
          className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-40 bg-secondary flex items-center justify-center text-4xl">
          🍽️
        </div>
      )}
      <div className="p-4 space-y-1">
        <p className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {recipe.title}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          {recipe.difficulty && (
            <span>{DIFFICULTY_LABELS[recipe.difficulty] ?? recipe.difficulty}</span>
          )}
          {recipe.difficulty && timeLabel && <span>·</span>}
          {timeLabel && <span>{timeLabel}</span>}
        </div>
      </div>
    </Link>
  );
}
