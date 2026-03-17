# Akeli V1 — Section Headers : Ingrédients & Étapes

> Document d'implémentation pour Claude Code.
> Couvre les titres de section dans les listes d'ingrédients et d'étapes
> du wizard de création de recettes.
> Complète `V1_WEBSITE_INGREDIENT_MANAGEMENT.md`.
> En cas de contradiction, `V1_ARCHITECTURE_DECISIONS.md` fait autorité.

**Statut** : Référence V1 Website — Prêt pour Claude Code
**Date** : Mars 2026
**Auteur** : Curtis — Fondateur Akeli

---

## Concept

Un **titre de section** est une ligne spéciale dans la liste des ingrédients
ou des étapes. Il ne contient pas de données nutritionnelles ni d'instructions
— il sépare visuellement des groupes logiques.

```
INGRÉDIENTS
─────────────────────────────
▸ Pour la sauce               ← titre de section
  • Tomates          400 g
  • Oignons          2 unités
  • Ail              3 gousses

▸ Pour la garniture           ← titre de section
  • Persil           1 bouquet
  • Citron           1 unité

ÉTAPES
─────────────────────────────
▸ Préparation                 ← titre de section
  1. Éplucher les oignons...
  2. Hacher l'ail...

▸ Cuisson                     ← titre de section
  3. Faire revenir les oignons...
  4. Ajouter les tomates...
```

---

## Schéma de données (V1 Supabase)

Le pattern est **identique** sur les deux tables — une ligne avec
`is_section_header = true` est un titre, pas un ingrédient ni une étape.

### `recipe_ingredient`

| Colonne | Type | Section header | Ligne normale |
|---------|------|---------------|---------------|
| `is_section_header` | boolean NOT NULL DEFAULT false | `true` | `false` |
| `title` | text nullable | **requis** | optionnel |
| `ingredient_id` | uuid nullable → ingredient | `NULL` | **requis** |
| `quantity` | numeric nullable | `NULL` | **requis** |
| `unit` | text nullable | `NULL` | requis |
| `sort_order` | int | position dans la liste | position |
| `is_optional` | boolean | ignoré | optionnel |

**Contrainte CHECK en base :**
```sql
(is_section_header = true AND title IS NOT NULL AND ingredient_id IS NULL)
OR
(is_section_header = false AND ingredient_id IS NOT NULL AND quantity IS NOT NULL)
```

### `recipe_step`

| Colonne | Type | Section header | Ligne normale |
|---------|------|---------------|---------------|
| `is_section_header` | boolean NOT NULL DEFAULT false | `true` | `false` |
| `title` | text nullable | **requis** | optionnel |
| `content` | text nullable | `NULL` | **requis** |
| `step_number` | int NOT NULL | position dans la liste | numéro affiché |
| `image_url` | text nullable | `NULL` | optionnel |
| `timer_seconds` | int nullable | `NULL` | optionnel |

**Contrainte CHECK en base :**
```sql
(is_section_header = true AND title IS NOT NULL AND content IS NULL)
OR
(is_section_header = false AND content IS NOT NULL)
```

---

## Types TypeScript partagés

```typescript
// types/recipe-items.ts

// ─── Ingrédients ─────────────────────────────────────────────────────────────

export type IngredientRowType = 'section_header' | 'ingredient';

export interface IngredientSectionHeader {
  type: 'section_header';
  id: string;                     // uuid local (non persisté avant save)
  title: string;
  sort_order: number;
  is_section_header: true;
}

export interface IngredientItem {
  type: 'ingredient';
  id: string;
  ingredient: {
    id: string;
    name: string;
    category: string | null;
    status: 'validated' | 'pending';
  };
  quantity: number;
  unit: string;
  is_optional: boolean;
  sort_order: number;
  is_section_header: false;
}

export type IngredientListItem = IngredientSectionHeader | IngredientItem;

// ─── Étapes ───────────────────────────────────────────────────────────────────

export type StepRowType = 'section_header' | 'step';

export interface StepSectionHeader {
  type: 'section_header';
  id: string;
  title: string;
  step_number: number;
  is_section_header: true;
}

export interface StepItem {
  type: 'step';
  id: string;
  title: string | null;
  content: string;
  image_url: string | null;
  timer_seconds: number | null;
  step_number: number;
  is_section_header: false;
}

export type StepListItem = StepSectionHeader | StepItem;
```

---

## Schémas Zod

