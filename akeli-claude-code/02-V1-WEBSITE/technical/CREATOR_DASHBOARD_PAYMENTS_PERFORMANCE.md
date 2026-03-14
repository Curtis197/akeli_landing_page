# CREATOR DASHBOARD — Payment History & Recipe Performance
## Documentation technique V1 — Website Next.js

**Statut :** À implémenter  
**Surface :** Espace Créateur (authentifié) — `/dashboard`  
**Stack :** Next.js 14 · TypeScript · TanStack Query · Supabase · shadcn/ui

---

## Contexte & Diagnostic

Le dashboard créateur affiche actuellement les statistiques globales (revenus du mois, consommations, nombre de recettes). Deux sections sont manquantes :

1. **Historique des paiements** — le créateur ne peut pas voir ses versements passés ni leur statut
2. **Performance des recettes** — le créateur ne peut pas voir quelle recette génère quoi

Les tables nécessaires **existent déjà** en base :
- `creator_revenue_log` → revenus par recette, par jour
- `creator_balance` → solde disponible / en attente
- `payout` → historique des versements Stripe
- `meal_consumption` → consommations par recette
- `recipe_macro` → macros par recette
- `recipe` → catalogue du créateur

Le problème est **uniquement côté frontend** : les queries et les composants ne sont pas implémentés.

---

## SECTION 1 — Historique des paiements

### 1.1 Route

```
/dashboard/payments
```

Page dédiée accessible depuis la sidebar (`Revenus → Paiements`).

### 1.2 Ce que le créateur voit

```
┌──────────────────────────────────────────────────────────────┐
│  Solde disponible        Solde en attente    Total gagné      │
│  €127.50                 €43.20              €892.30          │
├──────────────────────────────────────────────────────────────┤
│  Historique des versements                                    │
│                                                               │
│  Mars 2026       €127.50    ● Payé       15 mars 2026        │
│  Février 2026    €98.40     ● Payé       14 fév. 2026        │
│  Janvier 2026    €76.10     ● Payé       13 jan. 2026        │
│  Décembre 2025   €43.20     ⏳ En cours                       │
│  Novembre 2025   €12.30     ✗ Échoué     [Voir détail]       │
└──────────────────────────────────────────────────────────────┘
```

### 1.3 Source de données

**Table principale : `payout`**

```sql
-- Colonnes utilisées
id              uuid
creator_id      uuid
amount          numeric        -- montant versé (€)
status          text           -- 'pending' | 'processing' | 'completed' | 'failed'
stripe_payout_id text          -- référence Stripe (affichée si 'completed')
requested_at    timestamptz    -- date de demande
completed_at    timestamptz    -- date de versement effectif
```

**Table complémentaire : `creator_balance`**

```sql
-- Colonnes utilisées
creator_id          uuid
available_balance   numeric    -- disponible immédiatement
pending_balance     numeric    -- en cours de traitement
lifetime_earnings   numeric    -- total gagné depuis le début
last_payout_at      timestamptz
```

### 1.4 Queries Supabase (Next.js)

```typescript
// lib/queries/payments.ts

// Solde créateur
export const getCreatorBalance = async (creatorId: string) => {
  const { data, error } = await supabase
    .from('creator_balance')
    .select('available_balance, pending_balance, lifetime_earnings, last_payout_at')
    .eq('creator_id', creatorId)
    .single()

  if (error) throw error
  return data
}

// Historique paiements (paginé)
export const getPayoutHistory = async (
  creatorId: string,
  page: number = 0,
  pageSize: number = 12
) => {
  const { data, error, count } = await supabase
    .from('payout')
    .select('id, amount, status, stripe_payout_id, requested_at, completed_at', {
      count: 'exact'
    })
    .eq('creator_id', creatorId)
    .order('requested_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1)

  if (error) throw error
  return { data, total: count ?? 0 }
}
```

### 1.5 Composant — PaymentHistoryPage

