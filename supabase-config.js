// ========================================
// SUPABASE CONFIGURATION
// ========================================
// INSTRUCTIONS: Remplacez les valeurs ci-dessous par vos propres identifiants Supabase
// Vous pouvez les trouver dans: Supabase Dashboard > Project Settings > API

const SUPABASE_CONFIG = {
    // Votre URL Supabase (ex: https://xxxxx.supabase.co)
    url: 'https://jfbfymiyqlyciapfloug.supabase.co',

    // Votre clé publique anon (safe pour le frontend)
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmYmZ5bWl5cWx5Y2lhcGZsb3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1MzcwMDIsImV4cCI6MjA2MDExMzAwMn0.zm4ioJc07IAec0e5-0PsWyAXDAp1U42NA1kReoRdhbU'
};

// ========================================
// TABLE REQUISE DANS SUPABASE
// ========================================
// Créez une table 'waitlist' dans Supabase avec la structure suivante:
//
// CREATE TABLE waitlist (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   email text NOT NULL UNIQUE,
//   user_type text NOT NULL CHECK (user_type IN ('user', 'creator')),
//   created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
// );
//
// Puis activez Row Level Security (RLS) avec cette politique:
// - Policy name: "Enable insert for all users"
// - Policy: INSERT with true (permettre à tous d'insérer)
