# V1_STRIPE_CONNECT_WEBSITE.md
# Stripe Connect — Intégration Website Akeli V1

> **Auteur** : Curtis — Fondateur Akeli  
> **Date** : Mars 2026  
> **Statut** : Prêt pour Claude Code  
> **Périmètre** : Website Next.js uniquement (`a-keli.com`)

---

## 1. Contexte & périmètre strict

Stripe est utilisé par Akeli **uniquement comme outil de paiement sortant**.

- Les utilisateurs paient via Apple App Store / Google Play Store
- Apple/Google collectent la TVA et versent le net (~70%) à Akeli
- Akeli calcule les revenus créateurs sur la plateforme (table `creator_revenue_log`)
- Stripe transfère ces revenus aux créateurs via Stripe Connect Express

**Stripe ne gère pas :**
- Les abonnements utilisateurs
- Les paiements entrants
- Les factures
- Les produits ou prix

**Stripe gère uniquement :**
- L'onboarding bancaire des créateurs (KYC + IBAN)
- Les transfers mensuels Akeli → créateur

---

## 2. Flux complet

```
[Créateur s'inscrit sur Akeli]
         │
         ▼
[Edge Function : create-connect-account]
  → Crée un compte Express Stripe (acct_xxx)
  → Stocke stripe_account_id dans creator + creator_stripe_account
  → Retourne une URL d'onboarding Stripe
         │
         ▼
[Créateur complète l'onboarding sur Stripe]
  → KYC identité + IBAN (~3 minutes)
  → Redirigé vers /settings?stripe=success
         │
         ▼
[Webhook : account.updated]
  → onboarding_complete = true
  → charges_enabled, payouts_enabled mis à jour
  → creator.stripe_onboarding_complete = true
         │
         ▼
[Cron : compute-monthly-revenue — 1er du mois]
  → Calcule les earnings depuis creator_revenue_log
  → Crée un transfer Stripe vers acct_xxx
  → Stocke stripe_transfer_id dans payout
         │
         ▼
[Webhook : payout.paid]
  → payout.status = 'completed'
  → payout.completed_at = now()
```

---

## 3. Base de données — état après migrations

### Table `creator` — colonnes ajoutées

| Colonne | Type | Default | Description |
|---|---|---|---|
| `stripe_account_id` | text | NULL | `acct_xxx` du compte Express |
| `stripe_onboarding_complete` | boolean | false | Onboarding Stripe terminé |

### Table `creator_stripe_account` — nouvelle table

| Colonne | Type | Default | Description |
|---|---|---|---|
| `id` | uuid | gen_random_uuid() | PK |
| `creator_id` | uuid | — | FK → creator.id |
| `stripe_account_id` | text | — | `acct_xxx` UNIQUE |
| `onboarding_complete` | boolean | false | KYC terminé |
| `charges_enabled` | boolean | false | Paiements activés |
| `payouts_enabled` | boolean | false | Virements activés |
| `country` | text | 'FR' | Pays du compte |
| `created_at` | timestamptz | now() | — |
| `updated_at` | timestamptz | now() | — |

> RLS activée. Seul le créateur propriétaire peut lire son propre enregistrement.

### Table `payout` — colonne ajoutée

| Colonne | Type | Default | Description |
|---|---|---|---|
| `stripe_transfer_id` | text | NULL | `tr_xxx` du transfer Akeli → créateur |

> Note : `stripe_payout_id` (existant) = payout Stripe → banque du créateur.  
> `stripe_transfer_id` (nouveau) = transfer Akeli → compte Express créateur.  
> Ce sont deux objets Stripe distincts.

---

## 4. Edge Functions

### 4.1 `create-connect-account` — À CRÉER

**Méthode** : POST  
**Auth** : Requise (`verify_jwt: true`)  
**Appelée depuis** : Website `/settings` — bouton "Configurer mon compte de paiement"

**Body** :
```typescript
{
  creator_id: string  // uuid du créateur connecté
}
```