```typescript
// app/dashboard/payments/page.tsx

import { getCreatorBalance, getPayoutHistory } from '@/lib/queries/payments'
import { BalanceCards } from '@/components/dashboard/BalanceCards'
import { PayoutTable } from '@/components/dashboard/PayoutTable'

export default async function PaymentsPage() {
  const creator = await getCurrentCreator() // util auth
  const [balance, payouts] = await Promise.all([
    getCreatorBalance(creator.id),
    getPayoutHistory(creator.id)
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#1d2428]">Paiements</h1>
        <p className="text-gray-500 mt-1">Tes revenus et versements</p>
      </div>

      {/* Solde en 3 cards */}
      <BalanceCards balance={balance} />

      {/* Tableau historique */}
      <PayoutTable
        initialData={payouts.data}
        total={payouts.total}
        creatorId={creator.id}
      />
    </div>
  )
}
```

### 1.6 Composant — BalanceCards

```typescript
// components/dashboard/BalanceCards.tsx

type BalanceCardsProps = {
  balance: {
    available_balance: number
    pending_balance: number
    lifetime_earnings: number
    last_payout_at: string | null
  }
}

export function BalanceCards({ balance }: BalanceCardsProps) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border-t-4 border-[#3bb78f]">
        <p className="text-sm text-gray-500 font-medium">Disponible</p>
        <p className="text-4xl font-bold text-[#1d2428] mt-2">
          {formatEuro(balance.available_balance)}
        </p>
        <p className="text-xs text-gray-400 mt-2">Versé le mois prochain</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border-t-4 border-[#FF9F1C]">
        <p className="text-sm text-gray-500 font-medium">En attente</p>
        <p className="text-4xl font-bold text-[#1d2428] mt-2">
          {formatEuro(balance.pending_balance)}
        </p>
        <p className="text-xs text-gray-400 mt-2">Consommations en cours</p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border-t-4 border-[#9c88ff]">
        <p className="text-sm text-gray-500 font-medium">Total gagné</p>
        <p className="text-4xl font-bold text-[#1d2428] mt-2">
          {formatEuro(balance.lifetime_earnings)}
        </p>
        {balance.last_payout_at && (
          <p className="text-xs text-gray-400 mt-2">
            Dernier versement : {formatDate(balance.last_payout_at)}
          </p>
        )}
      </div>
    </div>
  )
}
```

### 1.7 Composant — PayoutTable

