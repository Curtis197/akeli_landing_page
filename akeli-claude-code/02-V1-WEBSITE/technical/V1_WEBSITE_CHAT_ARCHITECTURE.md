# Akeli V1 — Architecture Chat Créateurs (Website)

> Spécifications complètes de l'implémentation du chat dans l'espace créateur Next.js.
> Couvre : chat privé 1-to-1, groupes créateurs, chat support Akeli.
> Technologie : Supabase Realtime (WebSockets).

**Statut** : Référence V1 Website — Prêt pour Claude Code  
**Date** : Mars 2026  
**Auteur** : Curtis — Fondateur Akeli  
**Dépendances** : `V1_WEBSITE_DATABASE_COMPLETE.md` (schema conversation modifié)

---

## Vue d'ensemble

Le chat est exclusivement disponible dans l'espace créateur authentifié.
Il utilise **Supabase Realtime** pour la diffusion temps réel des messages via WebSockets.
Les messages sont persistés en base PostgreSQL — Realtime est uniquement le canal de diffusion.

```
Créateur A                    Supabase                    Créateur B
   │                              │                            │
   │─── INSERT chat_message ─────▶│                            │
   │                              │─── Realtime broadcast ────▶│
   │                              │    (postgres_changes)       │
   │◀── optimistic update ────────│                            │
   │    (local state)             │                            │
```

### Trois types de conversations

