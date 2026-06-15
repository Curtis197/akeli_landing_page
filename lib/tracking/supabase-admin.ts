import { createClient } from '@supabase/supabase-js';

// ⚠️ Ce fichier ne doit jamais être importé depuis un composant client.
// Il est exclusivement utilisé dans les API Routes (server-side).
// Le client est créé de façon lazy pour éviter les erreurs de build
// quand SUPABASE_SERVICE_ROLE_KEY n'est pas disponible à la compilation.

let _client: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _client;
}
