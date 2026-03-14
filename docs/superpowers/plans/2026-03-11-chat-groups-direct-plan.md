# Implementation Plan: Chat Groups & Direct Conversations

**Spec:** docs/superpowers/specs/2026-03-11-chat-groups-direct-design.md
**Branch:** claude/general-session-4IFEH
**Date:** 2026-03-11

---

## Overview

11 tasks in dependency order. Tasks 1-3 are foundations; 4-9 are new components; 10-11 integrate.

---

## Task 1: DB Migration

Apply via `mcp__claude_ai_Supabase__apply_migration`:

```sql
ALTER TABLE conversation
  ADD COLUMN IF NOT EXISTS community_group_id UUID
  REFERENCES community_group(id) ON DELETE SET NULL;
```

**Verification:** `execute_sql` to confirm column exists:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'conversation' AND column_name = 'community_group_id';
```

---

## Task 2: lib/queries/chat.ts

Create new file. Export the following types and functions.

### Types

```ts
export interface ConversationListItem {
  id: string;
  name: string | null;
  type: "private" | "creator_group" | "support";
  updated_at: string;
  unread: boolean;
  community_group?: { cover_url: string | null; is_public: boolean } | null;
}

export interface CreatorSearchItem {
  id: string;
  user_id: string;
  display_name: string | null;
  username: string | null;
  profile_image_url: string | null;
  fan_count: number;
}
```

### getConversations(supabase, userId, type?)

1. Query `conversation_participant` where `user_id = userId` to get `conversation_id[]`
2. Query `conversation` where `id IN ids`, filter by `type` if given, order by `updated_at DESC`
3. Derive `unread`: compare participant `last_read_at` vs `conversation.updated_at` for current user
4. For `creator_group`: join `community_group` by `community_group_id` if column is populated

Returns `ConversationListItem[]`

### getCreators(supabase, search, sort)

- Select `id, user_id, display_name, username, profile_image_url, fan_count` from `creator`
- If search non-empty: filter with `.or("display_name.ilike.%" + search + "%,username.ilike.%" + search + "%")`
- Order: `display_name ASC` (sort=name) or `fan_count DESC` (sort=fan_count)
- Limit 50. Returns `CreatorSearchItem[]`

### getExistingDirectConversation(supabase, userIdA, userIdB) -> Promise<string | null>

1. Get `conversation_id[]` where `user_id = userIdA` from `conversation_participant`
2. Get `conversation_id[]` where `user_id = userIdB` from `conversation_participant`
3. Intersect both sets
4. For intersected ids, check `conversation.type = "private"`
5. Return first match `id` or `null`

### createDirectConversation(supabase, currentUserId, targetUserId) -> Promise<string>

> IMPORTANT: both IDs must be `user_profile.id` (Supabase Auth `user.id`). NOT `creator.id`.

1. INSERT `conversation` with `type: "private", created_by: currentUserId` — get `id`
2. INSERT `conversation_participant` with `conversation_id: id, user_id: currentUserId`
3. INSERT `conversation_participant` with `conversation_id: id, user_id: targetUserId`
4. Return `id`

### createGroup(supabase, name, isPublic, creatorUserId) -> Promise<string>

> IMPORTANT: `creatorUserId` = Supabase Auth `user.id` = `user_profile.id`. NOT `creator.id`.

1. INSERT `community_group` with `{ name, is_public, creator_id: creatorUserId }` — get `group_id`.
2. INSERT `conversation` with `{ type: "creator_group", name, created_by: creatorUserId, community_group_id: group_id }` — get `conv_id`. This requires the DB migration from Task 1.
3. INSERT `conversation_participant` with `{ conversation_id: conv_id, user_id: creatorUserId }`.
4. Return `conv_id`.

**Verification:** `npm run build` — no TypeScript errors in this file.

---

## Task 3: Translations

Files: `messages/fr.json` and `messages/en.json`

Expand the existing `"chat"` object. Keep all existing keys (title, noConversations, noConversationsHint, yesterday).

**New keys to add (FR / EN):**

```
loading:               "Chargement..."                                    / "Loading..."
error:                 "Une erreur est survenue"                          / "Something went wrong"
newConversation:       "Nouvelle conversation"                            / "New conversation"
startDirect:           "Démarrer une conversation"                        / "Start a conversation"
createGroup:           "Créer un groupe"                                  / "Create a group"

