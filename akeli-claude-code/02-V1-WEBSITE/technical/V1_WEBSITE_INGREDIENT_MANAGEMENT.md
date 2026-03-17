# Akeli V1 — Ingredient Management Implementation (Website)

> Document d'implémentation pour Claude Code.
> Couvre la gestion complète des ingrédients dans le wizard de création de recettes.
> En cas de contradiction, `V1_ARCHITECTURE_DECISIONS.md` fait autorité.

**Statut** : Référence V1 Website — Prêt pour Claude Code  
**Date** : Mars 2026  
**Auteur** : Curtis — Fondateur Akeli  
**Stack** : Next.js 14 App Router · TypeScript · Supabase · React Hook Form · Zod · shadcn/ui

---

## Vue d'ensemble

Les créateurs ne peuvent utiliser **que des ingrédients existants** dans la base de données Akeli. Ils ne saisissent pas du texte libre. Si un ingrédient est manquant, ils soumettent une demande via un formulaire dédié.

```
Créateur saisit un nom d'ingrédient
         ↓
Dropdown avec recherche (autocomplete)
         ↓
Ingrédient trouvé ?
  ✅ OUI → Sélectionne l'ingrédient (validé ou pending)
  ❌ NON → "Ingrédient non trouvé ?" → Formulaire de soumission
                    ↓
           INSERT ingredient (status: pending)
           INSERT ingredient_submission
                    ↓
           L'ingrédient pending est utilisable immédiatement
           par CE créateur uniquement
```

---

## Tables concernées (V1 Supabase)

### `ingredient`

```sql
id              uuid PRIMARY KEY
name            text NOT NULL          -- nom canonique (souvent EN)
name_fr         text                   -- nom FR (priorité affichage)
name_en         text
name_es         text
name_pt         text
category        text → ingredient_category(code)
calories_per_100g  numeric(6,1)
protein_per_100g   numeric(5,1)
carbs_per_100g     numeric(5,1)
fat_per_100g       numeric(5,1)
status          text DEFAULT 'validated'  -- 'validated' | 'pending'
created_at      timestamptz
```

**RLS :**
- SELECT : public (tous peuvent lire)
- INSERT : créateurs authentifiés (pour les pending)
- UPDATE/DELETE : service role uniquement (admin Akeli)

### `ingredient_submission`

```sql
id              uuid PRIMARY KEY
submitted_by    uuid → user_profile(id)
name            text                   -- nom soumis par le créateur
name_fr         text
name_en         text
category_hint   text                   -- catégorie suggérée par le créateur
notes           text                   -- informations complémentaires
status          text DEFAULT 'pending' -- 'pending' | 'validated' | 'rejected' | 'duplicate'
ingredient_id   uuid → ingredient(id)  -- lien vers l'ingrédient créé (si validé)
reviewed_at     timestamptz
created_at      timestamptz
```

### `ingredient_category`

```sql
code        text PRIMARY KEY   -- ex: 'grain', 'meat', 'vegetable', 'dairy'...
name_fr     text
name_en     text
```

### `recipe_ingredient`

```sql
id              uuid PRIMARY KEY
recipe_id       uuid → recipe(id) CASCADE
ingredient_id   uuid → ingredient(id)   -- TOUJOURS une FK valide
quantity        numeric(8,2) NOT NULL
unit            text → measurement_unit(code)
is_optional     boolean DEFAULT false
sort_order      int DEFAULT 0
```

**Contrainte clé :** `ingredient_id` est une FK — il est impossible d'insérer un ingrédient qui n'existe pas dans la table `ingredient`. C'est la garantie au niveau base de données que seuls les ingrédients existants sont utilisables.

---

## Architecture des fichiers

```
app/
└── (dashboard)/
    └── dashboard/
        └── recipes/
            └── new/
                └── page.tsx                    ← Wizard (Step 2 = ingrédients)

components/
└── creator/
    └── recipe/
        ├── IngredientCombobox.tsx              ← Dropdown avec recherche
        ├── IngredientRow.tsx                   ← Ligne ingrédient (quantité + unité)
        ├── IngredientList.tsx                  ← Liste ordonnée + drag & drop
        └── SubmitIngredientModal.tsx           ← Formulaire de soumission

hooks/
├── use-ingredient-search.ts                    ← Autocomplete avec debounce
└── use-ingredient-submission.ts                ← Soumission nouvel ingrédient

lib/
└── queries/
    └── ingredients.ts                          ← Requêtes Supabase ingrédients
```

