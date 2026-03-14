-- ============================================================================
-- AKELI V1 — RECIPE SCHEMA ADDITIONS
-- ============================================================================
-- Date       : Mars 2026
-- Auteur     : Curtis — Fondateur Akeli
-- Description: Ajout des tables manquantes du système recette
--
-- CHANGES:
--   1. DROP   recipe.instructions        (remplacé par recipe_step)
--   2. CREATE recipe_step                (étapes structurées riches)
--   3. CREATE recipe_save                (recettes sauvegardées / bookmarks)
--   4. CREATE recipe_impression          (carte recette vue dans le feed)
--   5. CREATE recipe_open                (recette ouverte + durée de session)
--
-- PREREQUISITE: V1_MIGRATION_COMPLETE.sql doit être appliqué
-- ============================================================================


-- ============================================================================
-- 1. DROP recipe.instructions
-- ============================================================================
-- Remplacé par recipe_step (table structurée).
-- Safe : table recipe contient 0 lignes en production au moment de cette migration.
-- Note : recipe_translation.instructions reste intact (bloc texte traduit V1).
--        La traduction par étape est prévue en V2.
-- ============================================================================

ALTER TABLE recipe DROP COLUMN instructions;


-- ============================================================================
-- 2. CREATE recipe_step
-- ============================================================================
-- Étapes de préparation structurées d'une recette.
-- Chaque étape a : numéro d'ordre, titre optionnel, texte, image optionnelle,
-- timer optionnel (en secondes).
-- UNIQUE (recipe_id, step_number) garantit l'ordre sans doublon.
-- ============================================================================

CREATE TABLE recipe_step (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       uuid NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
  step_number     int NOT NULL,
  title           text,
  content         text NOT NULL,
  image_url       text,
  timer_seconds   int,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (recipe_id, step_number)
);

CREATE INDEX idx_recipe_step_recipe ON recipe_step(recipe_id);

ALTER TABLE recipe_step ENABLE ROW LEVEL SECURITY;

-- Lecture publique uniquement pour les recettes publiées
CREATE POLICY "public reads published steps" ON recipe_step
  FOR SELECT USING (
    recipe_id IN (
      SELECT id FROM recipe WHERE is_published = true
    )
  );

-- Le créateur gère ses propres étapes (INSERT, UPDATE, DELETE)
CREATE POLICY "creator manages own steps" ON recipe_step
  USING (
    recipe_id IN (
      SELECT r.id FROM recipe r
      JOIN creator c ON r.creator_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 3. CREATE recipe_save
-- ============================================================================
-- Table de jonction : un utilisateur sauvegarde une recette (bookmark).
-- Composite PK (user_id, recipe_id) garantit l'unicité.
-- Collections / dossiers de sauvegarde = V2.
-- ============================================================================

CREATE TABLE recipe_save (
  user_id    uuid NOT NULL REFERENCES user_profile(id) ON DELETE CASCADE,
  recipe_id  uuid NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
  saved_at   timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);

CREATE INDEX idx_recipe_save_user ON recipe_save(user_id);

ALTER TABLE recipe_save ENABLE ROW LEVEL SECURITY;

-- Un utilisateur ne voit et ne gère que ses propres sauvegardes
CREATE POLICY "owner only" ON recipe_save
  USING (auth.uid() = user_id);


-- ============================================================================
-- 4. CREATE recipe_impression
-- ============================================================================
-- Enregistre chaque fois qu'une carte recette est affichée à l'utilisateur
-- dans le feed, les résultats de recherche, ou le meal planner.
-- Signal passif (l'utilisateur n'a pas nécessairement agi).
--
-- user_id nullable : les vues anonymes depuis le website sont permises.
-- Les inserts anonymes sont gérés server-side via Next.js API route (service key).
-- ON DELETE SET NULL : si l'utilisateur supprime son compte, les impressions
-- restent pour les analytics créateur.
-- ============================================================================

CREATE TABLE recipe_impression (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   uuid NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES user_profile(id) ON DELETE SET NULL,
  source      text NOT NULL CHECK (source IN ('feed', 'search', 'meal_planner')),
  seen_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_recipe_impression_recipe ON recipe_impression(recipe_id);
CREATE INDEX idx_recipe_impression_user   ON recipe_impression(user_id);

ALTER TABLE recipe_impression ENABLE ROW LEVEL SECURITY;

-- Inserts authentifiés directs (mobile)
-- Inserts anonymes gérés via service key côté serveur (Next.js API route)
CREATE POLICY "authenticated insert" ON recipe_impression
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Le créateur lit les impressions de ses propres recettes
CREATE POLICY "creator reads own" ON recipe_impression
  FOR SELECT USING (
    recipe_id IN (
      SELECT r.id FROM recipe r
      JOIN creator c ON r.creator_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );


-- ============================================================================
-- 5. CREATE recipe_open
-- ============================================================================
-- Enregistre chaque ouverture de la vue détail d'une recette.
-- Signal intentionnel (l'utilisateur a cliqué / tapé sur la recette).
--
-- Session : opened_at est défini à l'insertion.
-- closed_at et session_duration_seconds sont mis à jour en PATCH quand
-- l'utilisateur quitte la page (calculé côté client Flutter / Next.js).
--
-- user_id nullable : idem recipe_impression (vues anonymes website).
-- ON DELETE SET NULL : les opens restent pour les analytics créateur.
-- ============================================================================

CREATE TABLE recipe_open (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id                uuid NOT NULL REFERENCES recipe(id) ON DELETE CASCADE,
  user_id                  uuid REFERENCES user_profile(id) ON DELETE SET NULL,
  source                   text NOT NULL CHECK (source IN ('feed', 'search', 'meal_planner')),
  opened_at                timestamptz DEFAULT now(),
  closed_at                timestamptz,
  session_duration_seconds int
);

CREATE INDEX idx_recipe_open_recipe ON recipe_open(recipe_id);
CREATE INDEX idx_recipe_open_user   ON recipe_open(user_id);

ALTER TABLE recipe_open ENABLE ROW LEVEL SECURITY;

-- Inserts authentifiés (mobile) et anonymes (via service key Next.js)
CREATE POLICY "authenticated insert" ON recipe_open
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- L'utilisateur peut mettre à jour sa propre session (closed_at + duration)
CREATE POLICY "owner update" ON recipe_open
  FOR UPDATE USING (auth.uid() = user_id);

-- Le créateur lit les opens de ses propres recettes
CREATE POLICY "creator reads own" ON recipe_open
  FOR SELECT USING (
    recipe_id IN (
      SELECT r.id FROM recipe r
      JOIN creator c ON r.creator_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );


-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Après application, vérifier avec :
--
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN (
--     'recipe_step', 'recipe_save', 'recipe_impression', 'recipe_open'
--   );
-- Attendu : 4 lignes
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'recipe' AND column_name = 'instructions';
-- Attendu : 0 lignes (colonne supprimée)
-- ============================================================================
