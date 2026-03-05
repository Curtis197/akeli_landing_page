# Community Pages Specification

> Pages: Community, Chat Page, Group Page, User Profile, Dashboard/Recap

---

## Page 8 — Community

**Route:** `/community` · `CommunityWidget`
**Bottom Tab:** Tab 4
**MVP file:** `lib/community/community_widget.dart`

### Purpose
Hub for all social features — private conversations and group chats — with search, pending requests, and group creation.

### UI Layout

```
┌─────────────────────────────────┐
│        Discussion               │  ← AppBar, 28px primary text
├─────────────────────────────────┤
│  [Conversation] [Groupe]        │  ← TabBar (paid plan only)
├─────────────────────────────────┤
│                                 │
│  TAB 1: CONVERSATION            │
│  ┌─────────────────────────┐   │
│  │ 🔍 Chercher une conv... │   │  ← Search field
│  └─────────────────────────┘   │
│                                 │
│  Demandes                       │
│  ┌────────────────────────┐    │
│  │ [Avatar] Username  [✓][✕]│  │  ← Pending requests list
│  │ description text       │    │
│  └────────────────────────┘    │
│                                 │
│  Conversations                  │
│  [ChatUserWidget × n]           │  ← Real-time stream
│                                 │
│  TAB 2: GROUPE                  │
│  ┌─────────────────────────┐   │
│  │ 🔍 Chercher un groupe.. │   │
│  └─────────────────────────┘   │
│  ○ Tous   ○ Participant         │  ← Radio buttons
│  [+ Créer un groupe]           │
│  ┌─────────────────────────┐   │
│  │[🖼] Group Name    [→]   │   │  ← Group cards
│  │     description         │   │
│  └─────────────────────────┘   │
│  (repeat × n)                   │
├─────────────────────────────────┤
│  [Upgrade banner — free plan]   │  ← Only if no paid plan
└─────────────────────────────────┘
```

**AppBar:** "Discussion" title (28px, `headlineMedium`, primary color), centered

**Paid Plan Gate:** If user does not have active subscription → show upgrade message with "Mettre à jour" button → `/paymentSubscription`

**TabBar (2 tabs — paid only):**
- "Conversation" tab
- "Groupe" tab

---

**TAB 1 — Conversations:**

**Search Field:**
- Hint: "Chercher une conversation"
- Suffix: 🔍 icon button → executes `SearchAPrivateConversationCall`
- Results replace stream list while in search mode

**Demandes (Pending requests):**
- `FutureBuilder` on `conversation_demand` where `destined_user_id = userId`
- Each row: 50×50px avatar, username, description text, ✓ approve button (tertiary), ✕ delete button (error color)
- Approve tap → `FindOrCreateTheConversationCall` → navigate to `/chatPage`
- Delete tap → `conversation_demand.delete()` → refresh

**Conversations List:**
- `StreamBuilder` on `conversation_participant` stream (real-time)
- Filter: `user_id = userId`, `conversation.grouped = false`
- Each item: `ChatUserWidget` component
- Search results override when `_model.inSearch == true`

---

**TAB 2 — Groupes:**

**Search Field:** hint "Chercher un groupe" → `SearchAGroupCall` or `SearchAGroupByNameCall`

