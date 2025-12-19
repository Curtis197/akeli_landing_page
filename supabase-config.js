// ========================================
// SUPABASE CONFIGURATION
// ========================================
// INSTRUCTIONS: Remplacez les valeurs ci-dessous par vos propres identifiants Supabase
// Vous pouvez les trouver dans: Supabase Dashboard > Project Settings > API

const SUPABASE_CONFIG = {
    // Votre URL Supabase (ex: https://xxxxx.supabase.co)
    url: 'YOUR_SUPABASE_URL',

    // Votre clé publique anon (safe pour le frontend)
    anonKey: 'YOUR_SUPABASE_ANON_KEY'
};

// ========================================
// TABLE REQUISE DANS SUPABASE
// ========================================
// Créez une table 'waitlist' dans Supabase avec la structure suivante:
//
// CREATE TABLE waitlist (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   email text NOT NULL UNIQUE,
//   created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
// );
//
// Puis activez Row Level Security (RLS) avec cette politique:
// - Policy name: "Enable insert for all users"
// - Policy: INSERT with true (permettre à tous d'insérer)
