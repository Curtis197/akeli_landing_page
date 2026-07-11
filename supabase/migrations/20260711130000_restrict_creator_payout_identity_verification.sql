-- Migration: Restrict creator_payout_identity INSERT/UPDATE so creators cannot self-verify
-- Created at: 2026-07-11

DROP POLICY IF EXISTS "creator inserts own" ON public.creator_payout_identity;
DROP POLICY IF EXISTS "creator updates own" ON public.creator_payout_identity;

CREATE POLICY "creator inserts own" ON public.creator_payout_identity
  FOR INSERT WITH CHECK (
    creator_id IN (SELECT id FROM public.creator WHERE user_id = auth.uid())
    AND status = 'submitted'
    AND verified_at IS NULL
  );

CREATE POLICY "creator updates own" ON public.creator_payout_identity
  FOR UPDATE USING (creator_id IN (SELECT id FROM public.creator WHERE user_id = auth.uid()))
  WITH CHECK (
    creator_id IN (SELECT id FROM public.creator WHERE user_id = auth.uid())
    AND status = 'submitted'
    AND verified_at IS NULL
  );
