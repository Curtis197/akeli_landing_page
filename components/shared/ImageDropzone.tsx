"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { uploadImage } from "@/lib/utils/upload-image";

interface ImageDropzoneProps {
  value: string | null;
  onChange: (url: string) => void;
  onRemove: () => void;
  uploadPath: string;
  bucket?: string;
  aspectClassName?: string;
  label?: string;
  disabled?: boolean;
}

export default function ImageDropzone({
  value,
  onChange,
  onRemove,
  uploadPath,
  bucket = "recipe-images",
  aspectClassName = "aspect-video",
  label = "Photo",
  disabled = false,
}: ImageDropzoneProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setError(null);
      setUploading(true);
      try {
        const url = await uploadImage(file, uploadPath, bucket);
        onChange(url);
      } catch {
        setError("Échec de l'upload. Réessaie.");
      } finally {
        setUploading(false);
      }
    },
    [uploadPath, bucket, onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    maxFiles: 1,
    disabled: disabled || uploading,
  });

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
      )}
      {value ? (
        <div className={`relative w-full ${aspectClassName} rounded-xl overflow-hidden border border-border`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onRemove}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80 transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`w-full ${aspectClassName} rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary hover:bg-secondary/50"
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <p className="text-sm text-muted-foreground">Upload en cours...</p>
          ) : (
            <>
              <p className="text-2xl mb-2">📷</p>
              <p className="text-sm font-medium text-foreground">
                {isDragActive ? "Dépose ici" : "Glisse ou clique pour ajouter"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP — max 10 Mo</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