| Type | Description | Créé par | Participants |
|------|-------------|----------|--------------|
| `private` | Chat 1-to-1 entre créateurs | Créateur (cherche un autre créateur) | 2 créateurs |
| `creator_group` | Groupe thématique | Créateur (choisit nom + description) | N créateurs |
| `support` | Créateur ↔ Akeli | Système (à l'inscription) | Créateur + Akeli |

---

## Structure de données (rappel)

Tables concernées — définies dans `V1_WEBSITE_DATABASE_COMPLETE.md` :

```sql
-- conversation (modifiée)
conversation {
  id, type, name, description,
  created_by,      -- user_id du créateur fondateur
  is_support_open, -- pour les conversations support
  created_at
}

-- conversation_participant (existante)
conversation_participant {
  conversation_id, user_id,
  joined_at, last_read_at
}

-- chat_message (existante)
chat_message {
  id, conversation_id,
  sender_id,        -- user_id (via user_profile)
  content,
  message_type,     -- 'text' | 'image' | 'recipe_share'
  recipe_id,        -- si message_type = recipe_share
  sent_at
}
```

---

## 1. Initialisation Supabase Realtime

### Client Supabase browser

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

### Hook principal — `useConversation`

Hook centralisé qui gère la subscription Realtime, les messages, et le typing indicator pour une conversation donnée.

```typescript
// hooks/useConversation.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { ChatMessage } from '@/types/chat';

export function useConversation(conversationId: string, userId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // ── Chargement initial des messages ─────────────────────────────
  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('chat_message')
        .select(`
          id, content, message_type, sent_at,
          sender:sender_id(
            id, display_name:user_profile(first_name, last_name),
            avatar_url:creator(avatar_url)
          ),
          recipe:recipe_id(id, title, cover_image_url, slug)
        `)
        .eq('conversation_id', conversationId)
        .order('sent_at', { ascending: false })
        .limit(50);

      setMessages((data ?? []).reverse());
      setIsLoading(false);
      markAsRead();
    };

    loadMessages();
  }, [conversationId]);

  // ── Subscription Realtime ────────────────────────────────────────
  useEffect(() => {
    // Canal unique par conversation
    const channel = supabase.channel(`conversation:${conversationId}`, {
      config: { presence: { key: userId } }
    });

    // 1. Nouveaux messages (postgres_changes)
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_message',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const newMessage = payload.new as ChatMessage;
        setMessages(prev => [...prev, newMessage]);
        // Marquer comme lu si la conversation est active
        markAsRead();
      }
    );

    // 2. Typing indicators (broadcast — pas stocké en DB)
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {
      if (payload.user_id === userId) return;

      setTypingUsers(prev => new Set(prev).add(payload.user_id));

      // Retirer après 3 secondes sans nouveau signal
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(payload.user_id);
          return next;
        });
      }, 3000);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [conversationId, userId]);

  // ── Envoi d'un message ───────────────────────────────────────────
  const sendMessage = useCallback(async (
    content: string,
    type: 'text' | 'image' | 'recipe_share' = 'text',
    recipeId?: string
  ) => {
    // Optimistic update : ajoute le message localement immédiatement
    const optimisticMessage: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: userId,
      content,
      message_type: type,
      recipe_id: recipeId ?? null,
      sent_at: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages(prev => [...prev, optimisticMessage]);

    // Insert en base (Realtime diffusera aux autres participants)
    const { data, error } = await supabase
      .from('chat_message')
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        message_type: type,
        recipe_id: recipeId,
      })
      .select()
      .single();

    if (error) {
      // Rollback optimistic update
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      console.error('Send message failed:', error);
      return;
    }

    // Remplacer le message optimiste par le message réel
    setMessages(prev =>
      prev.map(m => m.id === optimisticMessage.id ? { ...data, _optimistic: false } : m)
    );
  }, [conversationId, userId]);

  // ── Typing indicator ─────────────────────────────────────────────
  const sendTypingSignal = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: userId },
    });
  }, [userId]);

  // ── Marquer comme lu ────────────────────────────────────────────
  const markAsRead = useCallback(async () => {
    await supabase
      .from('conversation_participant')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);
  }, [conversationId, userId]);

  // ── Pagination (scroll vers le haut) ────────────────────────────
  const loadOlderMessages = useCallback(async () => {
    if (messages.length === 0) return;
    const oldest = messages[0];

    const { data } = await supabase
      .from('chat_message')
      .select(`
        id, content, message_type, sent_at,
        sender:sender_id(id, first_name, last_name, avatar_url:creator(avatar_url))
      `)
      .eq('conversation_id', conversationId)
      .lt('sent_at', oldest.sent_at)
      .order('sent_at', { ascending: false })
      .limit(50);

    setMessages(prev => [...(data ?? []).reverse(), ...prev]);
  }, [conversationId, messages]);

  return {
    messages, typingUsers, isLoading,
    sendMessage, sendTypingSignal, loadOlderMessages,
  };
}
```

---

## 2. Hook liste conversations — `useConversationList`

Gère la liste des conversations avec badge non-lus et mise à jour temps réel.

```typescript
// hooks/useConversationList.ts
export function useConversationList(userId: string) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Chargement initial
  useEffect(() => {
    const loadConversations = async () => {
      // Récupère les IDs de conversations du créateur
      const { data: participations } = await supabase
        .from('conversation_participant')
        .select('conversation_id')
        .eq('user_id', userId);

      const convIds = participations?.map(p => p.conversation_id) ?? [];

      // Charge les conversations avec dernier message
      const { data } = await supabase
        .from('conversation')
        .select(`
          id, type, name, created_at,
          participants:conversation_participant(
            user_id, last_read_at,
            profile:user_id(
              creator(display_name, avatar_url)
            )
          )
        `)
        .in('id', convIds)
        .order('updated_at', { ascending: false });

      setConversations(data ?? []);
      computeUnreadCounts(data ?? []);
    };

    loadConversations();
  }, [userId]);

  // Subscription pour mise à jour temps réel (nouveau message = badge)
  useEffect(() => {
    const channel = supabase
      .channel('conversation-list-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_message' },
        (payload) => {
          const msg = payload.new as { conversation_id: string; sender_id: string };
          // Si message d'un autre → incrémenter badge
          if (msg.sender_id !== userId) {
            setUnreadCounts(prev => ({
              ...prev,
              [msg.conversation_id]: (prev[msg.conversation_id] ?? 0) + 1,
            }));
          }
          // Remonter la conversation en tête de liste
          setConversations(prev => {
            const updated = prev.find(c => c.id === msg.conversation_id);
            if (!updated) return prev;
            return [updated, ...prev.filter(c => c.id !== msg.conversation_id)];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const computeUnreadCounts = (convs: ConversationSummary[]) => {
    const counts: Record<string, number> = {};
    // Calculé depuis last_read_at vs dernier message
    // Simplifié ici — calcul exact via query SQL
    setUnreadCounts(counts);
  };

  const clearUnread = (conversationId: string) => {
    setUnreadCounts(prev => ({ ...prev, [conversationId]: 0 }));
  };

  return { conversations, unreadCounts, clearUnread };
}
```

---

## 3. Flux — Chat Privé 1-to-1

### Initier une conversation privée

Un créateur cherche un autre créateur et initie une conversation.

```typescript
// Depuis la page /chat — bouton "+ Nouveau message"
const startPrivateConversation = async (targetCreatorUserId: string) => {
  // Fonction SQL atomique : trouve ou crée la conversation
  const { data: conversation } = await supabase
    .rpc('find_or_create_conversation', {
      user_a_id: currentUserId,
      user_b_id: targetCreatorUserId,
    });

  // Redirect vers la conversation
  router.push(`/chat/${conversation.id}`);
};
```

**Fonction SQL `find_or_create_conversation` (définie dans `V1_ARCHITECTURE_DECISIONS.md`) :**
```sql
CREATE OR REPLACE FUNCTION find_or_create_conversation(
  user_a_id uuid,
  user_b_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_conv_id uuid;
BEGIN
  -- Cherche une conversation privée existante entre les deux créateurs
  SELECT c.id INTO v_conv_id
  FROM conversation c
  JOIN conversation_participant pa ON pa.conversation_id = c.id AND pa.user_id = user_a_id
  JOIN conversation_participant pb ON pb.conversation_id = c.id AND pb.user_id = user_b_id
  WHERE c.type = 'private'
  LIMIT 1;

  -- Si pas trouvée, crée-en une
  IF v_conv_id IS NULL THEN
    INSERT INTO conversation (type, created_by)
    VALUES ('private', user_a_id)
    RETURNING id INTO v_conv_id;

    INSERT INTO conversation_participant (conversation_id, user_id)
    VALUES (v_conv_id, user_a_id), (v_conv_id, user_b_id);
  END IF;

  RETURN v_conv_id;
END;
$$;
```

### Rechercher un créateur pour démarrer une conversation

```typescript
// Modal "Nouveau message" — recherche créateur
const searchCreators = async (query: string) => {
  const { data } = await supabase
    .from('creator')
    .select('id, user_id, display_name, avatar_url, username')
    .ilike('display_name', `%${query}%`)
    .neq('user_id', currentUserId)  // Exclure soi-même
    .limit(10);
  return data;
};
```

---

## 4. Flux — Groupes Créateurs

### Créer un groupe

```typescript
// Modal "+ Créer un groupe"
const createGroup = async (name: string, description: string) => {
  // 1. Créer la conversation groupe
  const { data: conversation } = await supabase
    .from('conversation')
    .insert({
      type: 'creator_group',
      name,
      description,
      created_by: currentUserId,
    })
    .select()
    .single();

  // 2. Ajouter le créateur fondateur comme participant
  await supabase
    .from('conversation_participant')
    .insert({
      conversation_id: conversation.id,
      user_id: currentUserId,
    });

  // 3. Redirect vers le groupe
  router.push(`/chat/${conversation.id}`);
};
```

### Rejoindre un groupe

```typescript
const joinGroup = async (conversationId: string) => {
  // Vérifie que le groupe est de type creator_group (public)
  const { data: conv } = await supabase
    .from('conversation')
    .select('type')
    .eq('id', conversationId)
    .single();

  if (conv?.type !== 'creator_group') return;

  await supabase
    .from('conversation_participant')
    .insert({
      conversation_id: conversationId,
      user_id: currentUserId,
    })
    .onConflict('conversation_id,user_id')
    .ignore(); // Silencieux si déjà membre

  router.push(`/chat/${conversationId}`);
};
```

### Inviter un créateur dans un groupe

```typescript
const inviteToGroup = async (conversationId: string, targetUserId: string) => {
  await supabase
    .from('conversation_participant')
    .insert({
      conversation_id: conversationId,
      user_id: targetUserId,
    })
    .onConflict('conversation_id,user_id')
    .ignore();
};
```

### Lister les groupes disponibles (catalogue)

```typescript
// Page /chat — section "Groupes" → sous-onglet "Découvrir"
const listPublicGroups = async () => {
  const { data } = await supabase
    .from('conversation')
    .select(`
      id, name, description, created_at,
      created_by(creator(display_name, avatar_url)),
      member_count:conversation_participant(count)
    `)
    .eq('type', 'creator_group')
    .order('created_at', { ascending: false });
  return data;
};
```

---

## 5. Flux — Chat Support Akeli

La conversation support est créée automatiquement à l'inscription du créateur via trigger PostgreSQL (voir `V1_WEBSITE_DATABASE_COMPLETE.md` — section 12).

```typescript
// Récupérer la conversation support du créateur
const getSupportConversation = async () => {
  const { data: participation } = await supabase
    .from('conversation_participant')
    .select('conversation_id, conversation(type)')
    .eq('user_id', currentUserId)
    .eq('conversation.type', 'support')
    .single();

  return participation?.conversation_id;
};
```

Le chat support utilise exactement la même interface que le chat privé.
La distinction visuelle : avatar Akeli + nom "Support Akeli" dans le header.

---

## 6. Partage de recettes dans le chat

Un créateur peut partager une recette directement dans une conversation.

```typescript
// Message de type recipe_share
const shareRecipe = async (conversationId: string, recipeId: string) => {
  await supabase.from('chat_message').insert({
    conversation_id: conversationId,
    sender_id: currentUserId,
    content: '', // Vide pour recipe_share
    message_type: 'recipe_share',
    recipe_id: recipeId,
  });
};
```

**Rendu d'un message `recipe_share` :**
```typescript
// Composant MessageBubble
if (message.message_type === 'recipe_share' && message.recipe) {
  return (
    <div className="recipe-share-card">
      <img src={message.recipe.cover_image_url} alt={message.recipe.title} />
      <div>
        <p>{message.recipe.title}</p>
        <Link href={`/recipes/${message.recipe.id}/edit`}>
          Voir la recette →
        </Link>
      </div>
    </div>
  );
}
```

---

## 7. Upload image dans le chat

```typescript
const sendImageMessage = async (conversationId: string, file: File) => {
  // 1. Compression
  const compressed = await imageCompression(file, { maxSizeMB: 2 });

  // 2. Upload Supabase Storage
  const filename = `${Date.now()}-${file.name}`;
  const { data } = await supabase.storage
    .from('chat-images')
    .upload(`${conversationId}/${filename}`, compressed);

  const { data: { publicUrl } } = supabase.storage
    .from('chat-images')
    .getPublicUrl(`${conversationId}/${filename}`);

  // 3. Envoyer message image
  await supabase.from('chat_message').insert({
    conversation_id: conversationId,
    sender_id: currentUserId,
    content: publicUrl,
    message_type: 'image',
  });
};
```

**Bucket Storage pour images chat :**
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat-images', 'chat-images', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

CREATE POLICY "participant uploads chat image"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-images' AND
    auth.uid() IN (SELECT user_id FROM creator)
  );

