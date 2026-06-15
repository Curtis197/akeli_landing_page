"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitIngredient } from "@/lib/queries/ingredients";

interface IngredientSubmitModalProps {
  initialName: string;
  onClose: () => void;
}

export default function IngredientSubmitModal({
  initialName,
  onClose,
}: IngredientSubmitModalProps) {
  const supabase = createClient();
  const [categories, setCategories] = useState<
    { code: string; name_fr: string }[]
  >([]);
  const [nameFr, setNameFr] = useState(initialName);
  const [nameEn, setNameEn] = useState("");
  const [categoryHint, setCategoryHint] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("ingredient_category")
      .select("code, name_fr")
      .order("name_fr")
      .then(({ data }) => {
        if (data) setCategories(data);
      });
  }, [supabase]);

  const handleSubmit = async () => {
    if (!nameFr.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      await submitIngredient({
        name: nameFr.trim(),
        name_fr: nameFr.trim(),
        name_en: nameEn.trim(),
        category_hint: categoryHint,
        notes: notes.trim(),
        submitted_by: user.id,
      });
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? "Erreur lors de la soumission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-background rounded-xl border border-border shadow-xl w-full max-w-md p-6 space-y-4">
        {done ? (
          <>
            <p className="text-sm font-medium text-foreground">
              ✅ Ingrédient soumis avec succès !
            </p>
            <p className="text-xs text-muted-foreground">
              Notre équipe le validera prochainement. Une fois approuvé, vous
              pourrez l'ajouter à vos recettes.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Fermer
            </button>
          </>
        ) : (
          <>
            <h3 className="text-base font-semibold text-foreground">
              Soumettre un nouvel ingrédient
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground">
                  Nom en français <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={nameFr}
                  onChange={(e) => setNameFr(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">
                  Nom en anglais
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">
                  Catégorie
                </label>
                <select
                  value={categoryHint}
                  onChange={(e) => setCategoryHint(e.target.value)}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Sélectionner...</option>
                  {categories.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name_fr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Contexte, région d'origine, usage typique..."
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!nameFr.trim() || loading}
                className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
              >
                {loading ? "Envoi..." : "Soumettre"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
