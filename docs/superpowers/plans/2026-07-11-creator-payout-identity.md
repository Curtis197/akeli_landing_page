# Creator Payout Identity (Remitly manual payouts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a creator who can't use Stripe (mainly African creators, since Stripe Connect Express is effectively FR-only in this codebase today) submit bank/mobile-money identity details, stored in a new Supabase table, so Curtis can send them a manual Remitly transfer.

**Architecture:** One new Supabase table (`creator_payout_identity`, RLS-protected, one row per creator) + one new query/mutation helper file + a new self-toggled subsection appended to the existing "Paiements" section in the creator settings page. No new services, no API integrations — this only collects data a human reads later.

**Tech Stack:** Next.js App Router (existing page, client component), Supabase Postgres + RLS, `@supabase/supabase-js` browser client, TanStack Query v5 (`useQuery`, matching the existing `stripeAccount` query in the same file).

## Global Constraints

- RLS ownership check for all policies: `creator_id IN (SELECT id FROM public.creator WHERE user_id = auth.uid())` — this is the pattern already used by `creator_balance`'s "creator reads own" policy. Do not use `auth_id` (that column doesn't exist on `creator`; only `user_id` does — confirmed via `supabase/migrations/20260318000000_init.sql:2499`).
- Reuse the existing `public.update_updated_at()` trigger function (already defined and used by other tables, e.g. `supabase/migrations/20260620100000_create_visitor_system.sql:37`) — do not write a new trigger function.
- `country` and `mobile_money_provider` are plain `text` columns backed by UI dropdown lists, not DB-level enums or CHECK constraints on their values — adding a new country/provider later must not require a migration.
- No new automated tests for the query-helper or UI layers: `lib/queries/payments.ts` (the closest existing analog) has zero tests despite `vitest` being configured, and the approved spec explicitly follows that same practice. Automated tests are still expected for the DB constraint itself (SQL-based, see Task 1) — Task 3 and Task 4 are verified manually via the dev server instead.
- This settings page (`app/[locale]/(creator)/settings/page.tsx`) has no i18n hookup at all (no `useTranslations`, hardcoded French) — new copy stays hardcoded French, matching the rest of the file. Do not add `next-intl` calls here.
- Match this file's existing form conventions: plain `useState` + manual required-field validation + inline error text (see the password-change section, `settings/page.tsx:14-44`), not React Hook Form/Zod.
- Out of scope, do not implement: any Remitly API call, an admin verification UI (status is flipped to `'verified'` by hand in the Supabase table editor), any change to the `payout`/`creator_balance` tables, or ID document file upload.

---

### Task 1: Database migration — `creator_payout_identity` table

**Files:**
- Create: `supabase/migrations/20260711120000_create_creator_payout_identity.sql`

**Interfaces:**
- Produces: table `public.creator_payout_identity` with columns `creator_id (uuid, PK, FK -> creator.id)`, `legal_full_name (text)`, `country (text)`, `id_document_number (text)`, `payout_method (text, 'mobile_money'|'bank_transfer')`, `mobile_money_provider (text, nullable)`, `mobile_money_number (text, nullable)`, `bank_name (text, nullable)`, `bank_account_number (text, nullable)`, `status (text, 'submitted'|'verified', default 'submitted')`, `verified_at (timestamptz, nullable)`, `created_at (timestamptz)`, `updated_at (timestamptz)`. RLS enabled, SELECT/INSERT/UPDATE policies scoped to the owning creator.

- [ ] **Step 1: Write the migration file**