CREATE POLICY "public reads chat images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-images');
```

---

## 8. Composants UI

### `ConversationList`

```typescript
// components/creator/chat/ConversationList.tsx
interface ConversationListProps {
  conversations: ConversationSummary[];
  unreadCounts: Record<string, number>;
  activeId?: string;
  onSelect: (id: string) => void;
}

// Rendu : liste groupée par type
// Section "Privés" → conversations type = private
// Section "Groupes" → conversations type = creator_group
// Section "Support Akeli" → conversation type = support
```

### `ChatWindow`

```typescript
// components/creator/chat/ChatWindow.tsx
interface ChatWindowProps {
  conversationId: string;
  conversationType: 'private' | 'creator_group' | 'support';
  conversationName: string;
  userId: string;
}

// Utilise useConversation()
// Gère : scroll infini, pagination, zone de saisie, typing indicator
```

### `MessageBubble`

```typescript
// components/creator/chat/MessageBubble.tsx
interface MessageBubbleProps {
  message: ChatMessage;
  isOwnMessage: boolean;
  showAvatar: boolean;  // false si même expéditeur que message précédent
}

// Rendu selon message_type :
// text        → bulle texte
// image       → image avec lightbox au clic
// recipe_share → card recette avec aperçu
```

### `TypingIndicator`

```typescript
// Affiché quand typingUsers.size > 0
// "[Nom] est en train d'écrire..." (1 personne)
// "[Nom1] et [Nom2] écrivent..." (2+ personnes)
// "..." animation points
```

### `MessageInput`

```typescript
// components/creator/chat/MessageInput.tsx
// Barre de saisie bas de page
// Features :
//   - Textarea auto-resize (max 4 lignes)
//   - Envoi sur Enter (Shift+Enter = nouvelle ligne)
//   - Bouton attach image
//   - Bouton partager recette (ouvre modal sélection recette)
//   - Emit typing signal à chaque keystroke (debounce 1s)
```

---

## 9. Badge non-lus dans la Sidebar

Le badge sur l'icône "Messages" dans la sidebar affiche le total des messages non-lus.

```typescript
// hooks/useTotalUnread.ts
export function useTotalUnread(userId: string) {
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    // Calcul initial
    const computeUnread = async () => {
      const { data } = await supabase
        .from('conversation_participant')
        .select(`
          conversation_id, last_read_at,
          conversation(updated_at)
        `)
        .eq('user_id', userId);

      // Compte les conversations avec updated_at > last_read_at
      const unread = data?.filter(p =>
        p.conversation?.updated_at &&
        (!p.last_read_at || p.conversation.updated_at > p.last_read_at)
      ).length ?? 0;

      setTotalUnread(unread);
    };

    computeUnread();

    // Mise à jour temps réel
    const channel = supabase
      .channel('unread-badge')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_message',
      }, () => { computeUnread(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return totalUnread;
}
```

```typescript
// Dans Sidebar.tsx
const totalUnread = useTotalUnread(userId);

// Rendu :
<Link href="/chat">
  💬 Messages
  {totalUnread > 0 && (
    <span className="badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
  )}
</Link>
```

---

## 10. RLS — Sécurité chat

Les RLS policies garantissent qu'un créateur ne peut lire que ses propres conversations.

```sql
-- chat_message : lecture réservée aux participants
CREATE POLICY "participant reads messages" ON chat_message
  FOR SELECT USING (
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participant
      WHERE user_id = auth.uid()
    )
  );

