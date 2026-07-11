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
