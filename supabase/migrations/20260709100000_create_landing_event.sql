-- Migration: Create landing_event table (landing page funnel analytics)
--            + add session_id to onboarding_lead to join leads to their funnel path
-- Created at: 2026-07-09

CREATE TABLE IF NOT EXISTS public.landing_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  event text NOT NULL,
  step integer,
  locale text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS landing_event_session_id_idx ON public.landing_event (session_id);
CREATE INDEX IF NOT EXISTS landing_event_event_idx ON public.landing_event (event, created_at);

-- Turn on Row Level Security (RLS)
ALTER TABLE public.landing_event ENABLE ROW LEVEL SECURITY;

-- Allow only service_role (Next.js backend client) to read and write events
CREATE POLICY "service_role_access" ON public.landing_event
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Join leads to their funnel session
ALTER TABLE public.onboarding_lead ADD COLUMN IF NOT EXISTS session_id text;