---

## 1. Hook — Recherche d'ingrédients

### `hooks/use-ingredient-search.ts`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import { createClient } from '@/lib/supabase/client';

export interface IngredientOption {
  id: string;
  name: string;          // nom affiché (priorité name_fr → name → name_en)
  category: string | null;
  status: 'validated' | 'pending';
}

export function useIngredientSearch(query: string, creatorUserId: string) {
  const [results, setResults] = useState<IngredientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery] = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    const search = async () => {
      setLoading(true);
      try {
        // Récupérer d'abord les pending soumis par CE créateur
        const { data: submissions } = await supabase
          .from('ingredient_submission')
          .select('ingredient_id')
          .eq('submitted_by', creatorUserId)
          .eq('status', 'pending');

        const creatorPendingIds = (submissions ?? [])
          .map((s) => s.ingredient_id)
          .filter(Boolean);

        // Construire le filtre :
        // - Ingrédients validés (tous les créateurs peuvent les utiliser)
        // - Ingrédients pending soumis par CE créateur uniquement
        let queryBuilder = supabase
          .from('ingredient')
          .select('id, name, name_fr, name_en, category, status')
          .or(
            creatorPendingIds.length > 0
              ? `status.eq.validated,and(status.eq.pending,id.in.(${creatorPendingIds.join(',')}))`
              : 'status.eq.validated'
          )
          .or(`name_fr.ilike.%${debouncedQuery}%,name_en.ilike.%${debouncedQuery}%,name.ilike.%${debouncedQuery}%`)
          .order('name_fr', { ascending: true })
          .limit(10);

        const { data, error } = await queryBuilder;

        if (cancelled) return;
        if (error) { setResults([]); return; }

        setResults(
          (data ?? []).map((ing) => ({
            id: ing.id,
            name: ing.name_fr ?? ing.name ?? ing.name_en ?? 'Ingrédient',
            category: ing.category,
            status: ing.status as 'validated' | 'pending',
          }))
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    search();
    return () => { cancelled = true; };
  }, [debouncedQuery, creatorUserId]);

  return { results, loading };
}
```

---

## 2. Composant — IngredientCombobox

### `components/creator/recipe/IngredientCombobox.tsx`

```tsx
'use client';

import { useState, useRef } from 'react';
import { useIngredientSearch, IngredientOption } from '@/hooks/use-ingredient-search';

interface IngredientComboboxProps {
  value: IngredientOption | null;
  onChange: (ingredient: IngredientOption | null) => void;
  creatorUserId: string;
  onNotFound: (query: string) => void;  // ouvre le modal de soumission
  placeholder?: string;
}

