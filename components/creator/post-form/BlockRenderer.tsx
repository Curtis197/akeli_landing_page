// components/creator/post-form/BlockRenderer.tsx
"use client";

import { useState } from "react";
import ImageDropzone from "@/components/shared/ImageDropzone";
import RecipeEmbedPicker from "./RecipeEmbedPicker";
import type { PostBlock } from "@/lib/validations/post.schema";
import type { CreatorRecipeResult } from "@/lib/queries/creator-recipes";

interface BlockRendererProps {
  block: PostBlock;
  postId: string | null;
  creatorId: string;
  onChange: (updated: PostBlock) => void;
  onRemove: () => void;
}

function youtubeEmbedUrl(url: string): string | null {
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
  return null;
}

export default function BlockRenderer({ block, postId, creatorId, onChange, onRemove }: BlockRendererProps) {
  const [pickingRecipe, setPickingRecipe] = useState(false);

  const wrapper = (content: React.ReactNode, label: string) => (
    <div className="rounded-lg border border-border bg-background p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <button type="button" onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive">
          ✕
        </button>
      </div>
      {content}
    </div>
  );

  switch (block.type) {
    case "paragraph":
      return wrapper(
        <textarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          rows={4}
          placeholder="Écris ton paragraphe... (**gras**, *italique*)"
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
        />,
        "Paragraphe"
      );

    case "heading":
      return wrapper(
        <div className="flex gap-2">
          <select
            value={block.level}
            onChange={(e) => onChange({ ...block, level: Number(e.target.value) as 2 | 3 })}
            className="px-2 py-2 rounded-lg border border-input bg-background text-sm text-foreground"
          >
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            type="text"
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            placeholder="Titre de section"
            className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>,
        "Titre"
      );

    case "quote":
      return wrapper(
        <div className="space-y-2">
          <textarea
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            rows={2}
            placeholder="Citation..."
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <input
            type="text"
            value={block.author ?? ""}
            onChange={(e) => onChange({ ...block, author: e.target.value })}
            placeholder="Auteur (optionnel)"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>,
        "Citation"
      );

    case "divider":
      return wrapper(<hr className="border-border" />, "Séparateur");

    case "image":
      return wrapper(
        <div className="space-y-2">
          <ImageDropzone
            value={block.url || null}
            onChange={(url) => onChange({ ...block, url })}
            onRemove={() => onChange({ ...block, url: "" })}
            uploadPath={`${postId ?? crypto.randomUUID()}/block_${block.id}.webp`}
            bucket="post-images"
            aspectClassName="aspect-video"
          />
          <input
            type="text"
            value={block.caption ?? ""}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
            placeholder="Légende (optionnel)"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>,
        "Image"
      );

    case "image_gallery":
      return wrapper(<ImageGalleryEditor block={block} postId={postId} onChange={onChange} />, "Galerie");

    case "video_embed": {
      const embedUrl = youtubeEmbedUrl(block.url);
      return wrapper(
        <div className="space-y-2">
          <input
            type="text"
            value={block.url}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            placeholder="URL YouTube ou TikTok"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {block.url && (
            embedUrl ? (
              <div className="aspect-video rounded-lg overflow-hidden border border-border">
                <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="Vidéo intégrée" />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Lien non reconnu comme YouTube — sera affiché comme un simple lien : {block.url}
              </p>
            )
          )}
        </div>,
        "Vidéo"
      );
    }

    case "recipe_embed":
      return wrapper(
        block.recipe_id ? (
          <div className="flex items-center gap-3 p-2 rounded-lg border border-border">
            {block.recipe_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={block.recipe_image_url} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded bg-secondary shrink-0 flex items-center justify-center">🍽️</div>
            )}
            <span className="flex-1 text-sm font-medium text-foreground truncate">{block.recipe_title}</span>
            <button
              type="button"
              onClick={() => onChange({ ...block, recipe_id: "", recipe_title: "", recipe_image_url: null })}
              className="text-xs text-primary hover:underline"
            >
              Changer
            </button>
          </div>
        ) : pickingRecipe ? (
          <div className="space-y-2">
            <RecipeEmbedPicker
              creatorId={creatorId}
              onSelect={(recipe: CreatorRecipeResult) => {
                onChange({
                  ...block,
                  recipe_id: recipe.id,
                  recipe_title: recipe.title,
                  recipe_image_url: recipe.cover_image_url,
                });
                setPickingRecipe(false);
              }}
            />
            <button
              type="button"
              onClick={() => setPickingRecipe(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPickingRecipe(true)}
            className="w-full py-2 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            + Choisir une recette à intégrer
          </button>
        ),
        "Recette intégrée"
      );

    default:
      return null;
  }
}

function ImageGalleryEditor({
  block,
  postId,
  onChange,
}: {
  block: Extract<PostBlock, { type: "image_gallery" }>;
  postId: string | null;
  onChange: (updated: PostBlock) => void;
}) {
  const [slotIds, setSlotIds] = useState<string[]>(() => block.urls.map(() => crypto.randomUUID()));

  const setUrlAt = (index: number, url: string) => {
    const urls = [...block.urls];
    urls[index] = url;
    onChange({ ...block, urls });
  };

  const removeAt = (index: number) => {
    onChange({ ...block, urls: block.urls.filter((_, i) => i !== index) });
    setSlotIds((prev) => prev.filter((_, i) => i !== index));
  };

  const addSlot = () => {
    if (block.urls.length >= 4) return;
    onChange({ ...block, urls: [...block.urls, ""] });
    setSlotIds((prev) => [...prev, crypto.randomUUID()]);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {block.urls.map((url, i) => (
          <div key={slotIds[i] ?? i} className="relative">
            <ImageDropzone
              value={url || null}
              onChange={(u) => setUrlAt(i, u)}
              onRemove={() => removeAt(i)}
              uploadPath={`${postId ?? crypto.randomUUID()}/gallery_block_${block.id}_${i}.webp`}
              bucket="post-images"
              aspectClassName="aspect-square"
            />
          </div>
        ))}
      </div>
      <p className={`text-xs ${block.urls.length < 2 ? "text-destructive" : "text-muted-foreground"}`}>
        {block.urls.length}/4 images{block.urls.length < 2 ? " — minimum 2" : ""}
      </p>
      {block.urls.length < 4 && (
        <button
          type="button"
          onClick={addSlot}
          className="w-full py-2 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          + Ajouter une image ({block.urls.length}/4)
        </button>
      )}
    </div>
  );
}
