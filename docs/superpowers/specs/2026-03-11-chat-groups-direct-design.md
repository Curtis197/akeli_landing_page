# Chat Groups & Direct Conversations — Design Spec

**Date:** 2026-03-11
**Branch:** `claude/general-session-4IFEH`
**Status:** Approved (v2 — post spec review)

---

## Overview

Add group messaging management and creator-to-creator private conversations to the existing `/chat` page. The existing `/chat/[id]` conversation thread remains unchanged.

---

## 1. Page Structure & Routing

`/chat/page.tsx` becomes a tabbed shell with three tabs. Tab state is stored in a URL search param (`?tab=groups` or `?tab=direct`) so back navigation and direct links work.

```
/chat?tab=all     → <AllConversationsTab>   (current behavior, all types)
/chat?tab=groups  → <GroupsTab>             (type: creator_group)
/chat?tab=direct  → <DirectTab>             (type: private)
```

A `+` button (top right of page) opens `<NewConversationModal>` with two options:
- "Démarrer une conversation" → opens `<CreatorSearchModal>`
- "Créer un groupe" → opens `<CreateGroupModal>`

No new routes. All existing `/chat/[id]` links continue to work unchanged.

---

## 2. Components

New files under `components/creator/chat/`:

| File | Purpose |
|---|---|
| `ConversationList.tsx` | Shared list renderer used by All and Direct tabs |
| `GroupsTab.tsx` | Groups list with search, public/private filter, sort |
| `DirectTab.tsx` | Direct conversations list + empty state |
| `NewConversationModal.tsx` | Entry point: choose Direct or Group |
| `CreatorSearchModal.tsx` | Search/filter/sort creators → create or open DM |
| `CreateGroupModal.tsx` | Name + public/private toggle → create group |

`/chat/page.tsx` is refactored to import these components and render the tab shell.

### Component Details

**ConversationList**
Accepts a typed list of conversations as props (id, name, updated_at, last_message_preview, unread_count, avatar_url). Renders each as a row with avatar, name, last message, timestamp, unread badge. Avatar: for private conversations uses the other participant's creator.profile_image_url; for creator_group uses community_group.cover_url if the join exists, else a placeholder. Unread count derived from conversation_participant.last_read_at vs conversation.updated_at (no read_by array in schema).

**GroupsTab**
- Fetches conversation rows where type = 'creator_group', joined with community_group for name and cover image
- Search input filters by group name (client-side on fetched results)
- Filter chips: All / Public / Private
- Sort dropdown: Activity (conversation.updated_at DESC) / Name (alphabetical)
- Empty state when no groups exist

**DirectTab**
- Fetches conversation rows where type = 'private' for the current user
- Reuses ConversationList
- No search input on this tab — search is in CreatorSearchModal
- Empty state with "Démarrer une conversation" CTA that opens NewConversationModal

**CreatorSearchModal**
- Queries creator table with search by display_name or username
- Sort options: Name (display_name ASC) / Followers (fan_count DESC)
- On creator click:
  1. Use creator.user_id (= user_profile.id) as target participant ID
  2. Check getExistingDirectConversation(currentUser.id, creator.user_id)
  3. If yes: navigate to /chat/[existing_id]
  4. If no: createDirectConversation(currentUser.id, creator.user_id), navigate to /chat/[new_id]

**CreateGroupModal**
- Form fields: group name (required) + public/private toggle (default: public)
- On submit:
  1. INSERT into community_group with creator_id = user.id (Supabase Auth user.id = user_profile.id)
  2. INSERT into conversation (type: 'creator_group', name, created_by)
  3. If community_group_id column exists on conversation: UPDATE conversation SET community_group_id
  4. INSERT into conversation_participant (user_id: user.id)
  5. Navigate to /chat/[conversation_id]


---

## 3. Data Flow & Queries

All data fetching in the new components uses TanStack Query. Query functions live in lib/queries/chat.ts.

The existing /chat/[id]/page.tsx keeps its current raw Supabase + useState approach.

