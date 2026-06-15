# Akeli V1 — Website Recipe Tracking Implementation (Next.js)

> Document d'implémentation pour Claude Code.
> Couvre le tracking des impressions et sessions recette dans le website Next.js V1.
> En cas de contradiction, `V1_ARCHITECTURE_DECISIONS.md` fait autorité.

**Statut** : Référence V1 Website — Prêt pour Claude Code  
**Date** : Mars 2026  
**Auteur** : Curtis — Fondateur Akeli  
**Tables concernées** : `recipe_impression`, `recipe_open`  
**Document associé** : `V1_RECIPE_SCHEMA_ADDITIONS.md`

---

## Vue d'ensemble

Le website Akeli est une surface de **découverte publique** : les recettes sont visibles sans authentification (teasers). Le tracking doit donc fonctionner pour les visiteurs anonymes et les utilisateurs connectés.

| Événement | Table | Déclencheur | Visiteur anonyme |
|-----------|-------|-------------|-----------------|
| Impression | `recipe_impression` | Carte recette visible dans `/recipes` ou `/creator/[username]` | ✅ trackée |
| Open + Session | `recipe_open` | Ouverture de `/recipe/[slug]` + fermeture de l'onglet/navigation | ✅ trackée |

**Principe de sécurité :**  
Les inserts anonymes utilisent la **service key Supabase** — jamais exposée côté client.  
Toutes les requêtes de tracking passent par des **API Routes Next.js** (`/api/track/...`).  
Le client Next.js n'appelle jamais Supabase directement pour les inserts de tracking.

---

## Architecture des fichiers

```
akeli-website/
├── app/
│   ├── api/
│   │   └── track/
│   │       ├── impression/
│   │       │   └── route.ts          ← POST /api/track/impression
│   │       └── open/
│   │           ├── route.ts          ← POST /api/track/open (insert)
│   │           └── [id]/
│   │               └── route.ts      ← PATCH /api/track/open/[id] (close)
│   └── (discovery)/
│       ├── recipes/
│       │   └── page.tsx              ← Impression tracking (liste)
│       └── recipe/
│           └── [slug]/
│               └── page.tsx          ← Open + Session tracking
├── lib/
│   └── tracking/
│       ├── supabase-admin.ts         ← Client Supabase service key (server only)
│       ├── tracking-client.ts        ← Fonctions client (fetch vers API routes)
│       └── types.ts                  ← Types partagés
└── hooks/
    ├── use-recipe-impression.ts      ← Hook impression (Intersection Observer)
    └── use-recipe-session.ts         ← Hook session (open + close)
```

---

## 1. Types partagés

### `lib/tracking/types.ts`

```typescript
export type TrackingSource = 'feed' | 'search' | 'meal_planner';

export interface ImpressionPayload {
  recipe_id: string;
  source: TrackingSource;
}

export interface OpenPayload {
  recipe_id: string;
  source: TrackingSource;
}

export interface OpenResponse {
  id: string;  // UUID de la ligne recipe_open insérée
}

export interface ClosePayload {
  closed_at: string;         // ISO string
  session_duration_seconds: number;
}
```

---

## 2. Client Supabase Admin (service key)

### `lib/tracking/supabase-admin.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

// ⚠️ Ce fichier ne doit jamais être importé depuis un composant client.
// Il est exclusivement utilisé dans les API Routes (server-side).
if (typeof window !== 'undefined') {
  throw new Error('supabase-admin must not be imported client-side');
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);
```

**Variable d'environnement à configurer sur Vercel :**
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...   ← jamais préfixée NEXT_PUBLIC_
```

---

## 3. API Routes

### `app/api/track/impression/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/tracking/supabase-admin';
import { createClient } from '@/lib/supabase/server';
import type { ImpressionPayload } from '@/lib/tracking/types';