**Logique** :
1. Vérifier que le créateur n'a pas déjà un `stripe_account_id`
2. Créer un compte Express Stripe :
```typescript
const account = await stripe.accounts.create({
  type: 'express',
  country: 'FR',
  capabilities: {
    transfers: { requested: true }
  }
})
```
3. Stocker dans `creator` :
```sql
UPDATE creator
SET stripe_account_id = 'acct_xxx'
WHERE id = creator_id
```
4. Stocker dans `creator_stripe_account` :
```sql
INSERT INTO creator_stripe_account
  (creator_id, stripe_account_id, country)
VALUES
  (creator_id, 'acct_xxx', 'FR')
```
5. Générer le lien d'onboarding :
```typescript
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: 'https://a-keli.com/fr/settings?stripe=refresh',
  return_url:  'https://a-keli.com/fr/settings?stripe=success',
  type: 'account_onboarding'
})
```
6. Retourner `{ url: accountLink.url }`

**Response** :
```typescript
{ url: string }  // URL vers Stripe hosted onboarding
```

---

### 4.2 `stripe-webhook` — À METTRE À JOUR

**Méthode** : POST  
**Auth** : Signature Stripe (`verify_jwt: false`)  
**Événements à traiter** :

| Événement | Action |
|---|---|
| `account.updated` | Mettre à jour `creator_stripe_account` + `creator.stripe_onboarding_complete` |
| `payout.created` | Mettre à jour `payout.status = 'processing'` |
| `payout.paid` | Mettre à jour `payout.status = 'completed'`, `payout.completed_at` |
| `payout.failed` | Mettre à jour `payout.status = 'failed'` |
| `account.external_account.updated` | Logger — compte bancaire créateur modifié |

**Logique pour `account.updated`** :
```typescript
case 'account.updated': {
  const account = event.data.object
  
  await supabase
    .from('creator_stripe_account')
    .update({
      onboarding_complete: account.details_submitted,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      updated_at: new Date().toISOString()
    })
    .eq('stripe_account_id', account.id)

  if (account.details_submitted) {
    await supabase
      .from('creator')
      .update({ stripe_onboarding_complete: true })
      .eq('stripe_account_id', account.id)
  }
  break
}
```

**Logique pour `payout.paid`** :
```typescript
case 'payout.paid': {
  const payout = event.data.object

  await supabase
    .from('payout')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      stripe_payout_id: payout.id
    })
    .eq('stripe_transfer_id', payout.source_transfer)
  break
}
```

> **Important** : Le `stripe-webhook` existant gère des événements obsolètes  
> (subscription, invoice). Ces handlers doivent être supprimés et remplacés  
> par les événements Connect listés ci-dessus.

---

## 5. Intégration Website — `/settings`

**Seule page concernée.** Route : `/(creator)/settings`  
**Rendu** : CSR  
**Auth** : Requise

### Section Paiements — 3 états possibles

**État 1 — Non configuré**
```
┌─────────────────────────────────────────┐
│ 💳 Paiements                            │
│                                         │
│ Configurez votre compte pour recevoir   │
│ vos revenus chaque mois.                │
│                                         │
│ [Configurer mon compte de paiement →]   │
└─────────────────────────────────────────┘
```

**État 2 — En cours (onboarding démarré, pas terminé)**
```
┌─────────────────────────────────────────┐
│ 💳 Paiements                            │
│                                         │
│ ⏳ Configuration en attente             │
│ Complétez votre compte Stripe pour      │
│ activer les versements.                 │
│                                         │
│ [Continuer la configuration →]          │
└─────────────────────────────────────────┘
```

**État 3 — Configuré et actif**
```
┌─────────────────────────────────────────┐
│ 💳 Paiements                            │
│                                         │
│ ✅ Compte actif                         │
│ Prochain versement : 1er mai 2026       │
│                                         │
│ [Gérer mon compte Stripe ↗]            │
└─────────────────────────────────────────┘
```

### Logique du composant

```typescript
// Lecture depuis creator_stripe_account (via Supabase client)
const { data: stripeAccount } = await supabase
  .from('creator_stripe_account')
  .select('onboarding_complete, payouts_enabled, stripe_account_id')
  .eq('creator_id', creatorId)
  .maybeSingle()

// Détermination de l'état
const status = !stripeAccount
  ? 'not_configured'
  : !stripeAccount.onboarding_complete
  ? 'pending'
  : 'active'
```