**Filter Radio:** "Tous" (all groups) / "Participant" (user's groups only)

**"+ Créer un groupe" Button:** primary border button → opens `GroupCreationWidget` modal (450px height)

**Group Cards:**
- If "Tous": `FutureBuilder` on `chat_conversation` where `grouped = true`
- If "Participant": `FutureBuilder` on `conversation_group` where user is requester
- Each card: 50×50px group image (or placeholder), group name (`labelLarge`), description (`labelSmall`), → icon
- Tap card → `CheckIfAUserIsInAGroupCall`:
  - Member → navigate to `/chatPage` with conversation
  - Not member → navigate to `/groupPage` for join flow

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `users` | `.eq('user_id', userId).single()` | Subscription check |
| `conversation_demand` | `.eq('destined_user_id', userId)` | Pending requests |
| `conversation_participant` | stream, `.eq('user_id', userId)` | Real-time conversations |
| `chat_conversation` | `.eq('grouped', true)` | All groups |
| `conversation_group` | `.eq('requester_id', userId)` | User's groups |

**Edge Functions:**

| Call | When |
|------|------|
| `SearchAPrivateConversationCall` | Search conversations by name |
| `FindOrCreateTheConversationCall` | Approve request / create new conversation |
| `SearchAGroupCall` | Search all groups |
| `SearchAGroupByNameCall` | Search user's groups |
| `CheckIfAUserIsInAGroupCall` | Check membership before navigate |

### User Interactions

| Action | Result |
|--------|--------|
| Switch tab | Show conversations or groups |
| Type in conv. search | `SearchAPrivateConversationCall` on search icon tap |
| Tap approve (✓) request | `FindOrCreateTheConversationCall` → navigate to `/chatPage` |
| Tap delete (✕) request | Delete from `conversation_demand` |
| Tap conversation item | Navigate to `/chatPage` with conversation data |
| Toggle "Tous/Participant" | Filter group list |
| Tap "+ Créer un groupe" | Open `GroupCreationWidget` modal |
| Type in group search | Search with appropriate call |
| Tap group card | Check membership → `/chatPage` or `/groupPage` |

### Navigation

- **Arrives from:** Bottom nav tab 4
- **Goes to:** `/chatPage`, `/groupPage`, `/paymentSubscription`

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `_model.tabBarController` | `TabController` | Active tab |
| `_model.inSearch` | `bool` | Search mode flag |
| `_model.participation` | `bool` | Tous vs Participant filter |
| `_model.convSearchTextController` | `TextEditingController` | Conversation search input |
| `_model.groupSearchTextController` | `TextEditingController` | Group search input |
| `_model.privateConversation` | API response | Conversation search results |
| `_model.filterGroup` | API response | Group search results |

### Embedded Components

- `ChatUserWidget` (real-time conversation list items)
- `GroupCreationWidget` (modal)

### V1 Changes

- Fix `ChatNotiificationCall` → `ChatNotificationCall` (typo in name)
- Fix `SearchAPrivateConversationCall` vs `SearchAConversationCall` — keep one, delete the other
- Fix `SearchAGroupByNameCall` vs `SearchAGroupCall` — audit and keep one
- Add unread message badge count to conversation items
- Add empty state for each tab (no conversations yet, no groups yet)
- Real-time stream for group list (currently FutureBuilder — misses new groups created by others)

---

## Page 9 — Chat Page

**Route:** `/chatPage` · `ChatPageWidget`
**MVP file:** `lib/chat_page/chat_page_widget.dart`

### Purpose
Real-time messaging interface for both private 1-on-1 conversations and group chats.

### UI Layout

```
┌─────────────────────────────────┐
│ ← [Avatar] {Name/Group}         │  ← AppBar, primary bg
├─────────────────────────────────┤
│                                 │
│  [ChatWidget — other user]      │  ← Message bubble, left-aligned
│                                 │
│         [ChatWidget — self]     │  ← Message bubble, right-aligned
│                                 │
│  [ChatWidget — other user]      │
│                                 │
│  (messages in reverse order,    │
│   newest at bottom)             │
│                                 │
├─────────────────────────────────┤
│  ┌───────────────────┐ [Send►] │  ← Input row
│  │ Message...        │         │
│  └───────────────────┘         │
└─────────────────────────────────┘
```

**AppBar (primary background, elevation 2):**
- Left: `arrow_back_rounded` back button
- Center (1-on-1 chat): 30×30px user avatar + username tap → `/userprofile` with that user's data
- Center (group chat): 30×30px group image + group name tap → `/groupPage`

**Message List:**
- `StreamBuilder` on `chat_message` table ordered by `created_at`, filtered by `conversation_id`
- Newest messages appear at bottom (reversed ListView)
- Each message: `ChatWidget` component (handles own vs other user layout)

**Input Row:**
- `TextFormField` — message input, no explicit hint
- Send button: 40×40px rounded icon button, primary background, send icon
- On send: insert to `chat_message`, update `chat_conversation.last_message_content` + `last_message_time`, call `ChatNotificationCall` (delayed 500ms)

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `users` | `.eq('user_id', userId).single()` | Current user |
| `chat_conversation` | from widget param | Conversation metadata |
| `conversation_participant` | `.eq('conversation_id', convId)` | Other participants info |
| `chat_message` | stream, `.eq('conversation_id', convId).order('created_at')` | Real-time messages |
| `conversation_group` | `.eq('conversation_id', convId)` | Group info (if grouped) |

**Edge Function:**
- `ChatNotificationCall` — called 500ms after message send
  - Params: `conversationId`, `senderId`, `messageId`, `messageContent`

### User Interactions

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Tap header (1-on-1) | Navigate to `/userprofile` |
| Tap header (group) | Navigate to `/groupPage` |
| Type message | Updates text controller |
| Tap send | Insert `chat_message`, update conversation, call notification |
| Scroll up | Load older messages |

### Navigation

- **Arrives from:** Community, User Profile, Group Page
- **Goes to:** `/userprofile` (from header tap in 1-on-1), `/groupPage` (from header tap in group)

### Widget Parameters

| Param | Type | Required | Purpose |
|-------|------|----------|---------|
| `conversation` | `ChatConversationRow` | Yes | The conversation to display |
| `destinedUserId` | `int` | No | For 1-on-1 chat, the other user's ID |
| `conversationParticipant` | `ConversationParticipantRow` | No | Pre-loaded participant data |

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `_model.textController` | `TextEditingController` | Message input |
| `_model.convPart` | `List<ConversationParticipantRow>` | Participant data |
| `_model.convUsers` | `List<UsersRow>` | User info for participants |
| `_model.newMessage` | `ChatMessageRow?` | Inserted message row |

### Embedded Components

- `ChatWidget` — individual message bubble component

### V1 Changes

- Fix `ChatNotiificationCall` → `ChatNotificationCall` (class name typo)
- Add message read receipts (update `chat_message.received = true` on load)
- Add image/media attachment support (long-press keyboard area or attach icon)
- Optimize: only stream latest 50 messages, paginate older messages on scroll
- Add "is typing" indicator via Supabase Realtime presence

---

## Page 10 — Group Page

**Route:** `/groupPage` · `GroupPageWidget`
**MVP file:** `lib/group_page/group_page_widget.dart`

### Purpose
Group detail page — shows group info, description, messages, and join/management options based on membership status.

### UI Layout

```
┌─────────────────────────────────┐
│  [Full-width group image 250px] │
│  {Group Name}  ────────────────┤  ← Overlaid on image bottom
├─────────────────────────────────┤
│  Description                    │
│  "Ce groupe est dédié à..."     │
├─────────────────────────────────┤
│                                 │
│  [If NOT member, NO request:]   │
│  [  Rejoindre  ]                │  ← Primary button
│                                 │
│  [If request SENT:]             │
│  ✓ Demande envoyée              │  ← Tertiary badge
│  [  Annuler demande  ]          │
│                                 │
│  [If IS member:]                │
│  → navigates directly to chat   │
│                                 │
│  [ConversationMessageWidget × n]│  ← Preview messages
│                                 │
│  [Edit/Delete — group admin]    │  ← Admin-only options
└─────────────────────────────────┘
```

**Header:** Full-width group image (250px height), group name overlaid at bottom in `headlineLarge`

**Description:** Centered text (80% width), only visible if `conversation_group.description` is not empty

**Join State (conditional based on membership check):**
- **Not member, no request:** "Rejoindre" primary button
- **Request sent:** tertiary-bordered badge "Demande envoyée" + "Annuler demande" button
- **Is member:** redirect to `/chatPage` or show chat messages inline

**Message Preview:** `ConversationMessageWidget` × n — shows recent group messages

**Admin Controls (if user is group admin):**
- Edit group → `EditGroupWidget` modal
- Delete group → `DeleteGroupWidget` confirmation modal

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `conversation_group` | `.eq('conversation_id', convId).single()` | Group name, image, description |
| `conversation_demand` | `.eq('user_id', uid).eq('conversation_id', convId).maybeSingle()` | Pending join request |
| `conversation_participant` | `.eq('user_id', uid).eq('conversation_id', convId).maybeSingle()` | Membership check |

**Edge Functions:**
- `CheckIfAUserIsInAGroupCall` — initial membership check (params: `userId`, `conversationId`)
- `ConversationRequestCall` — send join request (params: `demandId`, `conversationId`, `grouped: true`, `userId`)

### User Interactions

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Tap group image/header (member) | Navigate to `/chatPage` |
| Tap "Rejoindre" | Insert `conversation_demand` + call `ConversationRequestCall` → refresh |
| Tap "Annuler demande" | Delete from `conversation_demand` → refresh |
| Tap Edit (admin) | Open `EditGroupWidget` modal |
| Tap Delete (admin) | Open `DeleteGroupWidget` confirmation |

### Navigation

- **Arrives from:** Community (non-member tap on group)
- **Goes to:** `/chatPage` (when member or after join approval)

### Widget Parameters

| Param | Type | Required |
|-------|------|----------|
| `conversation` | `ChatConversationRow` | Yes |

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `_model.groupDemand` | `ConversationDemandRow?` | Created join request |
| `_model.requestCompleter1/2/3` | `Completer` | Refresh triggers |

### Embedded Components

- `ConversationMessageWidget`
- `EditGroupWidget` (modal)
- `DeleteGroupWidget` (modal)

### V1 Changes

- Fix `ConversationRequestCall` — verify it sends notification to group admin
- Add member count display (from `conversation_participant.count()`)
- Add group admin badge/label
- After "Rejoindre" is tapped, show confirmation toast and disable button immediately (not just on refresh)

---

## Page 11 — User Profile

**Route:** `/userprofile` · `UserprofileWidget`
**MVP file:** `lib/userprofile/userprofile_widget.dart`

### Purpose
View another user's (or your own) profile — with messaging CTA, conversation management, and user content tabs.

### UI Layout

```
┌─────────────────────────────────┐
│  ┌─────────────────────────┐   │
│  │  [Profile Image 150×150]│   │  ← Circular, secondary border
│  └─────────────────────────┘   │
│         {Username}              │  ← headlineSmall
├─────────────────────────────────┤
│  ╔═════════════════════════╗   │
│  ║  [Ajouter] or [Ecrire]  ║   │  ← Only when viewing OTHERS
│  ║  [Quitter la conv.]     ║   │
│  ║─────────────────────────║   │
│  ║ [Recettes] [Galerie] [Avis]║ │  ← 3-tab bar
│  ║─────────────────────────║   │
│  ║  (tab content area)     ║   │
│  ╚═════════════════════════╝   │
└─────────────────────────────────┘
```

**Top Section:** Circular profile image (150×150, secondary color 2px border) from `users.profil_image_url` · username in `headlineSmall`

**Action Buttons (only when viewing another user's profile):**
- **No conversation:** "Ajouter" (outlined primary) → insert `conversation_demand` + call `ConversationRequestCall`
- **Request pending:** badge "Demande envoyée" (disabled state)
- **Conversation exists:** "Écrire" (text primary) → navigate to `/chatPage` · "Quitter la conversation" (secondary) → delete all messages + conversation

**TabBar (3 tabs):**
1. **Recettes** — User's created recipes (from `receipe` where `creator_id = user.id`)
2. **Galerie** — User's uploaded photos (from `creator_image`)
3. **Avis** — User's recipe reviews/ratings

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `users` | from widget param (pre-loaded) | Target user data |
| `conversation_participant` | `.eq('user_id', uid)` × both users | Find shared conversation |
| `chat_conversation` | `.eq('id', convId).single()` | Conversation metadata |
| `conversation_demand` | `.eq('user_id', uid).eq('destined_user_id', targetId)` | Pending request check |
| `receipe` | `.eq('creator_id', targetUserId)` | User's recipes (tab 1) |
| `creator_image` | `.eq('creator_id', targetUserId)` | User's gallery (tab 2) |

**Edge Functions:**
- `SearchAConversationCall` — find existing conversation between two users
- `ConversationRequestCall` — send a chat request

### User Interactions

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Tap "Ajouter" | Insert `conversation_demand` + call request edge function |
| Tap "Écrire" | Navigate to `/chatPage` with existing conversation |
| Tap "Quitter" | Delete `chat_message` rows + `conversation_participant` + `chat_conversation` → refresh |
| Switch tabs | Load recipes / gallery / reviews |
| Tap recipe card | Navigate to `/receipeDetail/:id` |

### Navigation

- **Arrives from:** Community (conversation list), Chat Page header, Home (avatar tap for own profile)
- **Goes to:** `/chatPage`, `/receipeDetail/:id`

### Widget Parameters

| Param | Type | Required |
|-------|------|----------|
| `users` | `UsersRow` | Yes |

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `_model.tabBarController` | `TabController(length: 3)` | Active tab |
| `_model.privateConv` | list | Matched private conversations |
| `_model.newDemand` | `ConversationDemandRow?` | Created request |

### V1 Changes

- Viewing own profile (from Home avatar tap): hide action buttons, show "Modifier profil" instead
- Add follower/following count display if social graph expands
- Tab 1 (Recettes): add recipe cards consistent with recipe discovery list
- Empty states for all 3 tabs

---

## Page 12 — Dashboard / Recap

**Route:** `/dash` · `DashWidget`
**MVP file:** `lib/dash/dash_widget.dart`

### Purpose
Daily and weekly health activity summaries — caloric intake, macros consumed, and historical progress.

### UI Layout

```
┌─────────────────────────────────┐
│ ←   Récapitulatif               │  ← AppBar, primary bg, headlineMedium
├─────────────────────────────────┤
│  [Journalier] [Hebdomadaire]    │  ← TabBar (2 tabs)
├─────────────────────────────────┤
│                                 │
│  TAB 1: JOURNALIER              │
│  [DailyRecapCopyWidget]         │  ← Only if NO data for today
│  ─── or ───                     │
│  [DailyRecapWidget × n]         │  ← Historical daily records
│  (scrollable list)              │
│                                 │
│  TAB 2: HEBDOMADAIRE            │
│  [WeeklyIntWidget]              │  ← Only if NO data for this week
│  ─── or ───                     │
│  [WeeklyIntCopyWidget × n]      │  ← Historical weekly records
│  (scrollable list)              │
│                                 │
└─────────────────────────────────┘
```

**AppBar:** primary background, `arrow_back_rounded` back button, "Récapitulatif" title (`headlineMedium`, `secondaryBackground` color)

**TabBar (2 tabs):**
- "Journalier" (Daily) — 30px top padding
- "Hebdomadaire" (Weekly)

**Tab 1 — Daily:**
- `FutureBuilder` checking if today's entry exists in `daily_user_track`
- **No entry today:** show `DailyRecapCopyWidget` (empty/prompt state)
- **Entry exists:** `ListView` of `DailyRecapWidget` for past records (ordered by date, newest first)

**Tab 2 — Weekly:**
- `FutureBuilder` checking if current week exists in `weekly_user_track`
- **No entry this week:** show `WeeklyIntWidget` (empty/prompt state)
- **Entry exists:** `ListView` of `WeeklyIntCopyWidget` for past weeks

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `daily_user_track` | `.eq('user_id', uid).eq('date', today).maybeSingle()` | Today check |
| `daily_user_track` | `.eq('user_id', uid).lte('date', today).order('date', ascending: false)` | History list |
| `weekly_user_track` | `.eq('user_id', uid)`, current week date range | Week check |
| `weekly_user_track` | `.eq('user_id', uid).order('start_date', ascending: false)` | History list |

No edge function calls.

### User Interactions

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Switch tab | Show daily or weekly view |
| Scroll | View historical records |
| Tap recap card | (Handled inside `DailyRecapWidget` / `WeeklyIntCopyWidget`) |

### Navigation

- **Arrives from:** Home (weight graph tap)
- **Goes back to:** previous screen (pop)

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `_model.tabBarController` | `TabController(length: 2)` | Active tab |

### Embedded Components

- `DailyRecapWidget` — daily summary card
- `DailyRecapCopyWidget` — empty daily state (V1: rename, merge, or clarify purpose)
- `WeeklyIntWidget` — empty weekly state (V1: rename, clarify)
- `WeeklyIntCopyWidget` — weekly summary card (V1: rename to `WeeklyRecapWidget`)

### V1 Changes

- **Rename components:** `DailyRecapCopyWidget` → `DailyRecapEmptyWidget`, `WeeklyIntCopyWidget` → `WeeklyRecapWidget`, `WeeklyIntWidget` → `WeeklyRecapEmptyWidget`
- Delete `daily_recap_copy_widget.dart` (or consolidate) — the `_copy_` naming is confusing
- Add actual data visualization inside recap cards (bar charts, macro rings)
- Link from recap cards to the corresponding meal for that day