export async function POST(request: NextRequest) {
  try {
    const body: ImpressionPayload = await request.json();

    if (!body.recipe_id || !body.source) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Tenter de récupérer l'utilisateur authentifié
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabaseAdmin.from('recipe_impression').insert({
      recipe_id: body.recipe_id,
      user_id: user?.id ?? null,   // null = visiteur anonyme
      source: body.source,
      seen_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Silencieux — le tracking ne doit jamais bloquer l'expérience
    console.error('[track/impression]', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
```

---

### `app/api/track/open/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/tracking/supabase-admin';
import { createClient } from '@/lib/supabase/server';
import type { OpenPayload, OpenResponse } from '@/lib/tracking/types';

export async function POST(request: NextRequest) {
  try {
    const body: OpenPayload = await request.json();

    if (!body.recipe_id || !body.source) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabaseAdmin
      .from('recipe_open')
      .insert({
        recipe_id: body.recipe_id,
        user_id: user?.id ?? null,
        source: body.source,
        opened_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) throw error;

    return NextResponse.json({ id: data.id } satisfies OpenResponse);
  } catch (error) {
    console.error('[track/open]', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
```

---

### `app/api/track/open/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/tracking/supabase-admin';
import type { ClosePayload } from '@/lib/tracking/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: ClosePayload = await request.json();
    const { id } = params;

    if (!id || !body.closed_at || body.session_duration_seconds === undefined) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    await supabaseAdmin
      .from('recipe_open')
      .update({
        closed_at: body.closed_at,
        session_duration_seconds: body.session_duration_seconds,
      })
      .eq('id', id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[track/open/close]', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
```

---

## 4. Fonctions client

### `lib/tracking/tracking-client.ts`

```typescript
import type {
  ImpressionPayload,
  OpenPayload,
  OpenResponse,
  ClosePayload,
  TrackingSource,
} from './types';

// Fire-and-forget — ne throw jamais côté appelant
export async function trackImpression(payload: ImpressionPayload): Promise<void> {
  try {
    await fetch('/api/track/impression', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silencieux
  }
}

// Retourne l'id de la session ou null en cas d'erreur
export async function trackOpen(payload: OpenPayload): Promise<string | null> {
  try {
    const res = await fetch('/api/track/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const data: OpenResponse = await res.json();
    return data.id;
  } catch {
    return null;
  }
}

// Fire-and-forget — utilisé dans beforeunload / cleanup
export function trackClose(openId: string, openedAt: Date): void {
  const closedAt = new Date();
  const sessionDurationSeconds = Math.round(
    (closedAt.getTime() - openedAt.getTime()) / 1000
  );

  const payload: ClosePayload = {
    closed_at: closedAt.toISOString(),
    session_duration_seconds: sessionDurationSeconds,
  };

  // sendBeacon garantit l'envoi même si la page est en train de se fermer
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      `/api/track/open/${openId}`,
      new Blob([JSON.stringify(payload)], { type: 'application/json' })
    );
  } else {
    // Fallback fetch (keepalive)
    fetch(`/api/track/open/${openId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  }
}
```

**Pourquoi `navigator.sendBeacon` ?**  
Lorsque l'utilisateur ferme l'onglet ou navigue, les requêtes `fetch` normales sont annulées. `sendBeacon` est conçu pour garantir l'envoi de données même lors d'une fermeture de page. C'est le standard pour le tracking de session.

---

## 5. Hook — Impression

### `hooks/use-recipe-impression.ts`

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { trackImpression } from '@/lib/tracking/tracking-client';
import type { TrackingSource } from '@/lib/tracking/types';

interface UseRecipeImpressionOptions {
  recipeId: string;
  source: TrackingSource;
  threshold?: number;     // fraction visible requise (défaut: 0.5)
  delay?: number;         // ms avant de logger (défaut: 1000)
}

export function useRecipeImpression(
  ref: React.RefObject<HTMLElement>,
  { recipeId, source, threshold = 0.5, delay = 1000 }: UseRecipeImpressionOptions
) {
  const logged = useRef(false);
  const timer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold && !logged.current) {
          timer.current = setTimeout(() => {
            if (!logged.current) {
              logged.current = true;
              trackImpression({ recipe_id: recipeId, source });
            }
          }, delay);
        } else {
          if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
          }
        }
      },
      { threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [recipeId, source, threshold, delay]);
}
```

---

## 6. Hook — Session (Open + Close)

### `hooks/use-recipe-session.ts`

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { trackOpen, trackClose } from '@/lib/tracking/tracking-client';
import type { TrackingSource } from '@/lib/tracking/types';

export function useRecipeSession(recipeId: string, source: TrackingSource) {
  const openIdRef = useRef<string | null>(null);
  const openedAtRef = useRef<Date | null>(null);

  useEffect(() => {
    let mounted = true;

    // Ouvrir la session à l'arrivée sur la page
    const open = async () => {
      openedAtRef.current = new Date();
      const id = await trackOpen({ recipe_id: recipeId, source });
      if (mounted) openIdRef.current = id;
    };

    open();

    // Fermer la session à la navigation ou fermeture d'onglet
    const handleUnload = () => {
      if (openIdRef.current && openedAtRef.current) {
        trackClose(openIdRef.current, openedAtRef.current);
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    // Cleanup : fermeture de session à la navigation interne (SPA)
    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', handleUnload);
      handleUnload(); // navigation interne Next.js
    };
  }, [recipeId, source]);
}
```

---

## 7. Intégration dans les pages

### Impression — `app/(discovery)/recipes/page.tsx`

```tsx
'use client';

// RecipeCard avec impression tracking intégré
function RecipeCard({ recipe, source }: { recipe: Recipe; source: TrackingSource }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useRecipeImpression(cardRef, {
    recipeId: recipe.id,
    source,
  });

  return (
    <div ref={cardRef}>
      <Link href={`/recipe/${recipe.slug}`}>
        {/* ... contenu de la carte */}
      </Link>
    </div>
  );
}

export default function RecipesPage() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} source="feed" />
      ))}
    </div>
  );
}
```

---

### Open + Session — `app/(discovery)/recipe/[slug]/page.tsx`

```tsx
'use client';

import { useRecipeSession } from '@/hooks/use-recipe-session';

// Composant client wrapping la page (Server Component → Client boundary)
function RecipeSessionTracker({
  recipeId,
  source,
}: {
  recipeId: string;
  source: TrackingSource;
}) {
  useRecipeSession(recipeId, source);
  return null; // Aucun rendu — uniquement du comportement
}

// Page principale (peut rester Server Component)
export default async function RecipeDetailPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { from?: TrackingSource };
}) {
  const recipe = await getRecipeBySlug(params.slug);
  const source: TrackingSource = searchParams.from ?? 'feed';

  return (
    <>
      {/* Tracker invisible — client component */}
      <RecipeSessionTracker recipeId={recipe.id} source={source} />

      {/* Contenu de la page recette */}
      <RecipeDetailContent recipe={recipe} />
    </>
  );
}
```

**Passage de la source via URL :**  
Les liens depuis la page `/recipes` incluent `?from=feed` :
```tsx
<Link href={`/recipe/${recipe.slug}?from=feed`}>...</Link>
```

---

## 8. Checklist de vérification

### API Routes
- [ ] `POST /api/track/impression` — insert avec `user_id` null si anonyme
- [ ] `POST /api/track/open` — retourne l'id de la ligne insérée
- [ ] `PATCH /api/track/open/[id]` — update `closed_at` + `session_duration_seconds`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurée sur Vercel (sans préfixe `NEXT_PUBLIC_`)
- [ ] `supabase-admin.ts` jamais importé dans un fichier `'use client'`

### Impression
- [ ] `IntersectionObserver` sur chaque `RecipeCard`
- [ ] Seuil 50% + délai 1 seconde avant insert
- [ ] `logged` ref évite les doublons par instance de carte
- [ ] Cleanup observer dans le `useEffect` return
- [ ] Source passée correctement depuis chaque page

### Session
- [ ] `trackOpen` appelé au mount de `RecipeDetailPage`
- [ ] `trackClose` appelé via `beforeunload` ET via cleanup du `useEffect`
- [ ] `navigator.sendBeacon` utilisé pour `trackClose` (fiabilité fermeture onglet)
- [ ] Fallback `fetch keepalive` si `sendBeacon` non disponible
- [ ] Source passée via `?from=` dans l'URL

---

## 9. Notes importantes

**Server Component vs Client Component :**  
La page `recipe/[slug]` peut rester un Server Component (fetch des données côté serveur). Le tracking est isolé dans `RecipeSessionTracker`, un petit composant client `'use client'` sans rendu visible. Ce pattern évite de transformer toute la page en Client Component.

**`beforeunload` + cleanup `useEffect` :**  
Les deux écouteurs sont nécessaires :
- `beforeunload` → fermeture de l'onglet ou du navigateur
- Cleanup `useEffect` → navigation interne Next.js (SPA routing)

Sans le cleanup `useEffect`, les navigations internes ne loggent pas la fermeture de session.

**Sessions sans `closed_at` :**  
Si l'utilisateur perd sa connexion ou si `sendBeacon` échoue, la ligne `recipe_open` restera sans `closed_at`. Dans les analytics, filtrer avec `WHERE closed_at IS NOT NULL` pour les métriques de durée. Les lignes sans `closed_at` comptent quand même comme ouvertures valides.

**Rate limiting :**  
Pas de rate limiting sur les API routes de tracking en V1 (volume faible). À implémenter en V2 si nécessaire (Upstash Redis + middleware Next.js).

---

## Documents associés

| Document | Contenu |
|----------|---------|
| `V1_RECIPE_SCHEMA_ADDITIONS.md` | Schéma des tables `recipe_impression` et `recipe_open` |
| `V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md` | Architecture Next.js — structure projet, routing |
| `V1_ARCHITECTURE_DECISIONS.md` | Fait autorité en cas de contradiction |
| `CREATOR_ANALYTICS_DASHBOARD.md` | Utilisation des données de tracking dans le dashboard créateur |

---

*Document créé : Mars 2026*  
*Auteur : Curtis — Fondateur Akeli*  
*Version : 1.0 — Next.js Website V1 Recipe Tracking*