```sql
-- Migration: Create creator_payout_identity table (manual Remitly payouts for African creators)
-- Created at: 2026-07-11

CREATE TABLE IF NOT EXISTS public.creator_payout_identity (
  creator_id uuid PRIMARY KEY REFERENCES public.creator(id) ON DELETE CASCADE,
  legal_full_name text NOT NULL,
  country text NOT NULL,
  id_document_number text NOT NULL,
  payout_method text NOT NULL CHECK (payout_method IN ('mobile_money', 'bank_transfer')),
  mobile_money_provider text,
  mobile_money_number text,
  bank_name text,
  bank_account_number text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified')),
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT payout_method_fields_chk CHECK (
    (payout_method = 'mobile_money' AND mobile_money_number IS NOT NULL)
    OR (payout_method = 'bank_transfer' AND bank_name IS NOT NULL AND bank_account_number IS NOT NULL)
  )
);

ALTER TABLE public.creator_payout_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator reads own" ON public.creator_payout_identity
  FOR SELECT USING (creator_id IN (SELECT id FROM public.creator WHERE user_id = auth.uid()));

CREATE POLICY "creator inserts own" ON public.creator_payout_identity
  FOR INSERT WITH CHECK (creator_id IN (SELECT id FROM public.creator WHERE user_id = auth.uid()));

CREATE POLICY "creator updates own" ON public.creator_payout_identity
  FOR UPDATE USING (creator_id IN (SELECT id FROM public.creator WHERE user_id = auth.uid()));

CREATE TRIGGER trg_creator_payout_identity_updated_at
  BEFORE UPDATE ON public.creator_payout_identity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

- [ ] **Step 2: Apply the migration to the linked Supabase project**

Use the `mcp__claude_ai_Supabase__apply_migration` tool with `name: "create_creator_payout_identity"` and the SQL from Step 1 as `query`. This is a real schema change against the shared backend — confirm with the user before running if the tool prompts for approval.

- [ ] **Step 3: Verify the table and RLS are live**

Use `mcp__claude_ai_Supabase__execute_sql` to run:

```sql
SELECT rowsecurity FROM pg_tables WHERE tablename = 'creator_payout_identity';
```

Expected: one row, `rowsecurity = true`.

- [ ] **Step 4: Verify the CHECK constraint rejects an incomplete row (test, self-cleaning via ROLLBACK)**

Run via `mcp__claude_ai_Supabase__execute_sql`:

```sql
BEGIN;
INSERT INTO creator_payout_identity (creator_id, legal_full_name, country, id_document_number, payout_method)
SELECT id, 'Test User', 'Ghana', 'ID123', 'mobile_money' FROM creator LIMIT 1;
ROLLBACK;
```

Expected: the `INSERT` fails with `new row for relation "creator_payout_identity" violates check constraint "payout_method_fields_chk"` (missing `mobile_money_number`). No row is persisted.

- [ ] **Step 5: Verify a complete row is accepted (test, self-cleaning via ROLLBACK)**

Run via `mcp__claude_ai_Supabase__execute_sql`:

```sql
BEGIN;
INSERT INTO creator_payout_identity (creator_id, legal_full_name, country, id_document_number, payout_method, mobile_money_number)
SELECT id, 'Test User', 'Ghana', 'ID123', 'mobile_money', '+233000000000' FROM creator LIMIT 1
RETURNING creator_id, status;
ROLLBACK;
```

Expected: one row returned with `status = 'submitted'`. `ROLLBACK` leaves the table empty afterward — confirm with `SELECT count(*) FROM creator_payout_identity;` returning `0`.

- [ ] **Step 6: Commit the migration file**

```bash
git add supabase/migrations/20260711120000_create_creator_payout_identity.sql
git commit -m "feat: add creator_payout_identity table for manual Remitly payouts"
```

---

### Task 2: TypeScript types for the new table

**Files:**
- Modify: `lib/supabase/database.types.ts:421-422`

**Interfaces:**
- Consumes: the exact column set from Task 1.
- Produces: `Database["public"]["Tables"]["creator_payout_identity"]` with `Row`, `Insert`, `Update`, `Relationships` — consumed by Task 3's query helpers via `SupabaseClient`.

- [ ] **Step 1: Insert the new table's types between `creator_balance` and `creator_revenue_log`**

In `lib/supabase/database.types.ts`, the `creator_balance` block currently ends and `creator_revenue_log` begins like this:

```typescript
        ]
      }
      creator_revenue_log: {
```

Replace that with (inserting the new block before `creator_revenue_log`):

```typescript
        ]
      }
      creator_payout_identity: {
        Row: {
          bank_account_number: string | null
          bank_name: string | null
          country: string
          created_at: string
          creator_id: string
          id_document_number: string
          legal_full_name: string
          mobile_money_number: string | null
          mobile_money_provider: string | null
          payout_method: string
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          bank_account_number?: string | null
          bank_name?: string | null
          country: string
          created_at?: string
          creator_id: string
          id_document_number: string
          legal_full_name: string
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          payout_method: string
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          bank_account_number?: string | null
          bank_name?: string | null
          country?: string
          created_at?: string
          creator_id?: string
          id_document_number?: string
          legal_full_name?: string
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          payout_method?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_identity_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creator"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_revenue_log: {
```

Note: this is a hand-written match of the migration's schema — if the Supabase CLI is linked and available, prefer regenerating this file with `supabase gen types typescript --linked > lib/supabase/database.types.ts` instead of hand-editing, then verify the generated `creator_payout_identity` block matches the shape above before continuing.

- [ ] **Step 2: Type-check**

Run: `npm run build`

Expected: build succeeds with no TypeScript errors referencing `creator_payout_identity`.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/database.types.ts
git commit -m "feat: add creator_payout_identity types"
```

---

### Task 3: Query/mutation helpers

**Files:**
- Create: `lib/queries/payoutIdentity.ts`

**Interfaces:**
- Consumes: `Database["public"]["Tables"]["creator_payout_identity"]` from Task 2 (via the ambient `SupabaseClient` type, same as `lib/queries/payments.ts`).
- Produces:
  - `type PayoutMethod = "mobile_money" | "bank_transfer"`
  - `type PayoutIdentityStatus = "submitted" | "verified"`
  - `interface PayoutIdentity { creator_id: string; legal_full_name: string; country: string; id_document_number: string; payout_method: PayoutMethod; mobile_money_provider: string | null; mobile_money_number: string | null; bank_name: string | null; bank_account_number: string | null; status: PayoutIdentityStatus; verified_at: string | null; created_at: string; updated_at: string }`
  - `type PayoutIdentityInput = { legal_full_name: string; country: string; id_document_number: string; payout_method: PayoutMethod; mobile_money_provider?: string | null; mobile_money_number?: string | null; bank_name?: string | null; bank_account_number?: string | null }`
  - `getPayoutIdentity(supabase: SupabaseClient, creatorId: string): Promise<PayoutIdentity | null>`
  - `upsertPayoutIdentity(supabase: SupabaseClient, creatorId: string, input: PayoutIdentityInput): Promise<PayoutIdentity>` — always resets `status` to `'submitted'` and `verified_at` to `null` on write (per spec: any edit invalidates prior verification).
  - Consumed by Task 4's UI code.

- [ ] **Step 1: Write the file**

```typescript
import type { SupabaseClient } from "@supabase/supabase-js";

export type PayoutMethod = "mobile_money" | "bank_transfer";
export type PayoutIdentityStatus = "submitted" | "verified";

export interface PayoutIdentity {
  creator_id: string;
  legal_full_name: string;
  country: string;
  id_document_number: string;
  payout_method: PayoutMethod;
  mobile_money_provider: string | null;
  mobile_money_number: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  status: PayoutIdentityStatus;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PayoutIdentityInput = {
  legal_full_name: string;
  country: string;
  id_document_number: string;
  payout_method: PayoutMethod;
  mobile_money_provider?: string | null;
  mobile_money_number?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
};

export async function getPayoutIdentity(
  supabase: SupabaseClient,
  creatorId: string
): Promise<PayoutIdentity | null> {
  const { data, error } = await supabase
    .from("creator_payout_identity")
    .select("*")
    .eq("creator_id", creatorId)
    .maybeSingle();
  if (error) throw error;
  return data as PayoutIdentity | null;
}

export async function upsertPayoutIdentity(
  supabase: SupabaseClient,
  creatorId: string,
  input: PayoutIdentityInput
): Promise<PayoutIdentity> {
  const { data, error } = await supabase
    .from("creator_payout_identity")
    .upsert(
      {
        creator_id: creatorId,
        ...input,
        status: "submitted",
        verified_at: null,
      },
      { onConflict: "creator_id" }
    )
    .select("*")
    .single();
  if (error) throw error;
  return data as PayoutIdentity;
}
```

- [ ] **Step 2: Type-check**

Run: `npm run build`

Expected: build succeeds, no type errors in `lib/queries/payoutIdentity.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/payoutIdentity.ts
git commit -m "feat: add payout identity query helpers"
```

---

### Task 4: Settings page UI

**Files:**
- Modify: `app/[locale]/(creator)/settings/page.tsx`

**Interfaces:**
- Consumes: `getPayoutIdentity`, `upsertPayoutIdentity`, `PayoutIdentityInput`, `PayoutMethod` from `lib/queries/payoutIdentity.ts` (Task 3).

- [ ] **Step 1: Add the import and module-level constants**

In `app/[locale]/(creator)/settings/page.tsx`, after the existing imports (after line 7, `import { useQuery } from "@tanstack/react-query";`), add:

```typescript
import {
  getPayoutIdentity,
  upsertPayoutIdentity,
  type PayoutIdentityInput,
  type PayoutMethod,
} from "@/lib/queries/payoutIdentity";
```

Then, before `export default function SettingsPage()` (before line 9), add:

```typescript
const AFRICAN_COUNTRIES = [
  "Côte d'Ivoire",
  "Sénégal",
  "Mali",
  "Burkina Faso",
  "Cameroun",
  "Bénin",
  "Togo",
  "Guinée",
  "Ghana",
  "Nigeria",
  "Kenya",
];

const MOBILE_MONEY_PROVIDERS = [
  { value: "orange_money", label: "Orange Money" },
  { value: "mtn_momo", label: "MTN Mobile Money" },
  { value: "moov_money", label: "Moov Money" },
  { value: "wave", label: "Wave" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "airtel_money", label: "Airtel Money" },
  { value: "other", label: "Autre" },
];
```

- [ ] **Step 2: Add state, query, and handlers**

Locate the end of `getNextPayoutDate` (currently ends at what was line 115, right before the `// ── Déconnexion` comment). Insert this block right after it:

```typescript
  // ── Coordonnées de paiement Remitly (créateurs hors Stripe) ────────────────────
  const [payoutFormOpen, setPayoutFormOpen] = useState(false);
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutForm, setPayoutForm] = useState<PayoutIdentityInput>({
    legal_full_name: "",
    country: "",
    id_document_number: "",
    payout_method: "mobile_money",
    mobile_money_provider: "",
    mobile_money_number: "",
    bank_name: "",
    bank_account_number: "",
  });

  const { data: payoutIdentity, refetch: refetchPayoutIdentity } = useQuery({
    queryKey: ["payout-identity", creator?.id],
    queryFn: async () => {
      if (!creator?.id) return null;
      return getPayoutIdentity(supabase, creator.id);
    },
    enabled: !!creator?.id,
  });

  function openPayoutForm() {
    if (payoutIdentity) {
      setPayoutForm({
        legal_full_name: payoutIdentity.legal_full_name,
        country: payoutIdentity.country,
        id_document_number: payoutIdentity.id_document_number,
        payout_method: payoutIdentity.payout_method as PayoutMethod,
        mobile_money_provider: payoutIdentity.mobile_money_provider ?? "",
        mobile_money_number: payoutIdentity.mobile_money_number ?? "",
        bank_name: payoutIdentity.bank_name ?? "",
        bank_account_number: payoutIdentity.bank_account_number ?? "",
      });
    }
    setPayoutError(null);
    setPayoutFormOpen(true);
  }

  async function handleSubmitPayoutIdentity(e: React.FormEvent) {
    e.preventDefault();
    if (!creator?.id) return;

    if (
      !payoutForm.legal_full_name.trim() ||
      !payoutForm.country.trim() ||
      !payoutForm.id_document_number.trim()
    ) {
      setPayoutError("Merci de remplir tous les champs obligatoires.");
      return;
    }
    if (payoutForm.payout_method === "mobile_money" && !payoutForm.mobile_money_number?.trim()) {
      setPayoutError("Merci de renseigner ton numéro Mobile Money.");
      return;
    }
    if (
      payoutForm.payout_method === "bank_transfer" &&
      (!payoutForm.bank_name?.trim() || !payoutForm.bank_account_number?.trim())
    ) {
      setPayoutError("Merci de renseigner ta banque et ton numéro de compte.");
      return;
    }

    setPayoutSubmitting(true);
    setPayoutError(null);
    try {
      await upsertPayoutIdentity(supabase, creator.id, payoutForm);
      await refetchPayoutIdentity();
      setPayoutFormOpen(false);
    } catch (err: unknown) {
      setPayoutError(
        err instanceof Error ? err.message : "Impossible d'enregistrer tes coordonnées de paiement."
      );
    } finally {
      setPayoutSubmitting(false);
    }
  }
```

- [ ] **Step 3: Add the JSX subsection**

Inside the existing "Paiements" `<section>`, right before its closing `</section>` (currently: the `<p className="text-xs text-muted-foreground leading-relaxed">Tes revenus sont versés...</p>` line followed by `</section>`), insert this block right after that closing `</p>` and before `</section>`:

```tsx
        <div className="pt-5 border-t border-border space-y-4">
          {!payoutFormOpen && !payoutIdentity && (
            <button
              type="button"
              onClick={openPayoutForm}
              className="text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
            >
              Pas éligible à Stripe ? Renseigne tes coordonnées de paiement (Remitly) →
            </button>
          )}

          {!payoutFormOpen && payoutIdentity && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className={
                    "w-2 h-2 rounded-full shrink-0 " +
                    (payoutIdentity.status === "verified" ? "bg-green-500" : "bg-amber-400")
                  }
                />
                <p className="text-sm font-medium text-foreground">
                  {payoutIdentity.status === "verified" ? "Vérifié ✓" : "En attente de vérification"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {payoutIdentity.payout_method === "mobile_money"
                  ? `${payoutIdentity.mobile_money_provider ?? "Mobile Money"} •••• ${
                      payoutIdentity.mobile_money_number?.slice(-2) ?? "--"
                    }`
                  : `${payoutIdentity.bank_name} •••• ${
                      payoutIdentity.bank_account_number?.slice(-4) ?? "----"
                    }`}
              </p>
              <button
                type="button"
                onClick={openPayoutForm}
                className="text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
              >
                Modifier mes coordonnées
              </button>
            </div>
          )}

          {payoutFormOpen && (
            <form onSubmit={handleSubmitPayoutIdentity} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Coordonnées utilisées pour un versement manuel via Remitly.
              </p>

              {payoutError && (
                <p className="text-sm text-destructive font-medium">{payoutError}</p>
              )}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Nom complet (légal)
                </label>
                <input
                  type="text"
                  value={payoutForm.legal_full_name}
                  onChange={(e) => setPayoutForm({ ...payoutForm, legal_full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Pays</label>
                <select
                  value={payoutForm.country}
                  onChange={(e) => setPayoutForm({ ...payoutForm, country: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="">Sélectionner…</option>
                  {AFRICAN_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  N° pièce d'identité
                </label>
                <input
                  type="text"
                  value={payoutForm.id_document_number}
                  onChange={(e) => setPayoutForm({ ...payoutForm, id_document_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Mode de réception
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={payoutForm.payout_method === "mobile_money"}
                      onChange={() => setPayoutForm({ ...payoutForm, payout_method: "mobile_money" })}
                    />
                    Mobile Money
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={payoutForm.payout_method === "bank_transfer"}
                      onChange={() => setPayoutForm({ ...payoutForm, payout_method: "bank_transfer" })}
                    />
                    Virement bancaire
                  </label>
                </div>
              </div>

              {payoutForm.payout_method === "mobile_money" ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Opérateur
                    </label>
                    <select
                      value={payoutForm.mobile_money_provider ?? ""}
                      onChange={(e) =>
                        setPayoutForm({ ...payoutForm, mobile_money_provider: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="">Sélectionner…</option>
                      {MOBILE_MONEY_PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Numéro
                    </label>
                    <input
                      type="tel"
                      value={payoutForm.mobile_money_number ?? ""}
                      onChange={(e) =>
                        setPayoutForm({ ...payoutForm, mobile_money_number: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Banque
                    </label>
                    <input
                      type="text"
                      value={payoutForm.bank_name ?? ""}
                      onChange={(e) => setPayoutForm({ ...payoutForm, bank_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      N° compte
                    </label>
                    <input
                      type="text"
                      value={payoutForm.bank_account_number ?? ""}
                      onChange={(e) =>
                        setPayoutForm({ ...payoutForm, bank_account_number: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={payoutSubmitting}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {payoutSubmitting ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutFormOpen(false)}
                  className="px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
```

- [ ] **Step 4: Type-check**

Run: `npm run build`

Expected: build succeeds with no TypeScript/JSX errors.

- [ ] **Step 5: Manual verification via the dev server**

Run: `npm run dev`, then in a browser, sign in as a creator and go to `/settings`:
1. Confirm the "Pas éligible à Stripe ?" link appears below the Stripe block.
2. Click it, fill the form with `payout_method = mobile_money`, submit. Confirm it collapses to the "En attente de vérification" summary card showing the masked mobile money number.
3. Click "Modifier mes coordonnées", switch to `Virement bancaire`, fill bank fields, submit. Confirm the summary updates to show the masked bank account.
4. In the Supabase table editor, confirm the `creator_payout_identity` row matches what was submitted and `status = 'submitted'`.
5. Manually set `status = 'verified'` on that row in the Supabase table editor, reload `/settings`, confirm the badge switches to "Vérifié ✓".
6. Try submitting the form with the name field empty — confirm the inline error appears and no request is sent.

- [ ] **Step 6: Commit**

```bash
git add "app/[locale]/(creator)/settings/page.tsx"
git commit -m "feat: add Remitly payout identity form to creator settings"
```

---

## Self-Review

**Spec coverage:** Table schema (Section 3 of spec) → Task 1 + Task 2. UI states, form fields, upsert-resets-status behavior, validation style, i18n exclusion (Section 4) → Task 4. Testing approach (Section 5) → Task 1 Steps 3-5 (SQL) and Task 4 Step 5 (manual). Out-of-scope list (Section 2) → captured in Global Constraints, nothing in the tasks implements Remitly API calls, admin UI, payout-table changes, or file upload.

**Placeholder scan:** No TBD/TODO; all code blocks are complete and copy-pasteable; no "similar to Task N" shortcuts.

**Type consistency:** `PayoutIdentityInput`/`PayoutMethod` defined in Task 3 are imported and used with matching field names in Task 4 (`legal_full_name`, `country`, `id_document_number`, `payout_method`, `mobile_money_provider`, `mobile_money_number`, `bank_name`, `bank_account_number`) — verified consistent across both tasks. `PayoutIdentity` fields returned by `getPayoutIdentity`/`upsertPayoutIdentity` match the column names from the Task 1 migration and the Task 2 type block exactly.