export function IngredientCombobox({
  value,
  onChange,
  creatorUserId,
  onNotFound,
  placeholder = 'Rechercher un ingrédient...',
}: IngredientComboboxProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading } = useIngredientSearch(query, creatorUserId);

  // Si un ingrédient est sélectionné, afficher son nom
  const displayValue = value ? value.name : query;

  const handleSelect = (ingredient: IngredientOption) => {
    onChange(ingredient);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      {/* Input de recherche */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value ? value.name : query}
          onChange={(e) => {
            if (value) onChange(null); // reset si on retape
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground
                       hover:text-foreground text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Badge pending */}
      {value?.status === 'pending' && (
        <span className="mt-1 inline-block text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
          ⏳ En attente de validation Akeli
        </span>
      )}

      {/* Dropdown résultats */}
      {open && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background
                        shadow-lg overflow-hidden">
          {loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Recherche...</div>
          )}

          {!loading && results.length > 0 && (
            <ul className="max-h-48 overflow-y-auto divide-y divide-border">
              {results.map((ing) => (
                <li key={ing.id}>
                  <button
                    type="button"
                    onMouseDown={() => handleSelect(ing)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary
                               flex items-center justify-between"
                  >
                    <span>{ing.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {ing.category ?? ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="px-3 py-3 text-sm">
              <p className="text-muted-foreground mb-2">
                Aucun ingrédient trouvé pour "{query}"
              </p>
              <button
                type="button"
                onMouseDown={() => {
                  setOpen(false);
                  onNotFound(query);
                }}
                className="text-primary text-xs font-medium hover:underline"
              >
                + Soumettre "{query}" comme nouvel ingrédient
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 3. Composant — IngredientRow

### `components/creator/recipe/IngredientRow.tsx`

```tsx
'use client';

import { useFormContext, Controller } from 'react-hook-form';
import { IngredientCombobox } from './IngredientCombobox';

interface IngredientRowProps {
  index: number;
  onRemove: () => void;
  onNotFound: (query: string) => void;
  creatorUserId: string;
}

const UNITS = [
  { value: 'g',    label: 'g' },
  { value: 'kg',   label: 'kg' },
  { value: 'ml',   label: 'ml' },
  { value: 'cl',   label: 'cl' },
  { value: 'l',    label: 'L' },
  { value: 'tbsp', label: 'c. à soupe' },
  { value: 'tsp',  label: 'c. à café' },
  { value: 'cup',  label: 'tasse' },
  { value: 'unit', label: 'unité(s)' },
  { value: 'pinch',label: 'pincée' },
];

export function IngredientRow({ index, onRemove, onNotFound, creatorUserId }: IngredientRowProps) {
  const { control, formState: { errors } } = useFormContext();

  return (
    <div className="flex items-start gap-2 p-2 rounded-lg border border-border bg-card">
      {/* Drag handle */}
      <span className="mt-2 text-muted-foreground cursor-grab select-none">☰</span>

      {/* Autocomplete ingrédient */}
      <div className="flex-1 min-w-0">
        <Controller
          name={`ingredients.${index}.ingredient`}
          control={control}
          rules={{ required: 'Ingrédient requis' }}
          render={({ field }) => (
            <IngredientCombobox
              value={field.value}
              onChange={field.onChange}
              creatorUserId={creatorUserId}
              onNotFound={onNotFound}
            />
          )}
        />
        {errors.ingredients?.[index]?.ingredient && (
          <p className="text-xs text-destructive mt-1">
            {errors.ingredients[index].ingredient.message}
          </p>
        )}
      </div>

      {/* Quantité */}
      <div className="w-20">
        <Controller
          name={`ingredients.${index}.quantity`}
          control={control}
          rules={{ required: true, min: 0.1 }}
          render={({ field }) => (
            <input
              {...field}
              type="number"
              min="0.1"
              step="0.1"
              placeholder="Qté"
              className="w-full rounded-lg border border-border bg-background px-2 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}
        />
      </div>

      {/* Unité */}
      <div className="w-28">
        <Controller
          name={`ingredients.${index}.unit`}
          control={control}
          rules={{ required: true }}
          render={({ field }) => (
            <select
              {...field}
              className="w-full rounded-lg border border-border bg-background px-2 py-2
                         text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Unité</option>
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          )}
        />
      </div>

      {/* Supprimer */}
      <button
        type="button"
        onClick={onRemove}
        className="mt-2 text-muted-foreground hover:text-destructive transition-colors text-sm"
        aria-label="Supprimer l'ingrédient"
      >
        ✕
      </button>
    </div>
  );
}
```

---

## 4. Composant — IngredientList

### `components/creator/recipe/IngredientList.tsx`

```tsx
'use client';

import { useFieldArray, useFormContext } from 'react-hook-form';
import { useState } from 'react';
import { IngredientRow } from './IngredientRow';
import { SubmitIngredientModal } from './SubmitIngredientModal';

interface IngredientListProps {
  creatorUserId: string;
  onIngredientSubmitted: (ingredient: { id: string; name: string }) => void;
}

export function IngredientList({ creatorUserId, onIngredientSubmitted }: IngredientListProps) {
  const { control, formState: { errors } } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ingredients',
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [notFoundQuery, setNotFoundQuery] = useState('');

  const handleNotFound = (query: string) => {
    setNotFoundQuery(query);
    setModalOpen(true);
  };

  const handleIngredientSubmitted = (ingredient: { id: string; name: string }) => {
    // Auto-sélectionner l'ingrédient nouvellement soumis dans la dernière ligne vide
    onIngredientSubmitted(ingredient);
    setModalOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {fields.map((field, index) => (
          <IngredientRow
            key={field.id}
            index={index}
            onRemove={() => remove(index)}
            onNotFound={handleNotFound}
            creatorUserId={creatorUserId}
          />
        ))}
      </div>

      {/* Erreur minimum 3 ingrédients */}
      {errors.ingredients?.root && (
        <p className="text-xs text-destructive">{errors.ingredients.root.message}</p>
      )}

      {/* Bouton ajouter */}
      <button
        type="button"
        onClick={() => append({ ingredient: null, quantity: '', unit: '' })}
        className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
      >
        + Ajouter un ingrédient
      </button>

      {/* Hint soumission */}
      <p className="text-xs text-muted-foreground">
        Ingrédient introuvable dans la liste ?{' '}
        <button
          type="button"
          onClick={() => { setNotFoundQuery(''); setModalOpen(true); }}
          className="text-primary hover:underline"
        >
          Soumettre un nouvel ingrédient
        </button>
      </p>

      {/* Modal soumission */}
      <SubmitIngredientModal
        open={modalOpen}
        initialName={notFoundQuery}
        creatorUserId={creatorUserId}
        onClose={() => setModalOpen(false)}
        onSubmitted={handleIngredientSubmitted}
      />
    </div>
  );
}
```

---

## 5. Composant — SubmitIngredientModal

### `components/creator/recipe/SubmitIngredientModal.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';

const submissionSchema = z.object({
  name:          z.string().min(2, 'Nom requis (min 2 caractères)').max(100),
  name_fr:       z.string().max(100).optional(),
  name_en:       z.string().max(100).optional(),
  category_hint: z.string().optional(),
  notes:         z.string().max(500).optional(),
});

type SubmissionForm = z.infer<typeof submissionSchema>;

const CATEGORY_OPTIONS = [
  { value: 'grain',      label: 'Céréales / Féculents' },
  { value: 'vegetable',  label: 'Légumes' },
  { value: 'meat',       label: 'Viandes / Poissons' },
  { value: 'dairy',      label: 'Produits laitiers' },
  { value: 'liquid',     label: 'Liquides / Sauces' },
  { value: 'powder',     label: 'Épices / Condiments' },
  { value: 'countable',  label: 'Fruits / Légumes entiers' },
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SubmissionForm>({
    resolver: zodResolver(submissionSchema),
    defaultValues: { name: initialName },
  });

  const onSubmit = async (data: SubmissionForm) => {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();

    try {
      // 1. Créer l'ingrédient en status pending
      const { data: ingredient, error: ingError } = await supabase
        .from('ingredient')
        .insert({
          name:          data.name,
          name_fr:       data.name_fr || data.name,
          name_en:       data.name_en || null,
          category:      data.category_hint || null,
          status:        'pending',
        })
        .select('id, name, name_fr')
        .single();

      if (ingError) throw new Error(ingError.message);

      // 2. Créer la submission pour tracking admin
      await supabase.from('ingredient_submission').insert({
        submitted_by:   creatorUserId,
        name:           data.name,
        name_fr:        data.name_fr || null,
        name_en:        data.name_en || null,
        category_hint:  data.category_hint || null,
        notes:          data.notes || null,
        ingredient_id:  ingredient.id,
        status:         'pending',
      });

      reset();
      onSubmitted({
        id:   ingredient.id,
        name: ingredient.name_fr ?? ingredient.name,
      });

    } catch (err: any) {
      setError(err.message ?? 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                      w-full max-w-md bg-background rounded-xl border border-border
                      shadow-xl p-6 space-y-4">

        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">
            Soumettre un nouvel ingrédient
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          L'ingrédient sera disponible immédiatement dans tes recettes.
          L'équipe Akeli le validera et complétera ses informations nutritionnelles.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          {/* Nom principal */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Nom de l'ingrédient <span className="text-destructive">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="ex: Feuilles de baobab"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Nom FR */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Nom en français
            </label>
            <input
              {...register('name_fr')}
              type="text"
              placeholder="ex: Feuilles de baobab"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Nom EN */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Nom en anglais
            </label>
            <input
              {...register('name_en')}
              type="text"
              placeholder="ex: Baobab leaves"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Catégorie */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Catégorie (approximative)
            </label>
            <select
              {...register('category_hint')}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Choisir une catégorie...</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">
              Notes additionnelles
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Informations utiles pour l'équipe Akeli..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-border text-sm font-medium
                         hover:bg-secondary transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm
                         font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Envoi...' : 'Soumettre'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
```

---

## 6. Schéma Zod — Step 2 du wizard

```typescript
// lib/schemas/recipe.ts

import { z } from 'zod';

export const ingredientRowSchema = z.object({
  ingredient: z.object({
    id:       z.string().uuid(),
    name:     z.string(),
    category: z.string().nullable(),
    status:   z.enum(['validated', 'pending']),
  }, { required_error: 'Sélectionne un ingrédient' }),
  quantity:    z.coerce.number({ invalid_type_error: 'Quantité requise' })
                .positive('La quantité doit être positive'),
  unit:        z.string().min(1, 'Unité requise'),
  is_optional: z.boolean().default(false),
});

export const step2Schema = z.object({
  ingredients: z.array(ingredientRowSchema)
    .min(3, 'Minimum 3 ingrédients requis'),
});

export type Step2Data = z.infer<typeof step2Schema>;
```

---

## 7. Insert final dans `recipe_ingredient`

À la soumission de la recette (step 6 — Publication), les ingrédients sont insérés :

```typescript
// lib/queries/ingredients.ts

import { createClient } from '@/lib/supabase/client';

export async function saveRecipeIngredients(
  recipeId: string,
  ingredients: Step2Data['ingredients']
) {
  const supabase = createClient();

  // Supprimer les anciens ingrédients (si mise à jour)
  await supabase
    .from('recipe_ingredient')
    .delete()
    .eq('recipe_id', recipeId);

  // Insérer les nouveaux
  const rows = ingredients.map((ing, index) => ({
    recipe_id:     recipeId,
    ingredient_id: ing.ingredient.id,  // FK valide — toujours dans ingredient table
    quantity:      ing.quantity,
    unit:          ing.unit,
    is_optional:   ing.is_optional,
    sort_order:    index,
  }));

  const { error } = await supabase
    .from('recipe_ingredient')
    .insert(rows);

  if (error) throw new Error(error.message);
}
```

---

## 8. RLS Policies Supabase (à vérifier / appliquer)

```sql
-- ingredient : lecture publique
CREATE POLICY "public reads ingredients" ON ingredient
  FOR SELECT USING (true);

-- ingredient : les créateurs peuvent créer des ingrédients pending
CREATE POLICY "creator inserts pending ingredient" ON ingredient
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM user_profile WHERE is_creator = true)
    AND status = 'pending'
  );

-- ingredient_submission : le créateur gère ses propres soumissions
CREATE POLICY "creator manages own submissions" ON ingredient_submission
  FOR ALL USING (auth.uid() = submitted_by);

-- ingredient_submission : lecture publique des soumissions validées
CREATE POLICY "public reads validated submissions" ON ingredient_submission
  FOR SELECT USING (status = 'validated');
```

---

## 9. Comportement UX — Récapitulatif

| Situation | Comportement |
|-----------|-------------|
| Créateur tape 2+ caractères | Dropdown s'ouvre avec résultats filtrés |
| Ingrédient validé trouvé | Sélectionnable directement |
| Ingrédient pending (du créateur) | Sélectionnable + badge "En attente de validation" |
| Aucun résultat | Affiche lien "Soumettre un nouvel ingrédient" |
| Soumission envoyée | Ingrédient créé en `pending`, auto-sélectionné dans la ligne |
| Moins de 3 ingrédients | Erreur de validation au passage à l'étape suivante |
| Quantité ou unité manquante | Erreur inline sous le champ concerné |

---

## 10. Notes pour Claude Code

**Ne pas faire :**
- Permettre la saisie de texte libre dans `ingredient_id` — toujours une FK vers `ingredient.id`
- Afficher les ingrédients `pending` d'autres créateurs dans l'autocomplete
- Oublier le debounce sur la recherche (300ms minimum)

**À vérifier avant implémentation :**
- Que la table `ingredient` existe avec la colonne `status` (appliqué dans `V1_WEBSITE_DATABASE_COMPLETE.md`)
- Que la table `ingredient_submission` existe (appliqué dans `V1_WEBSITE_DATABASE_COMPLETE.md`)
- Que les RLS policies de la section 8 sont en place

**Dépendances npm à installer :**
```bash
npm install use-debounce
# react-hook-form + zod + @hookform/resolvers déjà présents selon V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md
```

---

## Documents associés

| Document | Contenu |
|----------|---------|
| `V1_WEBSITE_DATABASE_COMPLETE.md` | Schéma `ingredient`, `ingredient_submission`, RLS |
| `V1_WEBSITE_PAGES_SPECIFICATIONS.md` | Step 2 du wizard recette — vue d'ensemble |
| `V1_DATABASE_SCHEMA.md` | `recipe_ingredient`, `ingredient_category`, `measurement_unit` |
| `V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md` | Stack Next.js, conventions projet |
| `V1_ARCHITECTURE_DECISIONS.md` | Fait autorité en cas de contradiction |

---

*Document créé : Mars 2026*
*Auteur : Curtis — Fondateur Akeli*
*Version : 1.0 — Ingredient Management V1 Website*