```typescript
// lib/schemas/recipe.ts

import { z } from 'zod';

// ─── Ingrédients ─────────────────────────────────────────────────────────────

export const ingredientSectionHeaderSchema = z.object({
  type:               z.literal('section_header'),
  id:                 z.string(),
  title:              z.string().min(1, 'Le titre de section ne peut pas être vide').max(80),
  sort_order:         z.number().int(),
  is_section_header:  z.literal(true),
});

export const ingredientItemSchema = z.object({
  type: z.literal('ingredient'),
  id:   z.string(),
  ingredient: z.object({
    id:       z.string().uuid(),
    name:     z.string(),
    category: z.string().nullable(),
    status:   z.enum(['validated', 'pending']),
  }, { required_error: 'Sélectionne un ingrédient' }),
  quantity:           z.coerce.number().positive('Quantité requise'),
  unit:               z.string().min(1, 'Unité requise'),
  is_optional:        z.boolean().default(false),
  sort_order:         z.number().int(),
  is_section_header:  z.literal(false),
});

export const ingredientListItemSchema = z.discriminatedUnion('type', [
  ingredientSectionHeaderSchema,
  ingredientItemSchema,
]);

export const step2Schema = z.object({
  ingredients: z.array(ingredientListItemSchema)
    // Au moins 3 vrais ingrédients (hors titres de section)
    .refine(
      (items) => items.filter((i) => i.type === 'ingredient').length >= 3,
      { message: 'Minimum 3 ingrédients requis (hors titres de section)' }
    ),
});

// ─── Étapes ───────────────────────────────────────────────────────────────────

export const stepSectionHeaderSchema = z.object({
  type:               z.literal('section_header'),
  id:                 z.string(),
  title:              z.string().min(1, 'Le titre de section ne peut pas être vide').max(80),
  step_number:        z.number().int(),
  is_section_header:  z.literal(true),
});

export const stepItemSchema = z.object({
  type:               z.literal('step'),
  id:                 z.string(),
  title:              z.string().max(80).nullable().optional(),
  content:            z.string().min(5, 'Étape trop courte').max(2000),
  image_url:          z.string().url().nullable().optional(),
  timer_seconds:      z.number().int().positive().nullable().optional(),
  step_number:        z.number().int(),
  is_section_header:  z.literal(false),
});

export const stepListItemSchema = z.discriminatedUnion('type', [
  stepSectionHeaderSchema,
  stepItemSchema,
]);

export const step3Schema = z.object({
  steps: z.array(stepListItemSchema)
    .refine(
      (items) => items.filter((i) => i.type === 'step').length >= 2,
      { message: 'Minimum 2 étapes requises (hors titres de section)' }
    ),
});
```

---

## Composants UI

### Pattern uniforme : `SectionHeaderRow`

Ce composant est **identique** pour les ingrédients et les étapes.

```tsx
// components/creator/recipe/SectionHeaderRow.tsx

'use client';

interface SectionHeaderRowProps {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  placeholder?: string;
}

export function SectionHeaderRow({
  value,
  onChange,
  onRemove,
  placeholder = 'Titre de section...',
}: SectionHeaderRowProps) {
  return (
    <div className="flex items-center gap-2 py-1">
      {/* Drag handle */}
      <span className="text-muted-foreground cursor-grab select-none text-sm">☰</span>

      {/* Indicateur visuel section */}
      <span className="text-muted-foreground text-xs select-none">▸</span>

      {/* Input titre */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-b border-dashed border-border
                   text-sm font-semibold text-foreground placeholder:text-muted-foreground
                   focus:outline-none focus:border-primary py-1"
      />

      {/* Supprimer */}
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-colors text-xs"
        aria-label="Supprimer le titre de section"
      >
        ✕
      </button>
    </div>
  );
}
```

### `IngredientList` — avec titres de section

```tsx
// components/creator/recipe/IngredientList.tsx
// Ajouter le bouton "+ Titre de section" sous "+ Ajouter un ingrédient"

import { SectionHeaderRow } from './SectionHeaderRow';
import { IngredientRow } from './IngredientRow';
import { v4 as uuidv4 } from 'uuid';

export function IngredientList({ creatorUserId, onIngredientSubmitted }) {
  const { control, formState: { errors } } = useFormContext();
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'ingredients',
  });

  return (
    <div className="space-y-1">
      {fields.map((field, index) => {
        if (field.type === 'section_header') {
          return (
            <SectionHeaderRow
              key={field.id}
              value={field.title}
              onChange={(val) => update(index, { ...field, title: val })}
              onRemove={() => remove(index)}
              placeholder="Titre de section (ex: Pour la sauce)"
            />
          );
        }
        return (
          <IngredientRow
            key={field.id}
            index={index}
            onRemove={() => remove(index)}
            onNotFound={handleNotFound}
            creatorUserId={creatorUserId}
          />
        );
      })}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2">
        <button
          type="button"
          onClick={() => append({
            type: 'ingredient',
            id: uuidv4(),
            ingredient: null,
            quantity: '',
            unit: '',
            is_optional: false,
            sort_order: fields.length,
            is_section_header: false,
          })}
          className="text-sm text-primary hover:underline font-medium"
        >
          + Ingrédient
        </button>

        <button
          type="button"
          onClick={() => append({
            type: 'section_header',
            id: uuidv4(),
            title: '',
            sort_order: fields.length,
            is_section_header: true,
          })}
          className="text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          + Titre de section
        </button>
      </div>
    </div>
  );
}
```

### `StepList` — avec titres de section

Même pattern que `IngredientList` — remplacer `IngredientRow` par `StepRow`.

