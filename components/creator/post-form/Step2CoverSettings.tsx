// components/creator/post-form/Step2CoverSettings.tsx
"use client";

import { useState } from "react";
import ImageDropzone from "@/components/shared/ImageDropzone";
import { CATEGORY_OPTIONS } from "@/lib/validations/post.schema";

interface Step2Data {
  cover_image_url: string;
  category: string;
  tags: string[];
  excerpt: string;
  seo_title: string;
  seo_description: string;
  visibility: "public" | "followers" | "fans";
}

interface Step2Props {
  data: Step2Data;
  onChange: (patch: Partial<Step2Data>) => void;
  postId: string | null;
}

export default function Step2CoverSettings({ data, onChange, postId }: Step2Props) {
  const [tagInput, setTagInput] = useState("");

  const addTag = () => {
    const value = tagInput.trim();
    if (!value || data.tags.includes(value) || data.tags.length >= 8) return;
    onChange({ tags: [...data.tags, value] });
    setTagInput("");
  };

  const removeTag = (tag: string) => onChange({ tags: data.tags.filter((t) => t !== tag) });

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-foreground">Couverture & Paramètres</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Photo de couverture</label>
        <ImageDropzone
          value={data.cover_image_url || null}
          onChange={(url) => onChange({ cover_image_url: url })}
          onRemove={() => onChange({ cover_image_url: "" })}
          uploadPath={`${postId ?? crypto.randomUUID()}/cover.webp`}
          bucket="post-images"
          label="Couverture"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Catégorie</label>
        <select
          value={data.category}
          onChange={(e) => onChange({ category: e.target.value })}
          className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Sélectionner...</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Tags</label>
          <span className="text-xs text-muted-foreground">{data.tags.length}/8</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Ajouter un tag..."
            disabled={data.tags.length >= 8}
            className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="button"
            onClick={addTag}
            disabled={data.tags.length >= 8}
            className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-secondary text-foreground">
                #{tag}
                <button type="button" onClick={() => removeTag(tag)} className="text-muted-foreground hover:text-destructive">✕</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Extrait (optionnel)</label>
        <textarea
          value={data.excerpt}
          onChange={(e) => onChange({ excerpt: e.target.value })}
          rows={2}
          maxLength={200}
          placeholder="Résumé affiché dans les listes d'articles..."
          className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">Accès</label>
        <div className="mt-2 flex gap-2">
          {(["public", "followers", "fans"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ visibility: v })}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                data.visibility === v
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-foreground hover:bg-secondary"
              }`}
            >
              {v === "public" ? "Public" : v === "followers" ? "Abonnés" : "Fans"}
            </button>
          ))}
        </div>
      </div>

      <details className="space-y-3">
        <summary className="text-sm font-medium text-foreground cursor-pointer">SEO (optionnel)</summary>
        <div className="mt-3 space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Titre SEO</label>
            <input
              type="text"
              value={data.seo_title}
              onChange={(e) => onChange({ seo_title: e.target.value })}
              maxLength={70}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Description SEO</label>
            <textarea
              value={data.seo_description}
              onChange={(e) => onChange({ seo_description: e.target.value })}
              rows={2}
              maxLength={160}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </details>
    </div>
  );
}
