# Creator Payout Identity (Remitly manual payouts) — Design Spec

**Date:** 2026-07-11
**Author:** Curtis — Founder Akeli
**Status:** Validated — ready for implementation planning

---

## 1. Context & problem

Akeli's only payout mechanism today is Stripe Connect Express, wired up in `settings/page.tsx`'s "Paiements" section and the `create-connect-account` edge function. That integration is currently broken/unmigrated (`creator.stripe_account_id` and the `creator_stripe_account` table are referenced in code but don't exist in any migration), and even once fixed it hardcodes `country: 'FR'` — Stripe Connect Express doesn't cover most African countries anyway.

Akeli is opening to African creators directly (not just diaspora), using Remitly's manual send-money flow as the payout channel for creators Stripe can't serve. Remitly has no API integration here — Curtis sends transfers by hand. This feature only collects the recipient info needed to do that: a bank/mobile-money identity form for creators, backed by a new Supabase table.

---

## 2. Scope

**In scope:**
- New table `creator_payout_identity` (one row per creator, RLS-protected).
- A new subsection in the existing "Paiements" section of `/settings`, self-toggled by the creator ("not eligible for Stripe? fill this in instead") alongside the existing Stripe block.
- Client-side form: legal name, country, ID document number, payout method (mobile money or bank transfer) with method-specific fields.

**Explicitly out of scope:**
- No Remitly API integration — Curtis still sends the transfer by hand in Remitly's own UI.
- No admin verification UI — `status` is flipped to `'verified'` directly in the Supabase table editor.
- No changes to the existing `payout` / `creator_balance` tables — manual payouts are logged the same way any manual payout already would be; that mechanism is unchanged by this feature.
- No ID document file upload — only the ID number as text, no Storage bucket.
- No i18n — this settings page has no `useTranslations` hookup today (hardcoded French throughout); this section matches that existing local convention rather than introducing translation keys.

---

## 3. Database schema

Mirrors the existing `creator_balance` table shape: `creator_id` as the primary key (one row per creator), RLS keyed off `creator.user_id = auth.uid()` (the same pattern used by `creator_balance`'s "creator reads own" policy).

```sql
CREATE TABLE public.creator_payout_identity (
  creator_id             uuid PRIMARY KEY REFERENCES public.creator(id) ON DELETE CASCADE,
  legal_full_name         text NOT NULL,
  country                  text NOT NULL,
  id_document_number       text NOT NULL,
  payout_method            text NOT NULL CHECK (payout_method IN ('mobile_money', 'bank_transfer')),
  mobile_money_provider    text,   -- 'orange_money' | 'mtn_momo' | 'moov_money' | 'wave' | 'mpesa' | 'airtel_money' | 'other'
  mobile_money_number      text,
  bank_name                text,
  bank_account_number      text,
  status                   text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'verified')),
  verified_at              timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payout_method_fields_chk CHECK (
    (payout_method = 'mobile_money' AND mobile_money_number IS NOT NULL)
    OR (payout_method = 'bank_transfer' AND bank_name IS NOT NULL AND bank_account_number IS NOT NULL)
  )
);

ALTER TABLE public.creator_payout_identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator reads own" ON public.creator_payout_identity
  FOR SELECT USING (creator_id IN (SELECT id FROM creator WHERE user_id = auth.uid()));

CREATE POLICY "creator inserts own" ON public.creator_payout_identity
  FOR INSERT WITH CHECK (creator_id IN (SELECT id FROM creator WHERE user_id = auth.uid()));

CREATE POLICY "creator updates own" ON public.creator_payout_identity
  FOR UPDATE USING (creator_id IN (SELECT id FROM creator WHERE user_id = auth.uid()));

CREATE TRIGGER trg_updated_at BEFORE UPDATE ON public.creator_payout_identity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

Notes:
- `country` and `mobile_money_provider` are plain `text` (UI dropdown values), not DB enums — adding a new country/provider later needs no migration.
- The `CHECK` constraint is a backstop for data integrity if client validation is ever bypassed.
- No `DELETE` policy — resubmitting the form overwrites (`upsert`) rather than deleting.

---

## 4. UI / form flow

Location: new subsection inside the existing "Paiements" `<section>` in `app/[locale]/(creator)/settings/page.tsx`, below the existing Stripe block. Driven by a `useQuery` fetching the creator's `creator_payout_identity` row, same pattern as the existing `stripeAccount` query in that file.

**States:**
1. **No row yet** — a quiet link: "Pas éligible à Stripe ? Renseigne tes coordonnées de paiement (Remitly) →". Clicking reveals the form inline.
2. **Row exists, `status = 'submitted'`** — collapsed summary card (masked payout info, e.g. "Orange Money •••• 00 00") with an "En attente de vérification" badge and a "Modifier" link that reopens the form pre-filled.
3. **Row exists, `status = 'verified'`** — same summary card with a "Vérifié ✓" badge instead.

**Form fields, in order:**
- Nom complet (légal) — text input
- Pays — select (Côte d'Ivoire, Sénégal, Mali, Burkina Faso, Cameroun, Bénin, Togo, Guinée, Ghana, Nigeria, Kenya — extendable)
- N° pièce d'identité — text input
- Mode de réception — radio: Mobile Money / Virement bancaire, toggling the fields below
  - Mobile Money → Opérateur (select: Orange Money, MTN Mobile Money, Moov Money, Wave, M-Pesa, Airtel Money, Autre) + Numéro (tel input)
  - Virement bancaire → Banque (text) + N° compte (text)

**Behavior:**
- Submit does a Supabase `upsert` on `creator_payout_identity` keyed by `creator_id`, always resetting `status` to `'submitted'` and `verified_at` to `null` — any edit invalidates prior verification.
- Validation is plain JS (required-field checks per method), inline error text — matches the password-change section's existing style in this file, not React Hook Form/Zod (this file doesn't use that convention despite it being the project-wide default).
- Errors from the upsert are caught and shown inline (mirrors the existing `stripeError` handling in the same file).

---

## 5. Testing

No existing test suite covers comparable code (`lib/queries/payments.ts` has no tests, `vitest` is configured but unused at the app-code level) — this feature follows that same practice rather than introducing new test infrastructure. Verification is manual:
- Submit the form, confirm the row lands correctly in `creator_payout_identity`.
- Confirm RLS: a second creator account cannot read or write another creator's row.
- Confirm the `CHECK` constraint rejects a row missing the method-specific required fields.
