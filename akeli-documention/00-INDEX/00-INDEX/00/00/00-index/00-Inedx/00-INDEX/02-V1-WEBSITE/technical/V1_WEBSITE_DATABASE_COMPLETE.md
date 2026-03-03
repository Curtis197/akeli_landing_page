# Akeli V1 — Database Complémentaire Website

> Ce document complète `V1_DATABASE_SCHEMA.md` avec les éléments spécifiques au website Next.js.
> Il ne reduplique pas le schéma existant — il liste uniquement les ajouts et modifications nécessaires.
> À appliquer sur la même base Supabase que l'application Flutter.

**Statut** : Référence V1 Website — Prêt pour Claude Code  
**Date** : Mars 2026  
**Auteur** : Curtis — Fondateur Akeli  
**Dépendance** : `V1_DATABASE_SCHEMA.md` doit être appliqué en premier

---

## Vue d'ensemble des modifications

| Type | Élément | Raison |
|------|---------|--------|
| ✅ Nouvelle table | `specialty` | Spécialités créateur multilingues |
| ✅ Nouvelle table | `recipe_translation` | Traductions recettes par langue |
| ✅ Nouvelle table | `ingredient_submission` | Soumission ingrédients par créateurs |
| 🔧 Modification | `ingredient` | Ajout colonne `status` (validation workflow) |
| 🔧 Modification | `creator` | Ajout colonnes réseaux sociaux + username |
| 🔧 Modification | `recipe` | Ajout colonne `slug` (SEO) + `draft_data` (auto-save) |
| 🔧 Modification | `conversation` | Ajout `type` (private/group/support) pour chat créateurs |
| ✅ Nouvelle vue | `creator_public_profile` | Profil public créateur (surface Découverte) |
| ✅ Nouvelle vue | `creator_dashboard_stats` | Stats dashboard (progressif) |
| ✅ Nouvelle fonction SQL | `get_creator_by_username` | Lookup profil public |
| ✅ Nouvelle fonction SQL | `calculate_recipe_macros` | Calcul macros depuis ingrédients |

---

## 1. Nouvelle table — `specialty`

Spécialités culinaires des créateurs. Référentiel géré par Akeli.

```sql
CREATE TABLE specialty (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text UNIQUE NOT NULL,   -- ex: 'west_african', 'maghrebi', 'caribbean'
  name_fr     text NOT NULL,
  name_en     text NOT NULL,
  name_es     text,
  name_pt     text,
  region      text REFERENCES food_region(code),
  created_at  timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE specialty ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads" ON specialty FOR SELECT USING (true);

-- Seed data initial
INSERT INTO specialty (code, name_fr, name_en, region) VALUES
  ('west_african',     'Afrique de l''Ouest',    'West African',     'west_africa'),
  ('east_african',     'Afrique de l''Est',      'East African',     'east_africa'),
  ('central_african',  'Afrique Centrale',       'Central African',  'central_africa'),
  ('north_african',    'Afrique du Nord',         'North African',    'north_africa'),
  ('southern_african', 'Afrique Australe',        'Southern African', 'southern_africa'),
  ('caribbean',        'Cuisine des Caraïbes',    'Caribbean',        'caribbean'),
  ('creole',           'Cuisine Créole',          'Creole',           NULL),
  ('diasporic_fusion', 'Fusion Diaspora',         'Diasporic Fusion', NULL);
```

---

## 2. Nouvelle table — `recipe_translation`

Traductions des recettes générées automatiquement par Gemini ou saisies manuellement par le créateur.
Une ligne par recette par langue.