-- chat_message : écriture réservée aux participants
CREATE POLICY "participant sends messages" ON chat_message
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    conversation_id IN (
      SELECT conversation_id
      FROM conversation_participant
      WHERE user_id = auth.uid()
    )
  );

-- conversation : lecture réservée aux participants
CREATE POLICY "participant reads conversation" ON conversation
  FOR SELECT USING (
    id IN (
      SELECT conversation_id
      FROM conversation_participant
      WHERE user_id = auth.uid()
    )
    OR type = 'creator_group'  -- Groupes publics visibles par tous créateurs
  );

-- conversation_participant : un créateur voit ses participations
CREATE POLICY "participant reads own" ON conversation_participant
  FOR SELECT USING (auth.uid() = user_id);
```

---

## 11. Gestion des erreurs et reconnexion

Supabase Realtime gère automatiquement la reconnexion en cas de perte réseau.
Le website doit gérer les cas dégradés :

```typescript
// Détection état connexion Realtime
supabase.realtime.onOpen(() => {
  setConnectionStatus('connected');
});

supabase.realtime.onClose(() => {
  setConnectionStatus('disconnected');
  // Afficher banner : "Connexion interrompue. Reconnexion..."
});

supabase.realtime.onError((error) => {
  console.error('Realtime error:', error);
});
```

**Banner déconnexion :**
```
┌─────────────────────────────────────────────────┐
│ ⚠️  Connexion interrompue. Les nouveaux messages │
│     seront chargés à la reconnexion.            │
└─────────────────────────────────────────────────┘
```

**À la reconnexion — resync des messages manqués :**
```typescript
const resyncMessages = async (lastMessageTime: string) => {
  const { data } = await supabase
    .from('chat_message')
    .select('*')
    .eq('conversation_id', conversationId)
    .gt('sent_at', lastMessageTime)
    .order('sent_at', { ascending: true });

  if (data?.length) {
    setMessages(prev => [...prev, ...data]);
  }
};
```

---

## 12. Performance — Optimisations

### Limite des subscriptions actives

Ne jamais ouvrir plus d'une subscription Realtime par conversation.
La subscription est créée à l'entrée dans `/chat/[id]` et détruite à la sortie (cleanup useEffect).

```typescript
// Pattern : une seule subscription par conversation
useEffect(() => {
  const channel = supabase.channel(`conversation:${conversationId}`);
  // ... setup ...
  channel.subscribe();

  return () => {
    supabase.removeChannel(channel);  // ← Cleanup obligatoire
  };
}, [conversationId]);
```

### Virtualisation liste messages

Pour les conversations avec beaucoup de messages, utiliser `@tanstack/react-virtual` pour ne rendre que les messages visibles.

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: messages.length,
  getScrollElement: () => scrollContainerRef.current,
  estimateSize: () => 60,   // hauteur estimée par message
  overscan: 10,
});
```

