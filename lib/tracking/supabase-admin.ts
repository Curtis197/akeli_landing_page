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