```sql
CREATE TABLE recipe_translation (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       uuid REFERENCES recipe(id) ON DELETE CASCADE,
  locale          text NOT NULL,    -- 'fr' | 'en' | 'es' | 'pt' | 'wo' | 'bm' | 'ln' | 'ar'
  title           text NOT NULL,
  description     text,
  instructions    text NOT NULL,
  is_auto         boolean DEFAULT true,   -- true = généré par Gemini, false = saisi manuellement
  generated_at    timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (recipe_id, locale)
);

CREATE INDEX idx_recipe_translation_recipe ON recipe_translation(recipe_id);
CREATE INDEX idx_recipe_translation_locale ON recipe_translation(locale);

-- RLS
ALTER TABLE recipe_translation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads" ON recipe_translation FOR SELECT USING (true);
CREATE POLICY "creator manages own" ON recipe_translation
  FOR ALL USING (
    recipe_id IN (
      SELECT r.id FROM recipe r
      JOIN creator c ON r.creator_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );
```

**Flux de traduction :**
```
Créateur publie recette (source FR ou EN)
→ Edge Function translation-service appelée
→ Gemini traduit vers toutes les langues supportées
→ INSERT dans recipe_translation pour chaque locale (is_auto = true)
→ Créateur peut éditer manuellement (is_auto = false)
```

---

## 3. Nouvelle table — `ingredient_submission`