### Pagination scroll infini

```typescript
// Détecter scroll vers le haut → charger messages plus anciens
const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
  const { scrollTop } = e.currentTarget;
  if (scrollTop < 100 && !isLoadingOlder) {
    setIsLoadingOlder(true);
    loadOlderMessages().finally(() => setIsLoadingOlder(false));
  }
}, [loadOlderMessages, isLoadingOlder]);
```

---

## 13. Types TypeScript

```typescript
// types/chat.ts

export type ConversationType = 'private' | 'creator_group' | 'support';
export type MessageType = 'text' | 'image' | 'recipe_share';

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  recipe_id: string | null;
  sent_at: string;
  _optimistic?: boolean;  // Flag interne — pas en DB
  // Relations (jointures)
  sender?: {
    id: string;
    display_name: string;
    avatar_url: string;
  };
  recipe?: {
    id: string;
    title: string;
    cover_image_url: string;
    slug: string;
  };
}

export interface ConversationSummary {
  id: string;
  type: ConversationType;
  name: string | null;
  created_at: string;
  participants: ConversationParticipant[];
  last_message?: ChatMessage;
}

export interface ConversationParticipant {
  user_id: string;
  last_read_at: string | null;
  profile?: {
    display_name: string;
    avatar_url: string;
  };
}
```

