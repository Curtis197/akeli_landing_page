"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const CATEGORY_OPTIONS = [
  { value: "grain",     label: "Céréales / Féculents" },
  { value: "vegetable", label: "Légumes" },
  { value: "meat",      label: "Viandes / Poissons" },
  { value: "dairy",     label: "Produits laitiers" },
  { value: "liquid",    label: "Liquides / Sauces" },
  { value: "powder",    label: "Épices / Condiments" },
  { value: "countable", label: "Fruits / Légumes entiers" },
];

interface SubmitIngredientModalProps {
  open: boolean;
  initialName: string;
  creatorUserId: string;
  onClose: () => void;
  onSubmitted: (ingredient: { id: string; name: string }) => void;
}

export function SubmitIngredientModal({
  open,
  initialName,
  creatorUserId,
  onClose,
  onSubmitted,
}: SubmitIngredientModalProps) {
  const [name, setName]           = useState(initialName);
  const [nameFr, setNameFr]       = useState("");
  const [nameEn, setNameEn]       = useState("");
  const [category, setCategory]   = useState("");
  const [notes, setNotes]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (open) { setName(initialName); setError(null); }
  }, [open, initialName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();

    try {
      const { data: ingredient, error: ingErr } = await supabase
        .from("ingredient")
        .insert({
          name:     name.trim(),
          name_fr:  nameFr.trim() || name.trim(),
          name_en:  nameEn.trim() || null,
          category: category || null,
          status:   "pending",
        })
        .select("id, name, name_fr")
        .single();

      if (ingErr) throw new Error(ingErr.message);

      await supabase.from("ingredient_submission").insert({
        submitted_by:  creatorUserId,
        name:          name.trim(),
        name_fr:       nameFr.trim() || null,
        name_en:       nameEn.trim() || null,
        category_hint: category || null,
        notes:         notes.trim() || null,
        ingredient_id: ingredient.id,
        status:        "pending",
      });

      onSubmitted({ id: ingredient.id, name: ingredient.name_fr ?? ingredient.name });
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                      w-full max-w-md bg-background rounded-xl border border-border
                      shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Soumettre un nouvel ingrédient</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Fermer">✕</button>
        </div>

        <p className="text-sm text-muted-foreground">
          L'ingrédient sera disponible immédiatement dans tes recettes.
          L'équipe Akeli le validera et complétera ses informations nutritionnelles.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Nom <span className="text-destructive">*</span>
            </label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder="ex: Feuilles de baobab"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Nom français</label>
              <input
                type="text" value={nameFr} onChange={(e) => setNameFr(e.target.value)}
                placeholder="ex: Feuilles de baobab"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Nom anglais</label>
              <input
                type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)}
                placeholder="ex: Baobab leaves"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Catégorie</label>
            <select
              value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choisir une catégorie...</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Informations utiles pour l'équipe Akeli..."
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={submitting || name.trim().length < 2}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
              {submitting ? "Envoi..." : "Soumettre"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