tabs.all:              "Tous"                / "All"
tabs.groups:           "Groupes"             / "Groups"
tabs.direct:           "Direct"              / "Direct"

groups.search:         "Rechercher un groupe..."          / "Search groups..."
groups.filterAll:      "Tous"                / "All"
groups.filterPublic:   "Public"              / "Public"
groups.filterPrivate:  "Privé"               / "Private"
groups.sortActivity:   "Activité"            / "Activity"
groups.sortName:       "Nom"                 / "Name"
groups.empty:          "Aucun groupe"        / "No groups"
groups.groupName:      "Nom du groupe"       / "Group name"
groups.visibility:     "Visibilité"          / "Visibility"
groups.public:         "Public"              / "Public"
groups.private:        "Privé"               / "Private"
groups.create:         "Créer"               / "Create"

direct.search:         "Rechercher un créateur..."        / "Search creators..."
direct.sortName:       "Nom"                 / "Name"
direct.sortFollowers:  "Abonnés"             / "Followers"
direct.empty:          "Aucune conversation directe"      / "No direct conversations"
direct.emptyHint:      "Démarre une conversation avec un autre créateur." / "Start a conversation with another creator."
direct.startConversation: "Démarrer"         / "Start"
```

**Verification:** `npm run build` passes (next-intl errors on missing keys).

---

## Task 4: components/creator/chat/ConversationList.tsx

Create new file. `"use client"`.

**First:** Extract `useFormatTime` to `lib/utils/formatTime.ts` (copy logic from current `chat/page.tsx`).

**Props:** `{ conversations: ConversationListItem[] }`

Renders a `<ul>`. Each item is a next-intl `<Link href="/chat/[id]">`.

Row contents:
- Avatar (`w-11 h-11 rounded-full`): if `creator_group` and `community_group.cover_url` exists show `<img>`; else emoji (group: 💬, other: 👤)
- Name: `conv.name` fallback `"Conversation #" + id.slice(0,8)`
- Timestamp: `formatTime(conv.updated_at)`
- Orange unread dot if `conv.unread === true`

Styling: match existing `ConversationRow` in `chat/page.tsx`:
`flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30`

**Verification:** TypeScript compiles.

---

## Task 5: components/creator/chat/GroupsTab.tsx

Create new file. `"use client"`. Uses TanStack Query.

**Props:** `{ userId: string }`

**State:** `search` (string, default ""), `filter` ("all"|"public"|"private", default "all"), `sort` ("activity"|"name", default "activity")

**Data:**
```ts
const { data, isLoading } = useQuery({
  queryKey: ["conversations", "groups", userId],
  queryFn: () => getConversations(supabase, userId, "creator_group"),
});
```

**Derived list (client-side filtering on fetched data):**
1. If search non-empty: keep items where `name.toLowerCase().includes(search.toLowerCase())`
2. If filter is "public" or "private" AND item has `community_group`: filter by `community_group.is_public`
3. Sort: `updated_at DESC` (activity) or `name ASC` (name)

**UI:**
- Search input: `t("groups.search")` placeholder
- Filter chips (shadcn `Button` variant="outline", active = `border-primary text-primary`): All / Public / Private
  — hide Public/Private chips if no item has `community_group` data
- Sort shadcn `Select`: Activity / Name
- Loading → spinner; Empty → `t("groups.empty")`; Has data → `<ConversationList conversations={filtered} />`

**Verification:** TypeScript compiles.

---

## Task 6: components/creator/chat/DirectTab.tsx

Create new file. `"use client"`. Uses TanStack Query.

**Props:** `{ userId: string; onNewConversation: () => void }`

**Data:**
```ts
const { data, isLoading } = useQuery({
  queryKey: ["conversations", "direct", userId],
  queryFn: () => getConversations(supabase, userId, "private"),
});
```

**UI:**
- Loading → spinner
- Empty → `t("direct.empty")`, `t("direct.emptyHint")`, button `t("direct.startConversation")` → `onNewConversation()`
- Has data → `<ConversationList conversations={data} />`

**Verification:** TypeScript compiles.

---

## Task 7: components/creator/chat/NewConversationModal.tsx

Create new file. Uses shadcn/ui `Dialog`.

**Props:** `{ open: boolean; onClose: () => void; onSelectDirect: () => void; onSelectGroup: () => void }`

**UI:** `Dialog` with `DialogTitle` = `t("newConversation")`, two large stacked buttons:
1. `t("startDirect")` → `onSelectDirect()`
2. `t("createGroup")` → `onSelectGroup()`

**Verification:** TypeScript compiles.

---

## Task 8: components/creator/chat/CreatorSearchModal.tsx

Create new file. `"use client"`. shadcn/ui `Dialog` + TanStack Query.

**Props:** `{ open: boolean; onClose: () => void; currentUserId: string }`

**State:** `search` (string), `sort` ("name"|"fan_count", default "name"), `navigating` (boolean)

**Data:**
```ts
const { data, isLoading } = useQuery({
  queryKey: ["creators", search, sort],
  queryFn: () => getCreators(supabase, search, sort),
});
```

**On creator row click (async):**
1. `setNavigating(true)`
2. `existingId = await getExistingDirectConversation(supabase, currentUserId, creator.user_id)`
3. If found: `router.push("/chat/" + existingId); onClose()`
4. Else: `newId = await createDirectConversation(supabase, currentUserId, creator.user_id); router.push("/chat/" + newId); onClose()`
5. `setNavigating(false)` in `finally`

**UI:**
- Search input: `t("direct.search")`
- Sort toggle: Name / Followers
- Scrollable creator list: avatar, `display_name`, `@username`, `fan_count`
- Spinner overlay + disabled buttons when `navigating === true`

Use `useRouter` from `@/lib/i18n/navigation`.

**Verification:** TypeScript compiles.

---

## Task 9: components/creator/chat/CreateGroupModal.tsx

Create new file. `"use client"`. shadcn/ui `Dialog` + React Hook Form + Zod.

**Props:** `{ open: boolean; onClose: () => void; currentUserId: string }`

**Schema:** `z.object({ name: z.string().min(1).max(80), isPublic: z.boolean().default(true) })`

**On valid submit:**
1. `newId = await createGroup(supabase, data.name, data.isPublic, currentUserId)`
2. `router.push("/chat/" + newId)`
3. `onClose(); reset()`

**UI:**
- Input: label `t("groups.groupName")`
- shadcn `Switch`: label `t("groups.visibility")`, shows `t("groups.public")` / `t("groups.private")`
- Submit: `t("groups.create")`, disabled + spinner while submitting

**Verification:** TypeScript compiles.

---

## Task 10: Refactor app/[locale]/(creator)/chat/page.tsx

Rewrite entire file as tabbed shell. Keep `"use client"`.

**New imports:**
- `useSearchParams` from `next/navigation`
- `useRouter` from `@/lib/i18n/navigation`
- `useQuery` from `@tanstack/react-query`
- `getConversations` from `@/lib/queries/chat`
- `ConversationList` from `@/components/creator/chat/ConversationList`
- `GroupsTab`, `DirectTab`, `NewConversationModal`, `CreatorSearchModal`, `CreateGroupModal`

**State:**
```ts
const searchParams = useSearchParams();
const router = useRouter();
const activeTab = (searchParams.get("tab") ?? "all") as "all" | "groups" | "direct";
const [newConvOpen, setNewConvOpen] = useState(false);
const [directOpen, setDirectOpen] = useState(false);
const [groupOpen, setGroupOpen] = useState(false);
```

**Tab switch:** `router.push("/chat?tab=" + tab, { scroll: false })`

**AllTab (inline query):**
```ts
const { data: allConvs, isLoading } = useQuery({
  queryKey: ["conversations", "all", user?.id],
  queryFn: () => getConversations(supabase, user!.id),
  enabled: !!user?.id && activeTab === "all",
});
```

**JSX layout:**
```
Header row:
  left  → <h1>{t("title")}</h1>
  right → <button onClick={() => setNewConvOpen(true)}>+</button>  (aria-label = t("newConversation"))

