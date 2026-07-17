// components/creator/post-form/Step3Publish.tsx
"use client";

interface Step3Data {
  title: string;
  category: string;
  cover_image_url: string;
  blocks: { type: string }[];
}

interface Step3Props {
  data: Step3Data;
  onSaveDraft: () => void;
  onPublish: () => void;
  isPublished: boolean;
  isPublishing: boolean;
}

export default function Step3Publish({ data, onSaveDraft, onPublish, isPublished, isPublishing }: Step3Props) {
  const missing: string[] = [];
  if (!data.title || data.title.length < 3) missing.push("Titre (min 3 caractères)");
  if (!data.category) missing.push("Catégorie");
  if (!data.cover_image_url) missing.push("Photo de couverture");
  if (data.blocks.length === 0) missing.push("Au moins un bloc de contenu");

  const canPublish = missing.length === 0;

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold text-foreground">Publication</h2>

      <div className="rounded-xl border border-border overflow-hidden">
        <div className="p-3 bg-secondary/30 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Aperçu</p>
        </div>
        <div className="p-4 space-y-2">
          {data.cover_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.cover_image_url} alt="Couverture" className="w-full aspect-video object-cover rounded-lg mb-3" />
          )}
          <h3 className="font-semibold text-foreground">
            {data.title || <span className="text-muted-foreground italic">Sans titre</span>}
          </h3>
          <p className="text-xs text-muted-foreground">{data.blocks.length} bloc{data.blocks.length !== 1 ? "s" : ""} de contenu</p>
        </div>
      </div>

      {missing.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
          <p className="text-sm font-medium text-destructive">Complète ces éléments avant de publier :</p>
          <ul className="space-y-1">
            {missing.map((m) => (
              <li key={m} className="text-xs text-destructive flex items-center gap-1.5">
                <span>•</span> {m}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={isPublishing}
          className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
        >
          💾 Sauvegarder le brouillon
        </button>
        <button
          type="button"
          onClick={onPublish}
          disabled={!canPublish || isPublishing}
          className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPublishing ? "Publication..." : isPublished ? "🚀 Mettre à jour" : "🚀 Publier l'article"}
        </button>
      </div>
    </div>
  );
}
