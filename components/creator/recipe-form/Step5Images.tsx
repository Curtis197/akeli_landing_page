"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { uploadImage } from "@/lib/utils/upload-image";
import ImageDropzone from "@/components/shared/ImageDropzone";
import type { RecipeFormState } from "./RecipeWizard";

interface Step5Props {
  data: RecipeFormState;
  onChange: (patch: Partial<RecipeFormState>) => void;
  draftId: string | null;
}

export default function Step5Images({ data, onChange, draftId }: Step5Props) {
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Gallery ──────────────────────────────────────────────────────────────────

  const onDropGallery = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length) return;
      const remaining = 5 - data.gallery_urls.length;
      const toUpload = accepted.slice(0, remaining);
      setError(null);
      setUploadingGallery(true);
      try {
        const id = draftId ?? crypto.randomUUID();
        const urls = await Promise.all(
          toUpload.map((file, i) => {
            const idx = data.gallery_urls.length + i;
            return uploadImage(file, `${id}/gallery_${idx}_${Date.now()}.webp`);
          })
        );
        onChange({ gallery_urls: [...data.gallery_urls, ...urls] });
      } catch {
        setError("Échec de l'upload galerie. Réessaie.");
      } finally {
        setUploadingGallery(false);
      }
    },
    [draftId, data.gallery_urls, onChange]
  );

  const { getRootProps: getGalleryRootProps, getInputProps: getGalleryInputProps, isDragActive: isGalleryDragActive } =
    useDropzone({
      onDrop: onDropGallery,
      accept: { "image/*": [] },
      maxFiles: 5 - data.gallery_urls.length,
      disabled: uploadingGallery || data.gallery_urls.length >= 5,
    });

  const removeGalleryImage = (url: string) => {
    onChange({ gallery_urls: data.gallery_urls.filter((u) => u !== url) });
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-foreground">Photos</h2>

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Cover image */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Photo de couverture
        </label>
        <ImageDropzone
          value={data.cover_image_url || null}
          onChange={(url) => onChange({ cover_image_url: url })}
          onRemove={() => onChange({ cover_image_url: "" })}
          uploadPath={`${draftId ?? crypto.randomUUID()}/cover.webp`}
          label="Couverture"
        />
      </div>

      {/* Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Galerie (optionnel)
          </label>
          <span className="text-xs text-muted-foreground">
            {data.gallery_urls.length}/5
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {data.gallery_urls.map((url) => (
            <div key={url} className="relative aspect-square rounded-lg overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeGalleryImage(url)}
                className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors text-xs leading-none"
              >
                ✕
              </button>
            </div>
          ))}

          {data.gallery_urls.length < 5 && (
            <div
              {...getGalleryRootProps()}
              className={`aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
                isGalleryDragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary hover:bg-secondary/50"
              }`}
            >
              <input {...getGalleryInputProps()} />
              {uploadingGallery ? (
                <p className="text-xs text-muted-foreground text-center px-1">Upload...</p>
              ) : (
                <>
                  <p className="text-xl">+</p>
                  <p className="text-xs text-muted-foreground text-center px-1">
                    {isGalleryDragActive ? "Dépose" : "Ajouter"}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