Tab bar: 3 buttons with active indicator (border-b-2 border-primary text-primary):
  t("tabs.all") | t("tabs.groups") | t("tabs.direct")

Tab content:
  "all"    → AllTab: <ConversationList> or loading spinner or empty state
  "groups" → <GroupsTab userId={user.id} />
  "direct" → <DirectTab userId={user.id} onNewConversation={() => { setNewConvOpen(false); setDirectOpen(true); }} />

Modals at bottom of return:
  <NewConversationModal
    open={newConvOpen} onClose={() => setNewConvOpen(false)}
    onSelectDirect={() => { setNewConvOpen(false); setDirectOpen(true); }}
    onSelectGroup={() => { setNewConvOpen(false); setGroupOpen(true); }} />
  <CreatorSearchModal
    open={directOpen} onClose={() => setDirectOpen(false)}
    currentUserId={user?.id ?? ""} />
  <CreateGroupModal
    open={groupOpen} onClose={() => setGroupOpen(false)}
    currentUserId={user?.id ?? ""} />
```

**Remove from file:** `loadConversations`, `ConversationRow`, `EmptyState`, `useFormatTime`, old useState/useEffect for conversations.

**Check** `app/[locale]/layout.tsx` — if `QueryClientProvider` already exists in `<Providers>`, no change needed.

**Verification:**
- All three tabs render without errors
- URL updates to `?tab=groups` when Groups tab is clicked
- `+` button opens `NewConversationModal`

---

## Task 11: Fix back navigation in app/[locale]/(creator)/chat/[id]/page.tsx

Targeted edits only. Do NOT touch message-sending or Realtime logic.

**Change 1 — Add state:**
```ts
const [conversationType, setConversationType] = useState<string | null>(null);
```

**Change 2 — Update conversation fetch from `.select("resume")` to `.select("name, type")`**

**Change 3 — Update `.then` callback:**
```ts
setConversationTitle(data?.name ?? null);   // was data?.resume
setConversationType(data?.type ?? null);
```

**Change 4 — Fix back button handler (was `router.push("/dashboard/chat")`):**
```ts
const backPath = conversationType === "creator_group" ? "/chat?tab=groups"
  : conversationType === "private" ? "/chat?tab=direct"
  : "/chat";
