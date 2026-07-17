// components/creator/post-form/PostWizard.tsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { slugify } from "@/lib/utils/slugify";
import { computeReadingTimeMin } from "@/lib/utils/reading-time";
import type { PostBlock } from "@/lib/validations/post.schema";
import Step1Content from "./Step1Content";
import Step2CoverSettings from "./Step2CoverSettings";
import Step3Publish from "./Step3Publish";

export interface PostFormState {
  title: string;
  language: "fr" | "en";
  blocks: PostBlock[];
  cover_image_url: string;
  category: string;
  tags: string[];
  excerpt: string;
  seo_title: string;
  seo_description: string;
  visibility: "public" | "followers" | "fans";
}

const STEP_LABELS = ["Contenu", "Couverture & Paramètres", "Publication"];

interface PostWizardProps {
  postId?: string;
  initialData?: Partial<PostFormState>;
  initialIsPublished?: boolean;
}

export default function PostWizard({ postId, initialData, initialIsPublished }: PostWizardProps) {
  const router = useRouter();
  const supabase = createClient();
  const { creator } = useAuthStore();
  const siteLocale = useLocale();

  const [currentStep, setCurrentStep] = useState(1);
  const [formState, setFormState] = useState<PostFormState>({
    title: "",
    language: siteLocale === "en" ? "en" : "fr",
    blocks: [],
    cover_image_url: "",
    category: "",
    tags: [],
    excerpt: "",
    seo_title: "",
    seo_description: "",
    visibility: "public",
    ...initialData,
  });
  const [draftId, setDraftId] = useState<string | null>(postId ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const isDirtyRef = useRef(false);
  const [isLivePublished] = useState<boolean>(initialIsPublished ?? false);

  // ── Save translation row (title, content, excerpt, SEO, reading time) ────────
  // Looked up by post_id ALONE (not post_id + locale): a post has exactly one
  // translation row for now (Phase 1's single-locale decision). If the creator
  // changes the language dropdown mid-draft, this must update that same row's
  // locale rather than search for a row under the new locale (which wouldn't
  // exist yet) and insert a duplicate.
  //
  // This is a check-then-act (SELECT existing row, then INSERT or UPDATE) with
  // no DB-level uniqueness on post_id alone to backstop it. It has two callers —
  // savePostRow's internal sync call, and handlePublish's direct call to
  // re-materialize on publish — and nothing stops those from overlapping (e.g.
  // a step tab clicked while a publish is in flight). translationChainRef
  // serializes every call to this function specifically, regardless of which
  // caller triggered it, so two invocations can never both see "no existing
  // row" and both INSERT.
  const translationChainRef = useRef<Promise<unknown>>(Promise.resolve());

  const saveTranslation = useCallback(
    (id: string, data: PostFormState): Promise<void> => {
      const run = async (): Promise<void> => {
        const reading_time_min = computeReadingTimeMin(data.blocks);
        const { data: existing } = await supabase
          .from("blog_post_translation")
          .select("id")
          .eq("post_id", id)
          .maybeSingle();

        const payload = {
          post_id: id,
          locale: data.language,
          title: data.title || "Brouillon",
          content_json: data.blocks,
          excerpt: data.excerpt || null,
          seo_title: data.seo_title || null,
          seo_description: data.seo_description || null,
          reading_time_min,
        };

        if (existing) {
          const { error } = await supabase.from("blog_post_translation").update(payload).eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("blog_post_translation").insert(payload);
          if (error) throw error;
        }
      };

      const result = translationChainRef.current.then(run, run);
      translationChainRef.current = result.catch(() => {});
      return result;
    },
    [supabase]
  );

  // ── Save post row ──────────────────────────────────────────────────────────
  // savingChainRef serializes every call (autosave, handleNext/handleStepClick,
  // and handlePublish all funnel through here): saveTranslation below is a
  // check-then-act (SELECT existing row, then INSERT or UPDATE) with no DB-level
  // uniqueness on post_id alone to backstop it, so two overlapping calls could
  // both see "no existing row" and both INSERT, leaving two translation rows
  // for one post and silently breaking every save after that. Chaining onto a
  // running promise guarantees calls execute one at a time, in order, with none
  // dropped — a "skip if busy" guard would instead lose whichever edit lost the
  // race.
  const savingChainRef = useRef<Promise<unknown>>(Promise.resolve());

  const savePostRow = useCallback(
    (data: PostFormState): Promise<string | null> => {
      const run = async (): Promise<string | null> => {
        if (!creator) return null;

        // Published posts: work-in-progress goes to draft_data ONLY — the live row
        // must not change until Publish materializes it explicitly.
        if (draftId && isLivePublished) {
          const { error } = await supabase.from("blog_post").update({ draft_data: data }).eq("id", draftId);
          if (error) throw error;
          return draftId;
        }

        const payload = {
          creator_id: creator.id,
          cover_image_url: data.cover_image_url || null,
          category: data.category || null,
          tags: data.tags,
          visibility: data.visibility,
          draft_data: data,
        };

        let id: string;
        if (draftId) {
          const { error } = await supabase.from("blog_post").update(payload).eq("id", draftId);
          if (error) throw error;
          id = draftId;
        } else {
          const { data: newPost, error } = await supabase.from("blog_post").insert(payload).select("id").single();
          if (error) throw error;
          if (!newPost) return null;
          setDraftId(newPost.id);
          id = newPost.id;
        }

        // Never-published posts keep live tables continuously in sync (matches
        // RecipeWizard's behavior — draft_data is belt-and-suspenders, not the
        // only copy, until the post has actually gone live once).
        await saveTranslation(id, data);
        return id;
      };

      const result = savingChainRef.current.then(run, run);
      savingChainRef.current = result.catch(() => {});
      return result;
    },
    [creator, draftId, isLivePublished, supabase, saveTranslation]
  );

  const saveDraft = useCallback(
    async (data: PostFormState) => {
      setIsSaving(true);
      try {
        await savePostRow(data);
        setLastSaved(new Date());
        isDirtyRef.current = false;
      } catch (err) {
        console.error("Save failed:", err);
      } finally {
        setIsSaving(false);
      }
    },
    [savePostRow]
  );

  // ── Auto-save every 30s ────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (isDirtyRef.current) saveDraft(formState);
    }, 30000);
    return () => clearInterval(interval);
  }, [formState, saveDraft]);

  const updateForm = useCallback((patch: Partial<PostFormState>) => {
    setFormState((prev) => ({ ...prev, ...patch }));
    isDirtyRef.current = true;
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = async () => {
    await saveDraft(formState);
    if (currentStep < 3) setCurrentStep((s) => s + 1);
  };
  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };
  const handleStepClick = async (target: number) => {
    if (target === currentStep) return;
    await saveDraft(formState);
    setCurrentStep(target);
  };

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = async (publish: boolean) => {
    setIsPublishing(true);
    setPublishError(null);
    try {
      const id = await savePostRow(formState);
      if (!id) return;

      if (publish) {
        await saveTranslation(id, formState);

        const recipe_embeds = formState.blocks
          .filter((b): b is Extract<PostBlock, { type: "recipe_embed" }> => b.type === "recipe_embed" && !!b.recipe_id)
          .map((b) => b.recipe_id);

        const slug = slugify(formState.title, id);

        const { error: pubError } = await supabase
          .from("blog_post")
          .update({
            cover_image_url: formState.cover_image_url || null,
            category: formState.category || null,
            tags: formState.tags,
            visibility: formState.visibility,
            recipe_embeds,
            slug,
            is_published: true,
            published_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (pubError) throw pubError;
      }

      router.push("/dashboard/posts");
    } catch (err) {
      console.error("Publish failed:", err);
      setPublishError("La publication a échoué — aucune donnée n'a été perdue. Réessayez.");
    } finally {
      setIsPublishing(false);
    }
  };

  const savedLabel = (() => {
    if (isSaving) return "Sauvegarde...";
    if (!lastSaved) return "";
    const s = Math.round((Date.now() - lastSaved.getTime()) / 1000);
    return s < 60 ? `Sauvé il y a ${s}s` : `Sauvé il y a ${Math.round(s / 60)}min`;
  })();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="hidden sm:flex items-center gap-1">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const isActive = step === currentStep;
          const isDone = step < currentStep;
          return (
            <button
              key={step}
              onClick={() => handleStepClick(step)}
              className={`flex-1 py-2 px-2 text-xs font-medium rounded-md transition-colors truncate ${
                isActive ? "bg-primary text-primary-foreground" : isDone ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {step}. {label}
            </button>
          );
        })}
      </div>
      <div className="sm:hidden mb-2">
        <span className="text-sm font-medium text-foreground">
          Étape {currentStep} — {STEP_LABELS[currentStep - 1]}
        </span>
      </div>

      <div className="mt-8">
        {currentStep === 1 && (
          <Step1Content
            data={formState}
            onChange={updateForm}
            postId={draftId}
            creatorId={creator?.id ?? ""}
          />
        )}
        {currentStep === 2 && (
          <Step2CoverSettings data={formState} onChange={updateForm} postId={draftId} />
        )}
        {currentStep === 3 && (
          <Step3Publish
            data={formState}
            onSaveDraft={() => handlePublish(false)}
            onPublish={() => handlePublish(true)}
            isPublished={isLivePublished}
            isPublishing={isPublishing}
          />
        )}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        {publishError && <p className="text-sm text-red-600 mr-4">{publishError}</p>}
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Précédent
        </button>
        <span className="text-xs text-muted-foreground">{savedLabel}</span>
        {currentStep < 3 && (
          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Suivant →
          </button>
        )}
      </div>
    </div>
  );
}