Workflow de soumission d'ingrédients par les créateurs.
Akeli valide depuis le dashboard Supabase (pas d'interface admin V1).

```sql
CREATE TABLE ingredient_submission (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by    uuid REFERENCES user_profile(id) ON DELETE SET NULL,
  name            text NOT NULL,
  name_fr         text,
  name_en         text,
  category_hint   text,              -- suggestion de catégorie par le créateur
  notes           text,              -- contexte (ex: "ingrédient typique cuisine sénégalaise")
  status          text CHECK (status IN ('pending', 'validated', 'rejected', 'duplicate'))
                  DEFAULT 'pending',
  ingredient_id   uuid REFERENCES ingredient(id) ON DELETE SET NULL,
  -- ingredient_id renseigné si validated (lien vers l'entrée créée dans ingredient)
  -- ou si duplicate (lien vers l'ingrédient existant)
  reviewed_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_ingredient_submission_status ON ingredient_submission(status);
CREATE INDEX idx_ingredient_submission_user ON ingredient_submission(submitted_by);

-- RLS
ALTER TABLE ingredient_submission ENABLE ROW LEVEL SECURITY;
CREATE POLICY "submitter reads own" ON ingredient_submission
  FOR SELECT USING (auth.uid() = submitted_by);
CREATE POLICY "creator submits" ON ingredient_submission
  FOR INSERT WITH CHECK (
    auth.uid() = submitted_by AND
    auth.uid() IN (
      SELECT user_id FROM creator
    )
  );
```

---

## 4. Modification — table `ingredient`

Ajout d'un statut pour distinguer les ingrédients validés par Akeli des ingrédients en attente.

```sql
-- Ajouter la colonne status
ALTER TABLE ingredient
  ADD COLUMN status text
    CHECK (status IN ('pending', 'validated'))
    DEFAULT 'validated';

-- Les ingrédients existants sont considérés validés
-- Un ingrédient pending n'est visible que par son créateur

-- Mettre à jour la RLS : public ne voit que les validés
DROP POLICY IF EXISTS "public reads" ON ingredient;

CREATE POLICY "public reads validated" ON ingredient
  FOR SELECT USING (status = 'validated');

CREATE POLICY "creator reads own pending" ON ingredient
  FOR SELECT USING (
    status = 'pending' AND
    id IN (
      SELECT ingredient_id FROM ingredient_submission
      WHERE submitted_by = auth.uid()
    )
  );
```

**Workflow ingrédient :**
```
Créateur cherche ingrédient dans le formulaire
→ Ingrédient trouvé (status = validated) → l'utilise directement
→ Ingrédient pas trouvé
  → Crée une ingredient_submission (status = pending)
  → Un placeholder ingredient est créé (status = pending)
  → Le créateur peut l'utiliser dans ses propres recettes
  → Akeli valide via Supabase dashboard
    → status = validated (visible par tous)
    → Akeli ajoute macros pour 100g
    → Akeli ajoute traductions nom (name_fr, name_en, etc.)
  → OU Akeli rejette / marque comme duplicate
    → ingredient_submission.status = rejected / duplicate
    → ingredient_submission.ingredient_id = ingrédient existant
```

---

## 5. Modification — table `creator`

Ajout des colonnes nécessaires pour le profil public et le website.

```sql
-- Réseaux sociaux
ALTER TABLE creator
  ADD COLUMN username        text UNIQUE,
  ADD COLUMN instagram_handle text,
  ADD COLUMN tiktok_handle   text,
  ADD COLUMN youtube_handle  text,
  ADD COLUMN website_url     text,
  ADD COLUMN specialty_codes text[],   -- codes référençant specialty.code
  ADD COLUMN language_codes  text[];   -- langues parlées ('fr', 'en', 'wo', etc.)

-- Index pour lookup par username (critique SEO)
CREATE UNIQUE INDEX idx_creator_username ON creator(username)
  WHERE username IS NOT NULL;

-- Contrainte : username alphanumérique + tirets uniquement
ALTER TABLE creator
  ADD CONSTRAINT creator_username_format
  CHECK (username ~ '^[a-z0-9_-]{3,30}$');
```

**Note :** Le `username` du créateur est distinct du `username` dans `user_profile`.
La colonne `username` dans `user_profile` est réservée à l'identité globale (non utilisée V1).
Le `username` dans `creator` est l'identifiant public du créateur sur le website (`/creator/[username]`).

---

## 6. Modification — table `recipe`

Ajout du `slug` pour les URLs SEO et de `draft_data` pour l'auto-save du wizard.

```sql
-- Slug pour URLs SEO (/recipe/[slug])
ALTER TABLE recipe
  ADD COLUMN slug       text UNIQUE,
  ADD COLUMN draft_data jsonb;    -- données wizard en cours (auto-save)

-- Index slug
CREATE UNIQUE INDEX idx_recipe_slug ON recipe(slug)
  WHERE slug IS NOT NULL;

-- Trigger : génération automatique du slug à la publication
CREATE OR REPLACE FUNCTION generate_recipe_slug()
RETURNS TRIGGER AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter int := 0;
BEGIN
  -- Générer slug depuis le titre (translittération basique)
  base_slug := lower(
    regexp_replace(
      regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
  final_slug := base_slug;

  -- Vérifier unicité, ajouter suffixe si nécessaire
  WHILE EXISTS (SELECT 1 FROM recipe WHERE slug = final_slug AND id != NEW.id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;

  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recipe_slug
  BEFORE INSERT OR UPDATE OF title ON recipe
  FOR EACH ROW
  WHEN (NEW.is_published = true AND NEW.slug IS NULL)
  EXECUTE FUNCTION generate_recipe_slug();
```

---

## 7. Modification — table `conversation`

La table `conversation` existante gère les conversations privées utilisateur↔utilisateur (app mobile).
Pour le chat créateurs du website, on ajoute un `type` et un `group_type`.

```sql
-- Ajouter type de conversation
ALTER TABLE conversation
  ADD COLUMN type text
    CHECK (type IN ('private', 'creator_group', 'support'))
    DEFAULT 'private',
  ADD COLUMN name text,           -- Nom du groupe (pour creator_group)
  ADD COLUMN description text,    -- Description du groupe
  ADD COLUMN created_by uuid REFERENCES user_profile(id) ON DELETE SET NULL,
  ADD COLUMN is_support_open boolean DEFAULT true;  -- Pour les conversations support

-- Index
CREATE INDEX idx_conversation_type ON conversation(type);

-- Mise à jour RLS conversation pour les créateurs
-- Les créateurs voient les conversations de type creator_group (publics)
CREATE POLICY "creator reads public groups" ON conversation
  FOR SELECT USING (
    type = 'creator_group' AND
    created_by IN (SELECT user_id FROM creator)
  );

-- Support : le créateur voit sa propre conversation support
CREATE POLICY "creator reads own support" ON conversation
  FOR SELECT USING (
    type = 'support' AND
    id IN (
      SELECT conversation_id FROM conversation_participant
      WHERE user_id = auth.uid()
    )
  );
```

**Types de conversations dans le website :**

| Type | Description | Créé par |
|------|-------------|----------|
| `private` | Chat 1-to-1 entre créateurs | Créateur (depuis website) |
| `creator_group` | Groupe thématique créateurs | Créateur (depuis website) |
| `support` | Conversation créateur ↔ Akeli | Système (à l'inscription créateur) |

---

## 8. Vue — `creator_public_profile`

Vue dénormalisée pour le profil public créateur. Utilisée par la surface Découverte.

```sql
CREATE OR REPLACE VIEW creator_public_profile AS
SELECT
  c.id,
  c.username,
  c.display_name,
  c.bio,
  c.avatar_url,
  c.cover_url,
  c.specialty_codes,
  c.language_codes,
  c.instagram_handle,
  c.tiktok_handle,
  c.youtube_handle,
  c.website_url,
  c.recipe_count,
  c.fan_count,
  c.is_fan_eligible,
  c.is_verified,
  c.created_at,
  -- Recettes publiées (aperçu uniquement — pas d'ingrédients ni d'étapes)
  (
    SELECT json_agg(
      json_build_object(
        'id', r.id,
        'slug', r.slug,
        'title', r.title,
        'cover_image_url', r.cover_image_url,
        'prep_time_min', r.prep_time_min,
        'cook_time_min', r.cook_time_min,
        'difficulty', r.difficulty,
        'calories', rm.calories
      )
      ORDER BY r.created_at DESC
    )
    FROM recipe r
    LEFT JOIN recipe_macro rm ON rm.recipe_id = r.id
    WHERE r.creator_id = c.id AND r.is_published = true
    LIMIT 12
  ) AS recipes_preview
FROM creator c
WHERE c.username IS NOT NULL;

-- Pas de RLS sur une vue — les politiques des tables sous-jacentes s'appliquent
-- creator est public reads → vue accessible publiquement
```

---

## 9. Vue — `creator_dashboard_stats`

Stats pour le dashboard créateur. Niveau de détail adapté au nombre de recettes publiées.

```sql
CREATE OR REPLACE VIEW creator_dashboard_stats AS
SELECT
  c.id AS creator_id,
  c.recipe_count,
  c.fan_count,
  c.is_fan_eligible,

  -- Balance et revenus
  cb.balance,
  cb.total_earned,
  cb.total_paid_out,

  -- Revenus mois en cours
  COALESCE(
    (SELECT total_revenue FROM creator_revenue_log
     WHERE creator_id = c.id
     AND month_key = to_char(now(), 'YYYY-MM')),
    0
  ) AS revenue_current_month,

  -- Revenus mois précédent
  COALESCE(
    (SELECT total_revenue FROM creator_revenue_log
     WHERE creator_id = c.id
     AND month_key = to_char(now() - interval '1 month', 'YYYY-MM')),
    0
  ) AS revenue_last_month,

  -- Consommations mois en cours
  COALESCE(
    (SELECT consumption_count FROM creator_revenue_log
     WHERE creator_id = c.id
     AND month_key = to_char(now(), 'YYYY-MM')),
    0
  ) AS consumptions_current_month,

  -- Top 3 recettes (par consommations totales)
  (
    SELECT json_agg(top_recipes)
    FROM (
      SELECT
        r.id,
        r.title,
        r.cover_image_url,
        r.slug,
        COUNT(mc.id) AS consumption_count
      FROM recipe r
      LEFT JOIN meal_consumption mc ON mc.recipe_id = r.id
      WHERE r.creator_id = c.id AND r.is_published = true
      GROUP BY r.id, r.title, r.cover_image_url, r.slug
      ORDER BY consumption_count DESC
      LIMIT 3
    ) top_recipes
  ) AS top_recipes,

  -- Historique mensuel (6 derniers mois) — pour graphiques (≥ 10 recettes)
  (
    SELECT json_agg(monthly ORDER BY month_key ASC)
    FROM (
      SELECT month_key, total_revenue, consumption_count, fan_count
      FROM creator_revenue_log
      WHERE creator_id = c.id
      ORDER BY month_key DESC
      LIMIT 6
    ) monthly
  ) AS monthly_history

FROM creator c
LEFT JOIN creator_balance cb ON cb.creator_id = c.id;

-- RLS via les tables sous-jacentes (creator = public reads, creator_balance = creator reads own)
-- Filtrage côté application : WHERE creator_id = auth.uid() depuis le creator record
```

---

## 10. Fonction SQL — `get_creator_by_username`

Lookup du profil créateur par username pour la page `/creator/[username]`.

```sql
CREATE OR REPLACE FUNCTION get_creator_by_username(p_username text)
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT row_to_json(creator_public_profile)
  FROM creator_public_profile
  WHERE username = p_username
  LIMIT 1;
$$;
```

**Usage depuis Next.js :**
```typescript
const { data } = await supabase
  .rpc('get_creator_by_username', { p_username: username });
```

---

## 11. Fonction SQL — `calculate_recipe_macros`

Calcul automatique des macros d'une recette depuis ses ingrédients validés.
Appelée après ajout/modification d'un ingrédient dans le wizard.

```sql
CREATE OR REPLACE FUNCTION calculate_recipe_macros(p_recipe_id uuid)
RETURNS json
LANGUAGE plpgsql
AS $$
DECLARE
  v_servings int;
  v_result json;
BEGIN
  SELECT servings INTO v_servings FROM recipe WHERE id = p_recipe_id;
  IF v_servings IS NULL OR v_servings = 0 THEN
    v_servings := 1;
  END IF;

  SELECT json_build_object(
    'calories',    ROUND((SUM((ri.quantity / 100.0) * i.calories_per_100g)  / v_servings)::numeric, 1),
    'protein_g',   ROUND((SUM((ri.quantity / 100.0) * i.protein_per_100g)  / v_servings)::numeric, 1),
    'carbs_g',     ROUND((SUM((ri.quantity / 100.0) * i.carbs_per_100g)    / v_servings)::numeric, 1),
    'fat_g',       ROUND((SUM((ri.quantity / 100.0) * i.fat_per_100g)      / v_servings)::numeric, 1),
    'ingredients_with_macros', COUNT(CASE WHEN i.calories_per_100g IS NOT NULL THEN 1 END),
    'ingredients_total', COUNT(ri.id),
    'macros_complete', BOOL_AND(i.calories_per_100g IS NOT NULL)
  )
  INTO v_result
  FROM recipe_ingredient ri
  JOIN ingredient i ON i.id = ri.ingredient_id
  WHERE ri.recipe_id = p_recipe_id
    AND i.status = 'validated';

  RETURN v_result;
END;
$$;
```

**Réponse :**
```json
{
  "calories": 423.5,
  "protein_g": 28.2,
  "carbs_g": 51.0,
  "fat_g": 12.3,
  "ingredients_with_macros": 5,
  "ingredients_total": 6,
  "macros_complete": false
}
```

Si `macros_complete = false`, le wizard affiche un message :
> "1 ingrédient est en attente de validation. Les macros seront affinées une fois validé par Akeli."

---

## 12. Trigger — Création conversation support à l'inscription créateur

Chaque nouveau créateur reçoit automatiquement une conversation support avec l'équipe Akeli.

```sql
CREATE OR REPLACE FUNCTION create_creator_support_conversation()
RETURNS TRIGGER AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- Créer la conversation support
  INSERT INTO conversation (type, name, created_by, is_support_open)
  VALUES ('support', 'Support Akeli', NEW.user_id, true)
  RETURNING id INTO v_conversation_id;

  -- Ajouter le créateur comme participant
  INSERT INTO conversation_participant (conversation_id, user_id)
  VALUES (v_conversation_id, NEW.user_id);

  -- Note : l'équipe Akeli est ajoutée manuellement ou via un user système

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_creator_support_conversation
  AFTER INSERT ON creator
  FOR EACH ROW
  EXECUTE FUNCTION create_creator_support_conversation();
```

---

## 13. Storage — Buckets Supabase

Configuration des buckets Storage pour le website.

```sql
-- Bucket recettes (déjà existant probablement — vérifier)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-images',
  'recipe-images',
  true,                    -- Public : images accessibles sans auth
  5242880,                 -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Bucket avatars (déjà existant probablement — vérifier)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,                 -- 2 MB
  ARRAY['image/jpeg', 'image/png']
) ON CONFLICT (id) DO NOTHING;

-- Policies Storage
-- Recettes : lecture publique, écriture créateur
CREATE POLICY "public reads recipe images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images');

CREATE POLICY "creator uploads recipe images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recipe-images' AND
    auth.uid() IN (SELECT user_id FROM creator)
  );

CREATE POLICY "creator manages own recipe images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recipe-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Avatars : lecture publique, écriture propriétaire
CREATE POLICY "public reads avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "creator uploads own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );
```

---

## 14. Ordre d'exécution

Pour appliquer ce document après `V1_DATABASE_SCHEMA.md` :

```
1. V1_DATABASE_SCHEMA.md                   → Base complète 45 tables
2. ALTER TABLE ingredient (status)         → Section 4 de ce document
3. ALTER TABLE creator (username, socials) → Section 5
4. ALTER TABLE recipe (slug, draft_data)   → Section 6
5. ALTER TABLE conversation (type)         → Section 7
6. CREATE TABLE specialty                  → Section 1
7. CREATE TABLE recipe_translation         → Section 2
8. CREATE TABLE ingredient_submission      → Section 3
9. Triggers (slug, support conversation)   → Sections 6 et 12
10. Vues (creator_public_profile, creator_dashboard_stats) → Sections 8 et 9
11. Fonctions SQL                          → Sections 10 et 11
12. Storage buckets + policies             → Section 13
```

---

## Récapitulatif tables finales

Après application de ce document, les tables pertinentes pour le website sont :

| Table | Rôle Website |
|-------|-------------|
| `user_profile` | Auth créateur (is_creator flag) |
| `creator` | Profil créateur (username, socials, specialties) |
| `specialty` | ⭐ Nouveau — référentiel spécialités |
| `recipe` | Catalogue recettes (slug, draft_data) |
| `recipe_translation` | ⭐ Nouveau — traductions Gemini |
| `recipe_ingredient` | Ingrédients par recette |
| `recipe_macro` | Macros calculées par portion |
| `recipe_image` | Galerie images recette |
| `recipe_tag` | Tags recettes |
| `ingredient` | Référentiel ingrédients (status validé/pending) |
| `ingredient_submission` | ⭐ Nouveau — soumissions créateurs |
| `measurement_unit` | Unités de mesure |
| `food_region` | Régions culinaires |
| `tag` | Tags |
| `conversation` | Chat (private, creator_group, support) |
| `conversation_participant` | Membres de chaque conversation |
| `chat_message` | Messages chat |
| `creator_revenue_log` | Revenus mensuels |
| `creator_balance` | Solde créateur |
| `payout` | Historique versements |
| `fan_subscription` | Abonnements Mode Fan |

---

## Documents associés

| Document | Contenu |
|----------|---------|
| `V1_DATABASE_SCHEMA.md` | Schéma complet V1 — base de ce document |
| `V1_WEBSITE_ARCHITECTURE_TECHNIQUE.md` | Architecture Next.js — structure projet, routing |
| `V1_BACKEND_EDGE_FUNCTIONS.md` | Edge Functions (translation-service, create-creator-profile) |
| `V1_ARCHITECTURE_DECISIONS.md` | Journal décisions — fait autorité en cas de contradiction |

---

*Document créé : Mars 2026*  
*Auteur : Curtis — Fondateur Akeli*  
*Version : 1.0 — Database Complémentaire Website V1*