router.push(backPath);
```

**Change 5 — Replace hardcoded "Fan" label with dynamic typeLabel:**
```ts
const typeLabel = conversationType === "creator_group" ? "Groupe"
  : conversationType === "private" ? "Direct"
  : conversationType === "support" ? "Support"
  : "Conversation";
```

> NOTE: Do NOT fix `chat_message` column issues — pre-existing debt outside this plan.

**Verification:** Back button from group conversation returns to `/chat?tab=groups`.

---

## Final Verification Checklist

- [ ] `npm run build` — zero TypeScript errors
- [ ] DB: `community_group_id` column confirmed on `conversation` table
- [ ] All three tabs (All, Groups, Direct) render without console errors
- [ ] `+` button opens `NewConversationModal` with two options
- [ ] Creating group: DB rows created, navigates to `/chat/[new_id]`
- [ ] DM with existing creator: opens existing conversation thread
- [ ] DM with new creator: creates conversation, navigates to `/chat/[new_id]`
- [ ] Back from group thread → `/chat?tab=groups`
- [ ] Back from direct thread → `/chat?tab=direct`
- [ ] FR and EN translations display correctly

---

## Implementation Notes

- `creator.user_id` (NOT `creator.id`) for all `conversation_participant` inserts
- `community_group.creator_id` also takes `user_profile.id` (NOT `creator.id`)
- `chat_message.group_id` exists in schema — verify at runtime if group messages must populate it
- `conversation.resume` does not exist in live schema — this plan uses `conversation.name`
- Only Task 11 touches `/chat/[id]/page.tsx` — change only navigation and title fetch