### Identity clarification
creator.id = row PK. creator.user_id = user_profile.id = Supabase Auth user.id.
All conversation_participant inserts use user_profile.id. community_group.creator_id also uses user_profile.id.

### Query Functions

```ts
getConversations(userId: string, type?: 'private' | 'creator_group' | 'support')
getCreators(search: string, sort: 'name' | 'fan_count')
// Intersect: convs where user_id=A AND type=private with convs where user_id=B
getExistingDirectConversation(userIdA: string, userIdB: string): Promise<string | null>
```

### Mutation Functions

```ts
// Both IDs must be user_profile.id (Supabase Auth user.id)
createDirectConversation(currentUserId: string, targetUserId: string): Promise<string>
// INSERT conversation { type: 'private' }
// INSERT conversation_participant x2

createGroup(name: string, isPublic: boolean, creatorUserId: string): Promise<string>
// INSERT community_group { name, is_public, creator_id: creatorUserId } (user_profile.id)
// INSERT conversation { type: 'creator_group', name, created_by }
// INSERT conversation_participant { conversation_id, user_id: creatorId }
```

No Edge Functions needed — straightforward inserts covered by RLS.

### State Management

- Tab selection: useSearchParams + useRouter (next-intl); defaults to tab=all when param absent
- Modal open/close: local useState
- No new Zustand stores needed

---

## 4. Translations

New keys added under the existing chat namespace in messages/fr.json and messages/en.json.

FR / EN pairs:
- tabs.all: "Tous" / "All"
- tabs.groups: "Groupes" / "Groups"
- tabs.direct: "Direct" / "Direct"
- newConversation: "Nouvelle conversation" / "New conversation"
- startDirect: "Démarrer une conversation" / "Start a conversation"
- createGroup: "Créer un groupe" / "Create a group"
- loading: "Chargement..." / "Loading..."
- error: "Une erreur est survenue" / "Something went wrong"
- groups.search: "Rechercher un groupe..." / "Search groups..."
- groups.filterAll: "Tous" / "All"
- groups.filterPublic: "Public" / "Public"
- groups.filterPrivate: "Privé" / "Private"
- groups.sortActivity: "Activité" / "Activity"
- groups.sortName: "Nom" / "Name"
- groups.empty: "Aucun groupe" / "No groups"
- groups.groupName: "Nom du groupe" / "Group name"
- groups.visibility: "Visibilité" / "Visibility"
- groups.public: "Public" / "Public"
- groups.private: "Privé" / "Private"
- groups.create: "Créer" / "Create"
- direct.search: "Rechercher un créateur..." / "Search creators..."
- direct.sortName: "Nom" / "Name"
- direct.sortFollowers: "Abonnés" / "Followers"
- direct.empty: "Aucune conversation directe" / "No direct conversations"
- direct.emptyHint: "Démarre une conversation avec un autre créateur." / "Start a conversation with another creator."
- direct.startConversation: "Démarrer" / "Start"

---

## 5. DB Migration Required

No join key exists between conversation and community_group. Migration needed before full GroupsTab UI:

  ALTER TABLE conversation ADD COLUMN community_group_id UUID REFERENCES community_group(id) ON DELETE SET NULL;

Without migration: GroupsTab degrades gracefully — shows conversation.name only, no cover, Public/Private filter hidden.

---

## 6. Pre-existing Bug Fix

/chat/[id]/page.tsx has hardcoded back nav to /dashboard/chat (wrong). Fix to locale-aware:
- creator_group: back to /chat?tab=groups
- private: back to /chat?tab=direct
- support: back to /chat

---

## 7. DB Tables Used

| Table | Usage |
|---|---|
| conversation | Read/insert — filtered by type |
| conversation_participant | Read/insert — links users to conversations |
| community_group | Read/insert — group metadata |
| creator | Read — creator search in DM modal |

conversation_request table deferred — not needed for creator-to-creator immediate flow.

---

## 8. Out of Scope (deferred)

- Group member management (add/remove members)
- Group cover image upload at creation
- Typing indicators
- Message search
- Read receipts UI
- conversation_request approval flow (for fan to creator)
- Topic/region filters on groups
