-- Migration: Create onboarding_lead table
-- Created at: 2026-07-08

CREATE TABLE IF NOT EXISTS public.onboarding_lead (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  region text REFERENCES public.food_region(code),
  calorie_goal integer NOT NULL,
  protein_g numeric NOT NULL,
  carb_g numeric NOT NULL,
  fat_g numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Turn on Row Level Security (RLS)
ALTER TABLE public.onboarding_lead ENABLE ROW LEVEL SECURITY;

-- Allow only service_role (Next.js backend client) to read and write leads
CREATE POLICY "service_role_access" ON public.onboarding_lead
  FOR ALL TO service_role USING (true) WITH CHECK (true);