---

## Récapitulatif — Flux complets

| Action | Déclencheur | Mécanisme |
|--------|-------------|-----------|
| Nouveau message envoyé | INSERT `chat_message` | → Realtime broadcast → `useConversation` ajoute le message |
| Badge non-lus mis à jour | INSERT `chat_message` | → Realtime → `useTotalUnread` recompute |
| Typing indicator | Keystroke dans MessageInput | → Broadcast Realtime (pas stocké DB) |
| Conversation remontée en tête | INSERT `chat_message` | → `useConversationList` réordonne |
| Conversation privée créée | Clic "Nouveau message" | → `find_or_create_conversation` SQL → redirect |
| Groupe créé | Formulaire "Créer groupe" | → INSERT conversation + participant → redirect |
| Recette partagée | Bouton dans MessageInput | → INSERT message type recipe_share |
| Image envoyée | Upload dans MessageInput | → Storage upload → INSERT message type image |
| Support conversation | Inscription créateur | → Trigger PostgreSQL automatique |

---

## Documents associés

| Document | Contenu |
|----------|---------|
| `V1_WEBSITE_DATABASE_COMPLETE.md` | Schema `conversation` modifié, trigger support |
| `V1_WEBSITE_PAGES_SPECIFICATIONS.md` | Pages `/chat` et `/chat/[id]` |
| `V1_DATABASE_SCHEMA.md` | Tables `conversation`, `chat_message`, `conversation_participant` |
| `V1_BACKEND_EDGE_FUNCTIONS.md` | Section 8 — Communauté (fonctions SQL) |

---

*Document créé : Mars 2026*
*Auteur : Curtis — Fondateur Akeli*
*Version : 1.0 — Architecture Chat Créateurs V1*