### Action bouton "Configurer"

```typescript
async function handleStripeSetup() {
  const { data } = await supabase.functions.invoke('create-connect-account', {
    body: { creator_id: creatorId }
  })
  // Redirection vers Stripe hosted onboarding
  window.location.href = data.url
}
```

### Gestion du retour Stripe

Après onboarding, Stripe redirige vers `/settings?stripe=success` ou `?stripe=refresh`.

```typescript
// Dans le composant Settings — détection des query params au montage
const searchParams = useSearchParams()
const stripeStatus = searchParams.get('stripe')

useEffect(() => {
  if (stripeStatus === 'success') {
    // Afficher toast : "Configuration en cours de vérification..."
    // Le webhook account.updated confirmera dans quelques secondes
    refetchStripeAccount()
  }
  if (stripeStatus === 'refresh') {
    // L'onboarding a expiré — relancer
    handleStripeSetup()
  }
}, [stripeStatus])
```

### Lien "Gérer mon compte Stripe"

Pour le créateur dont l'onboarding est terminé, un lien vers le dashboard Express :

```typescript
// URL fixe du dashboard Express Stripe (pas d'API call nécessaire)
const STRIPE_EXPRESS_DASHBOARD = 'https://connect.stripe.com/express_login'
```

---

## 6. Secrets Supabase — état actuel

| Secret | Statut |
|---|---|
| `STRIPE_SECRET_KEY` | ✅ Configuré |
| `STRIPE_WEBHOOK_SECRET` | ✅ Configuré |
| `STRIPE_CONNECT_CLIENT_ID` | ❌ Non requis pour V1 |

> Aucune clé Stripe ne doit apparaître côté client Next.js.  
> Tous les appels Stripe passent par les Edge Functions Supabase.

---

## 7. Variables d'environnement Vercel

Aucune variable Stripe côté Vercel. Les URLs de retour sont hardcodées dans  
la Edge Function `create-connect-account` :

```
refresh_url : https://a-keli.com/fr/settings?stripe=refresh
return_url  : https://a-keli.com/fr/settings?stripe=success
```

Pour les locales EN :
```
refresh_url : https://a-keli.com/en/settings?stripe=refresh
return_url  : https://a-keli.com/en/settings?stripe=success
```

> Adapter selon la locale active du créateur lors de l'appel.

---

## 8. Checklist de validation

```
EDGE FUNCTION create-connect-account
□ Crée un compte Express Stripe sans erreur
□ Stocke stripe_account_id dans creator
□ Stocke la ligne dans creator_stripe_account
□ Retourne une URL d'onboarding valide
□ Rejette si stripe_account_id existe déjà

WEBHOOK stripe-webhook
□ Vérifie la signature Stripe (whsec_...)
□ account.updated → met à jour creator_stripe_account
□ account.updated → met à jour creator.stripe_onboarding_complete
□ payout.paid → met à jour payout.status = 'completed'
□ payout.failed → met à jour payout.status = 'failed'

WEBSITE /settings
□ État "non configuré" affiché si pas de stripe_account_id
□ État "en attente" affiché si onboarding_complete = false
□ État "actif" affiché si onboarding_complete = true
□ Clic bouton → redirect vers Stripe hosted onboarding
□ Retour ?stripe=success → refetch du statut
□ Retour ?stripe=refresh → relance l'onboarding
□ Lien dashboard Express visible si état actif
```

---

## 9. Documents associés

| Document | Contenu |
|---|---|
| `V1_BACKEND_EDGE_FUNCTIONS.md` | Catalogue complet des Edge Functions |
| `V1_DATABASE_SCHEMA.md` | Schéma base V1 — 45+ tables |
| `V1_WEBSITE_PAGES_SPECIFICATIONS.md` | Specs complètes de /settings |
| `V1_ARCHITECTURE_DECISIONS.md` | ADR — décisions d'architecture |
| `MASTER_INDEX.md` | Index général du projet |