```tsx
// components/creator/recipe/StepList.tsx

{fields.map((field, index) => {
  if (field.type === 'section_header') {
    return (
      <SectionHeaderRow
        key={field.id}
        value={field.title}
        onChange={(val) => update(index, { ...field, title: val })}
        onRemove={() => remove(index)}
        placeholder="Titre de section (ex: Préparation)"
      />
    );
  }
  return (
    <StepRow
      key={field.id}
      index={index}
      onRemove={() => remove(index)}
    />
  );
})}

{/* Actions */}
<div className="flex items-center gap-4 pt-2">
  <button type="button" onClick={() => append({ type: 'step', ... })}>
    + Étape
  </button>
  <button type="button" onClick={() => append({ type: 'section_header', ... })}>
    + Titre de section
  </button>
</div>
```

---

## Save vers Supabase

```typescript
// lib/queries/recipe-items.ts

// ─── Ingrédients ─────────────────────────────────────────────────────────────

export async function saveRecipeIngredients(
  recipeId: string,
  items: IngredientListItem[]
) {
  const supabase = createClient();
  await supabase.from('recipe_ingredient').delete().eq('recipe_id', recipeId);

  const rows = items.map((item, index) => {
    if (item.is_section_header) {
      return {
        recipe_id:          recipeId,
        is_section_header:  true,
        title:              item.title,
        ingredient_id:      null,
        quantity:           null,
        unit:               null,
        is_optional:        false,
        sort_order:         index,
      };
    }
    return {
      recipe_id:          recipeId,
      is_section_header:  false,
      title:              null,
      ingredient_id:      item.ingredient.id,
      quantity:           item.quantity,
      unit:               item.unit,
      is_optional:        item.is_optional,
      sort_order:         index,
    };
  });

  const { error } = await supabase.from('recipe_ingredient').insert(rows);
  if (error) throw new Error(error.message);
}

// ─── Étapes ───────────────────────────────────────────────────────────────────

export async function saveRecipeSteps(
  recipeId: string,
  items: StepListItem[]
) {
  const supabase = createClient();
  await supabase.from('recipe_step').delete().eq('recipe_id', recipeId);

  // step_number = position dans la liste (incluant les titres de section)
  const rows = items.map((item, index) => {
    if (item.is_section_header) {
      return {
        recipe_id:          recipeId,
        is_section_header:  true,
        title:              item.title,
        content:            null,
        step_number:        index,
        image_url:          null,
        timer_seconds:      null,
      };
    }
    return {
      recipe_id:          recipeId,
      is_section_header:  false,
      title:              item.title ?? null,
      content:            item.content,
      step_number:        index,
      image_url:          item.image_url ?? null,
      timer_seconds:      item.timer_seconds ?? null,
    };
  });

  const { error } = await supabase.from('recipe_step').insert(rows);
  if (error) throw new Error(error.message);
}
```

---

## Rendu Flutter (affichage utilisateur)

Les titres de section sont filtrés avant le rendu des numéros d'étapes.

```dart
// Dart — affichage de la liste d'étapes
// step_number = index dans la liste (incluant les sections)
// Pour afficher "Étape 1, Étape 2..." ignorer les is_section_header = true

int stepCounter = 0;

for (final item in steps) {
  if (item.isSectionHeader) {
    // Afficher un titre visuel — pas de numéro
    SectionHeaderWidget(title: item.title)
  } else {
    stepCounter++;
    StepWidget(
      number: stepCounter,     // numéro séquentiel réel
      content: item.content,
      title: item.title,
      timerSeconds: item.timerSeconds,
      imageUrl: item.imageUrl,
    )
  }
}
```

Même logique pour les ingrédients :

```dart
for (final item in ingredients) {
  if (item.isSectionHeader) {
    SectionHeaderWidget(title: item.title)
  } else {
    IngredientWidget(
      name: item.ingredient.nameFr,
      quantity: item.adjustedQuantity,
      unit: item.unit,
    )
  }
}
```

---

## Récapitulatif — État des tables en base

Après les migrations appliquées :

| Colonne | `recipe_ingredient` | `recipe_step` |
|---------|:------------------:|:------------:|
| `is_section_header` | ✅ boolean NOT NULL | ✅ boolean NOT NULL |
| `title` | ✅ text nullable | ✅ text nullable |
| `ingredient_id` nullable | ✅ | — |
| `quantity` nullable | ✅ | — |
| `content` nullable | — | ✅ |
| Contrainte CHECK | ✅ | ✅ |

---

## Documents associés

| Document | Contenu |
|----------|---------|
| `V1_WEBSITE_INGREDIENT_MANAGEMENT.md` | Autocomplete, soumission ingrédients |
| `V1_RECIPE_SCHEMA_ADDITIONS.md` | Tables recipe_step, recipe_ingredient |
| `V1_WEBSITE_PAGES_SPECIFICATIONS.md` | Steps 2 et 3 du wizard |
| `V1_ARCHITECTURE_DECISIONS.md` | Fait autorité en cas de contradiction |

---

*Document créé : Mars 2026*
*Auteur : Curtis — Fondateur Akeli*
*Version : 1.0 — Section Headers Ingrédients & Étapes*
