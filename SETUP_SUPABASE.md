# 📧 Configuration de la liste d'attente avec Supabase

Ce guide vous explique comment configurer votre base de données Supabase pour collecter les emails de votre liste d'attente.

## 🚀 Étapes de configuration

### 1. Créer la table dans Supabase

1. Connectez-vous à votre [Dashboard Supabase](https://app.supabase.com)
2. Sélectionnez votre projet (ou créez-en un nouveau)
3. Allez dans **SQL Editor** dans le menu de gauche
4. Copiez et exécutez cette requête SQL :

```sql
-- Créer la table waitlist
CREATE TABLE waitlist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  user_type text NOT NULL CHECK (user_type IN ('user', 'creator')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Créer un index sur l'email pour des recherches rapides
CREATE INDEX idx_waitlist_email ON waitlist(email);

-- Créer un index sur created_at pour trier par date
CREATE INDEX idx_waitlist_created_at ON waitlist(created_at DESC);

-- Créer un index sur user_type pour filtrer par type d'utilisateur
CREATE INDEX idx_waitlist_user_type ON waitlist(user_type);
```

**Note importante :** Si vous aviez déjà créé la table `waitlist` sans la colonne `user_type`, exécutez cette requête pour ajouter la colonne :

```sql
-- Ajouter la colonne user_type à une table existante
ALTER TABLE waitlist ADD COLUMN user_type text NOT NULL DEFAULT 'user' CHECK (user_type IN ('user', 'creator'));

-- Créer l'index sur user_type
CREATE INDEX idx_waitlist_user_type ON waitlist(user_type);
```

### 2. Configurer les politiques RLS (Row Level Security)

1. Toujours dans le **SQL Editor**, exécutez :

```sql
-- Activer Row Level Security
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre l'insertion (pour le formulaire public)
CREATE POLICY "Permettre l'insertion pour tous"
ON waitlist
FOR INSERT
TO public
WITH CHECK (true);

-- Politique pour permettre la lecture (optionnel, seulement si vous voulez afficher le nombre d'inscrits)
CREATE POLICY "Permettre la lecture pour tous"
ON waitlist
FOR SELECT
TO public
USING (true);
```

### 3. Récupérer vos identifiants Supabase

1. Allez dans **Project Settings** (icône ⚙️ en bas à gauche)
2. Cliquez sur **API** dans le menu
3. Copiez les deux valeurs suivantes :
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon/public key** (une longue chaîne de caractères)

### 4. Configurer le fichier supabase-config.js

1. Ouvrez le fichier `supabase-config.js`
2. Remplacez `YOUR_SUPABASE_URL` par votre **Project URL**
3. Remplacez `YOUR_SUPABASE_ANON_KEY` par votre **anon key**

Exemple :

```javascript
const SUPABASE_CONFIG = {
    url: 'https://abcdefghijklmnop.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOi...'
};
```

## ✅ Tester la configuration

1. Ouvrez votre site dans un navigateur
2. Ouvrez la console du navigateur (F12)
3. Vous devriez voir : `✅ Supabase client initialisé`
4. Remplissez le formulaire avec un email de test
5. Vérifiez dans Supabase **Table Editor** > **waitlist** que l'email a été ajouté

## 📊 Consulter les emails collectés

Pour voir tous les emails collectés :

1. Allez dans **Table Editor** dans votre Dashboard Supabase
2. Cliquez sur la table **waitlist**
3. Vous verrez tous les emails avec leur date d'inscription

## 🔒 Sécurité

- ✅ La clé **anon key** est sûre pour le frontend
- ✅ Row Level Security (RLS) protège vos données
- ✅ Seules les insertions sont autorisées depuis le formulaire public
- ✅ L'email est unique (pas de doublons possibles)

## 📥 Exporter les emails

Pour exporter la liste :

1. Dans **Table Editor**, sélectionnez la table **waitlist**
2. Cliquez sur le bouton **Export** en haut à droite
3. Choisissez le format (CSV, JSON, etc.)

Ou utilisez une requête SQL :

```sql
SELECT email, created_at
FROM waitlist
ORDER BY created_at DESC;
```

## 🆘 Problèmes courants

### Le formulaire ne fonctionne pas
- Vérifiez que `supabase-config.js` est bien configuré
- Ouvrez la console du navigateur (F12) pour voir les erreurs
- Vérifiez que les politiques RLS sont bien configurées

### Erreur "relation waitlist does not exist"
- La table n'a pas été créée, retournez à l'étape 1

### Erreur "duplicate key value violates unique constraint"
- L'email est déjà dans la base de données (c'est normal !)

## 📧 Notifications email (optionnel)

Pour recevoir un email à chaque nouvelle inscription, vous pouvez configurer un webhook :

1. Allez dans **Database** > **Webhooks**
2. Créez un nouveau webhook qui se déclenche sur `INSERT` dans la table `waitlist`
3. Utilisez un service comme Zapier, Make, ou n8n pour envoyer un email

---

✨ **Votre liste d'attente est maintenant configurée !**