```typescript
// components/dashboard/PayoutTable.tsx
// Client component — pagination côté client via TanStack Query

'use client'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'

const STATUS_CONFIG = {
  completed:  { label: 'Payé',       color: 'bg-green-100 text-green-700' },
  pending:    { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  processing: { label: 'En cours',   color: 'bg-blue-100 text-blue-700' },
  failed:     { label: 'Échoué',     color: 'bg-red-100 text-red-700' },
}

export function PayoutTable({ initialData, total, creatorId }) {
  const [page, setPage] = useState(0)

  const { data } = useQuery({
    queryKey: ['payouts', creatorId, page],
    queryFn: () => getPayoutHistory(creatorId, page),
    initialData: page === 0 ? { data: initialData, total } : undefined,
    placeholderData: (prev) => prev, // keeps previous data while loading
  })

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b">
        <h2 className="text-xl font-semibold">Historique des versements</h2>
      </div>

      <table className="w-full">
        <thead className="bg-gray-50 text-sm text-gray-500">
          <tr>
            <th className="text-left p-4">Période</th>
            <th className="text-right p-4">Montant</th>
            <th className="text-center p-4">Statut</th>
            <th className="text-right p-4">Date</th>
            <th className="text-right p-4">Référence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data?.data?.map((payout) => {
            const status = STATUS_CONFIG[payout.status]
            return (
              <tr key={payout.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-medium">
                  {formatMonthLabel(payout.requested_at)}
                </td>
                <td className="p-4 text-right font-bold text-[#1d2428]">
                  {formatEuro(payout.amount)}
                </td>
                <td className="p-4 text-center">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${status.color}`}>
                    {status.label}
                  </span>
                </td>
                <td className="p-4 text-right text-gray-500 text-sm">
                  {payout.completed_at
                    ? formatDate(payout.completed_at)
                    : payout.status === 'failed' ? '—' : 'En cours'}
                </td>
                <td className="p-4 text-right text-gray-400 text-xs font-mono">
                  {payout.stripe_payout_id
                    ? payout.stripe_payout_id.slice(-8).toUpperCase()
                    : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="p-4 flex items-center justify-between border-t">
        <p className="text-sm text-gray-500">
          {total} versement{total > 1 ? 's' : ''} au total
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40"
          >
            Précédent
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={(page + 1) * 12 >= total}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## SECTION 2 — Performance des recettes

### 2.1 Route

```
/dashboard/recipes
```

Page dédiée ou section du dashboard principal (choix UX à confirmer).

### 2.2 Ce que le créateur voit

```
┌──────────────────────────────────────────────────────────────┐
│  Performance de tes recettes          Période : [Ce mois ▾]  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ #  Recette              Consommations  Revenus   Trend   │ │
│  │ 1  Thiéboudienne        342            €11.29    ↑ +12%  │ │
│  │ 2  Poulet Yassa         287            €9.47     ↑ +8%   │ │
│  │ 3  Mafé Bœuf            201            €6.63     → 0%    │ │
│  │ 4  Attieké Poisson       98            €3.23     ↓ -5%   │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                               │
│  [Voir l'analyse complète ✨]  → appel Edge Function Claude   │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 Source de données

**Table principale : `creator_revenue_log`**

```sql
-- Colonnes utilisées
creator_id    uuid
recipe_id     uuid
revenue_type  text       -- 'consumption' | 'fan_mode'
amount        numeric    -- revenus générés ce jour
logged_at     date
```

**Table complémentaire : `meal_consumption`**

```sql
-- Colonnes utilisées
recipe_id     uuid
consumed_at   timestamptz
user_id       uuid       -- pour compter les utilisateurs uniques
```

**Table complémentaire : `recipe`**

```sql
-- Colonnes utilisées
id            uuid
title         text
cover_image_url text
is_published  boolean
created_at    timestamptz
```

### 2.4 Vue SQL recommandée

Créer une vue pour simplifier les queries frontend :

```sql
-- Vue : recipe_performance_summary
-- À ajouter dans la base V1

CREATE OR REPLACE VIEW public.recipe_performance_summary AS
SELECT
  r.id                                          AS recipe_id,
  r.creator_id,
  r.title,
  r.cover_image_url,
  r.is_published,
  r.created_at                                  AS published_at,

  -- Consommations totales (all-time)
  COUNT(DISTINCT mc.id)                         AS total_consumptions,

  -- Consommateurs uniques (all-time)
  COUNT(DISTINCT mc.user_id)                    AS unique_users,

  -- Revenus totaux (all-time)
  COALESCE(SUM(crl.amount), 0)                  AS total_revenue,

  -- Consommations ce mois
  COUNT(DISTINCT mc.id) FILTER (
    WHERE DATE_TRUNC('month', mc.consumed_at) = DATE_TRUNC('month', CURRENT_DATE)
  )                                             AS consumptions_this_month,

  -- Revenus ce mois
  COALESCE(SUM(crl.amount) FILTER (
    WHERE DATE_TRUNC('month', crl.logged_at) = DATE_TRUNC('month', CURRENT_DATE)
  ), 0)                                         AS revenue_this_month,

  -- Consommations mois précédent (pour calcul trend)
  COUNT(DISTINCT mc.id) FILTER (
    WHERE DATE_TRUNC('month', mc.consumed_at) =
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  )                                             AS consumptions_last_month

FROM public.recipe r
LEFT JOIN public.meal_consumption mc  ON mc.recipe_id = r.id
LEFT JOIN public.creator_revenue_log crl ON crl.recipe_id = r.id
GROUP BY r.id, r.creator_id, r.title, r.cover_image_url, r.is_published, r.created_at;

-- RLS : chaque créateur voit uniquement ses recettes
CREATE POLICY "creator_read_own_recipe_performance"
  ON public.recipe_performance_summary   -- noter : policies sur vues ne fonctionnent pas
  -- → La sécurité est portée par les tables sources (recipe, meal_consumption, creator_revenue_log)
  -- → Filtrer par creator_id dans la query Next.js
```

> **Note :** Les vues PostgreSQL n'ont pas de RLS propre. La sécurité est assurée par le filtre `creator_id` dans chaque query Next.js côté serveur (Server Component avec session auth vérifiée).

### 2.5 Queries Supabase (Next.js)

```typescript
// lib/queries/recipe-performance.ts

// Performance de toutes les recettes d'un créateur
export const getRecipePerformance = async (
  creatorId: string,
  sortBy: 'revenue_this_month' | 'consumptions_this_month' | 'total_revenue' = 'revenue_this_month'
) => {
  const { data, error } = await supabase
    .from('recipe_performance_summary')
    .select(`
      recipe_id,
      title,
      cover_image_url,
      is_published,
      total_consumptions,
      unique_users,
      total_revenue,
      consumptions_this_month,
      revenue_this_month,
      consumptions_last_month
    `)
    .eq('creator_id', creatorId)
    .eq('is_published', true)
    .order(sortBy, { ascending: false })

  if (error) throw error

  // Calculer le trend (%) pour chaque recette
  return data?.map(recipe => ({
    ...recipe,
    trend: recipe.consumptions_last_month > 0
      ? Math.round(
          ((recipe.consumptions_this_month - recipe.consumptions_last_month)
            / recipe.consumptions_last_month) * 100
        )
      : recipe.consumptions_this_month > 0 ? 100 : 0
  }))
}

// Performance d'une recette spécifique (pour la page détail recette)
export const getRecipePerformanceById = async (
  recipeId: string,
  creatorId: string
) => {
  const { data, error } = await supabase
    .from('recipe_performance_summary')
    .select('*')
    .eq('recipe_id', recipeId)
    .eq('creator_id', creatorId)
    .single()

  if (error) throw error
  return data
}
```

### 2.6 Composant — RecipePerformancePage

```typescript
// app/dashboard/recipes/page.tsx

import { getRecipePerformance } from '@/lib/queries/recipe-performance'
import { RecipePerformanceTable } from '@/components/dashboard/RecipePerformanceTable'

export default async function RecipePerformancePage() {
  const creator = await getCurrentCreator()
  const recipes = await getRecipePerformance(creator.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#1d2428]">Mes recettes</h1>
        <p className="text-gray-500 mt-1">Performance de chaque recette ce mois</p>
      </div>

      <RecipePerformanceTable
        recipes={recipes}
        creatorId={creator.id}
      />
    </div>
  )
}
```

### 2.7 Composant — RecipePerformanceTable

```typescript
// components/dashboard/RecipePerformanceTable.tsx
'use client'

type SortKey = 'revenue_this_month' | 'consumptions_this_month' | 'total_revenue'

export function RecipePerformanceTable({ recipes, creatorId }) {
  const [sortBy, setSortBy] = useState<SortKey>('revenue_this_month')
  const [aiInsight, setAiInsight] = useState<string | null>(null)
  const [loadingInsight, setLoadingInsight] = useState(false)

  const { data, refetch } = useQuery({
    queryKey: ['recipe-performance', creatorId, sortBy],
    queryFn: () => getRecipePerformance(creatorId, sortBy),
    initialData: recipes,
  })

  const handleAiInsight = async () => {
    setLoadingInsight(true)
    const { data } = await supabase.functions.invoke('explain-recipe-performance', {
      body: { creator_id: creatorId }
    })
    setAiInsight(data?.explanation)
    setLoadingInsight(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b flex items-center justify-between">
        <h2 className="text-xl font-semibold">Performance ce mois</h2>
        <div className="flex items-center gap-3">
          {/* Sélecteur de tri */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="text-sm border rounded-lg px-3 py-2"
          >
            <option value="revenue_this_month">Revenus ce mois</option>
            <option value="consumptions_this_month">Consommations ce mois</option>
            <option value="total_revenue">Revenus totaux</option>
          </select>

          {/* Bouton analyse IA */}
          <button
            onClick={handleAiInsight}
            disabled={loadingInsight}
            className="flex items-center gap-2 px-4 py-2 bg-[#9c88ff] text-white rounded-lg text-sm font-medium hover:bg-[#8a76f0] transition-colors disabled:opacity-60"
          >
            {loadingInsight ? '...' : '✨ Analyser'}
          </button>
        </div>
      </div>

      {/* Panel IA (affiché si insight disponible) */}
      {aiInsight && (
        <div className="mx-6 mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100 text-sm text-[#1d2428]">
          <p className="font-medium text-[#9c88ff] mb-1">Analyse IA</p>
          <p>{aiInsight}</p>
        </div>
      )}

      <table className="w-full">
        <thead className="bg-gray-50 text-sm text-gray-500">
          <tr>
            <th className="text-left p-4">#</th>
            <th className="text-left p-4">Recette</th>
            <th className="text-right p-4">Consommations</th>
            <th className="text-right p-4">Revenus</th>
            <th className="text-right p-4">Tendance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {data?.map((recipe, index) => (
            <tr key={recipe.recipe_id} className="hover:bg-gray-50 transition-colors">
              <td className="p-4 text-gray-400 font-medium">{index + 1}</td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  {recipe.cover_image_url && (
                    <img
                      src={recipe.cover_image_url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  )}
                  <span className="font-medium text-[#1d2428]">{recipe.title}</span>
                </div>
              </td>
              <td className="p-4 text-right">
                <span className="font-bold text-[#1d2428]">
                  {recipe.consumptions_this_month}
                </span>
                <span className="text-gray-400 text-xs ml-1">
                  / {recipe.total_consumptions} total
                </span>
              </td>
              <td className="p-4 text-right font-bold text-[#3bb78f]">
                {formatEuro(recipe.revenue_this_month)}
              </td>
              <td className="p-4 text-right">
                <TrendBadge value={recipe.trend} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data?.length === 0 && (
        <div className="p-12 text-center text-gray-400">
          <p>Aucune recette publiée pour le moment.</p>
        </div>
      )}
    </div>
  )
}

function TrendBadge({ value }: { value: number }) {
  if (value > 0) return (
    <span className="text-green-600 font-medium text-sm">↑ +{value}%</span>
  )
  if (value < 0) return (
    <span className="text-red-500 font-medium text-sm">↓ {value}%</span>
  )
  return <span className="text-gray-400 font-medium text-sm">→</span>
}
```

---

## SECTION 3 — Intégration dans le dashboard principal

Le dashboard `/dashboard` doit afficher un **résumé** des deux sections ci-dessus, avec un lien vers la page complète.

### 3.1 Widget paiements (résumé)

```
┌─────────────────────────────────┐
│ Prochain versement              │
│ €127.50    ● Prévu ~15 avril    │
│                                 │
│ Dernier versement               │
│ €98.40     ✓ Payé 14 mars 2026  │
│                                 │
│           [Voir l'historique →] │
└─────────────────────────────────┘
```

Query : `creator_balance` + dernière ligne de `payout` statut `completed`.

### 3.2 Widget performance (top 3)

```
┌─────────────────────────────────┐
│ Top recettes ce mois            │
│                                 │
│ 1. Thiéboudienne     342  €11.29│
│ 2. Yassa Poulet      287   €9.47│
│ 3. Mafé Bœuf         201   €6.63│
│                                 │
│         [Voir toutes les recettes →] │
└─────────────────────────────────┘
```

Query : `recipe_performance_summary` limitée à 3 résultats, triée par `revenue_this_month`.

---

## SECTION 4 — Navigation sidebar

Ajouter les deux pages dans la sidebar du dashboard :

```typescript
// components/dashboard/Sidebar.tsx — items à ajouter

const NAV_ITEMS = [
  { href: '/dashboard',          label: 'Vue d'ensemble',  icon: LayoutDashboard },
  { href: '/dashboard/recipes',  label: 'Mes recettes',    icon: ChefHat },       // ← existant
  { href: '/dashboard/payments', label: 'Paiements',       icon: CreditCard },    // ← NOUVEAU
  { href: '/dashboard/profile',  label: 'Mon profil',      icon: User },
  { href: '/dashboard/settings', label: 'Paramètres',      icon: Settings },
]
```

---

## SECTION 5 — Checklist d'implémentation

### Étape 1 — Base de données
- [ ] Créer la vue `recipe_performance_summary` (SQL fourni section 2.4)
- [ ] Vérifier que `creator_balance` est bien alimentée par les triggers existants
- [ ] Vérifier que `payout` est alimentée par l'Edge Function de paiement Stripe

### Étape 2 — Queries
- [ ] Créer `lib/queries/payments.ts`
- [ ] Créer `lib/queries/recipe-performance.ts`
- [ ] Ajouter les query keys dans le provider TanStack Query

### Étape 3 — Composants
- [ ] `BalanceCards` — 3 cards solde
- [ ] `PayoutTable` — tableau paginé historique
- [ ] `RecipePerformanceTable` — tableau trié + bouton IA
- [ ] `TrendBadge` — indicateur tendance
- [ ] Widgets résumé pour le dashboard principal

### Étape 4 — Pages
- [ ] `/dashboard/payments` — page paiements complète
- [ ] `/dashboard/recipes` — page performance recettes
- [ ] Mise à jour `/dashboard` — widgets résumé

### Étape 5 — Navigation
- [ ] Ajouter "Paiements" dans la sidebar

### Étape 6 — Edge Function IA (déjà spécifiée dans `V1_WEBSITE_IA_SPECIFICATIONS.md`)
- [ ] Vérifier déploiement `explain-recipe-performance`
- [ ] Vérifier déploiement `explain-creator-stats`
- [ ] Confirmer les secrets `CLAUDE_API_KEY` configurés

---

## SECTION 6 — Utilitaires partagés

```typescript
// lib/utils/format.ts

export const formatEuro = (amount: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount)

export const formatDate = (dateString: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString))

export const formatMonthLabel = (dateString: string): string =>
  new Intl.DateTimeFormat('fr-FR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString))
```

---

## Documents associés

| Document | Contenu |
|----------|---------|
| `V1_WEBSITE_PAGES_SPECIFICATIONS.md` | Specs complètes toutes les pages dashboard |
| `V1_WEBSITE_IA_SPECIFICATIONS.md` | Edge Functions `explain-creator-stats` et `explain-recipe-performance` |
| `V1_WEBSITE_DATABASE_COMPLETE.md` | Schéma `creator_revenue_log`, `creator_balance`, `payout` |
| `V1_BACKEND_EDGE_FUNCTIONS.md` | Catalogue complet Edge Functions V1 |
| `V1_ARCHITECTURE_DECISIONS.md` | Fait autorité en cas de contradiction |

---

*Document créé : Mars 2026*
*Auteur : Curtis — Fondateur Akeli*
*Version : 1.0 — Creator Dashboard — Payment History & Recipe Performance*
