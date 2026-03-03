# Settings Pages Specification

> Pages: Profile Settings, Edit Info, Create/Edit Profile, Payment & Subscription, Notifications, Notification Settings, Support, Referral

---

## Page 17 — Profile Settings

**Route:** `/profileSetting` · `ProfileSettingWidget`
**Auth Required:** Yes
**MVP file:** `lib/profil_management/profile_setting/profile_setting_widget.dart`

### Purpose
Central settings hub — user account summary with navigation to all settings sub-pages and logout.

### UI Layout

```
┌─────────────────────────────────┐
│ ←                               │  ← AppBar, secondaryBackground
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │  ← Tappable profile card
│  │  [Avatar 90×90]         │   │
│  │  {Username}             │   │
│  │  {email}                │   │
│  └─────────────────────────┘   │
│                                 │
│  [  Se déconnecter  ]          │  ← Logout button, primary color
│                                 │
│  ╔═══════════════════════════╗ │
│  ║ 💰 Options d'abonnement   ║ │  ← → /paymentSubscription
│  ╠═══════════════════════════╣ │
│  ║ 🌐 Modifier informations  ║ │  ← → /editInfo
│  ╠═══════════════════════════╣ │
│  ║ 👥 Parrainage             ║ │  ← → /referral
│  ╠═══════════════════════════╣ │
│  ║ 👤 Edition du profil      ║ │  ← → /createEditProfil
│  ╠═══════════════════════════╣ │
│  ║ 🔔 Notifications          ║ │  ← → /notificationSetting
│  ╠═══════════════════════════╣ │
│  ║ ❓ Support                ║ │  ← → /support
│  ╚═══════════════════════════╝ │
│                                 │
│  Mention Légale                 │
│  Politique de Confidentialité   │
│  Conditions générales d'util.   │
└─────────────────────────────────┘
```

**AppBar:** `secondaryBackground` color, back button

**Profile Card (tappable):**
- User avatar (90×90px circular, secondary color border)
- Username (`headlineSmall`)
- Email (`labelMedium`)
- Tap → navigate to `/userprofile` with current user's data

**Logout Button:**
- "Se déconnecter", primary color, 40px height
- Tap → `authManager.signOut()` → navigate to `/authentification`

**Settings List (6 rows):**
Each row: 60px height, `secondaryBackground`, `BoxShadow`, icon + label, → arrow

| Row | Icon | Label | Navigates to |
|-----|------|-------|-------------|
| 1 | `Icons.attach_money` | Options d'abonnement | `/paymentSubscription` |
| 2 | `Icons.language` | Modifier informations | `/editInfo` |
| 3 | `Icons.people` | Parrainage | `/referral` |
| 4 | `Icons.account_circle` | Edition du profil | `/createEditProfil` |
| 5 | `Icons.notifications` | Notifications | `/notificationSetting` |
| 6 | `Icons.help` | Support | `/support` |

**Legal Links (bottom):** Plain text links (currently no navigation — V1 should link to `/cgu`)

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `users` | `.eq('user_id', uid).single()` | Profile image, name, email |

### User Interactions

| Action | Result |
|--------|--------|
| Tap profile card | Navigate to `/userprofile` (self) |
| Tap logout | Sign out → `/authentification` |
| Tap any settings row | Navigate to that settings page |
| Tap legal links | Navigate to `/cgu` (V1) |
| Tap back | Pop navigation |

### Navigation

- **Arrives from:** Home AppBar ⚙ icon, bottom nav long-press (optional)
- **Goes to:** All settings sub-pages, `/userprofile`, `/authentification`

### V1 Changes

- Wire legal text links to `/cgu`
- Add app version number at very bottom
- Add language selector option (to change app language from the 6 supported)
- Show subscription status indicator (free vs paid) on subscription row

---

## Page 18 — Edit Info

**Route:** `/editInfo` · `EditInfoWidget`
**Auth Required:** Yes
**MVP file:** `lib/edit_info/edit_info_widget.dart`

### Purpose
Edit health parameters and daily calorie targets — the primary page for updating the user's physical stats and nutrition goals.

### UI Layout

```
┌─────────────────────────────────┐
│ ←                               │  ← AppBar
├─────────────────────────────────┤
│  Modifier vos informations      │  ← centered heading
│                                 │
│  ╔═══════════════════════════╗ │
│  ║ 😊 Vos paramètres         ║ │
│  ║─────────────────────────── ║ │
│  ║ Votre Âge                 ║ │
│  ║ [28      ] [  ]           ║ │  ← Two text fields per param
│  ║ Votre Poids               ║ │
│  ║ [75 kg   ] [  ]           ║ │
│  ║ Votre Taille              ║ │
│  ║ [175 cm  ] [  ]           ║ │
│  ║ Poids Cible               ║ │
│  ║ [70 kg   ] [  ]           ║ │
│  ║ Objectif                  ║ │
│  ║ [Perdre poids ] [  ]      ║ │
│  ║ Régime particulier        ║ │
│  ║ [Aucun        ]           ║ │
│  ╚═══════════════════════════╝ │
│                                 │
│  ╔═══════════════════════════╗ │
│  ║ Calories journalières     ║ │
│  ║─────────────────────────── ║ │
│  ║ Total: 1850 kcal          ║ │
│  ║ Petit-Déjeuner: [450]     ║ │
│  ║ Déjeuner:      [600]      ║ │
│  ║ Dîner:         [550]      ║ │
│  ║ Collation:     [250]      ║ │
│  ╚═══════════════════════════╝ │
│                                 │
│  [       Enregistrer         ]  │  ← Floating save button (50px from bottom)
└─────────────────────────────────┘
```

**AppBar:** back button, no title

**Heading:** "Modifier vos informations" (centered)

**Section 1 — Health Parameters** (`primaryBackground` container):
- `Icons.face_sharp` icon + "Vos paramètres" heading
- Each parameter has 2 `TextFormField` slots (unclear purpose of pair — may be current vs target, or just one used):
  - **Âge** — numeric
  - **Poids** — numeric (kg)
  - **Taille** — numeric (cm)
  - **Poids Cible** — numeric (kg)
  - **Objectif** — text (fitness goal description)
  - **Régime particulier** — text or dropdown

**Section 2 — Calorie Targets:**
- Heading "Calories journalières"
- Total daily calorie display: `_model.dailyCal` (auto-calculated sum)
- 4 input fields:
  - Petit-Déjeuner: `breakfastCalTextController`
  - Déjeuner: `lunchCalTextController`
  - Dîner: `dinerCalTextController`
  - Collation: `snackCalTextController`
- `_model.totalCal` = sum of the 4 → shown in "Total"

**Save Button:** floating, 50px from bottom, full-width

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `user_health_parameter` | `.eq('user_id', uid).single()` | Pre-fill health data |
| `user_goal` | `.eq('user_id', uid)` | Pre-fill calorie targets |

**On save:**
- `user_health_parameter.update({ age, weight, height, target_weight, objective, diet })` where `user_id = uid`
- `user_goal.update({ target_calorie, breakfast_cal, lunch_cal, dinner_cal, snack_cal })` where `user_id = uid`

### User Interactions

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Edit any field | Update local state |
| Edit calorie field | Auto-recalculate `totalCal` |
| Tap "Enregistrer" | Validate → update Supabase → pop |

### Navigation

- **Arrives from:** Profile Settings
- **Goes to:** Pops to Profile Settings on save

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `_model.requestCompleter2` | `Completer` | Async data load |
| `dailyCal` | `double` | Total calorie target |
| `totalCal` | `double` | Sum of meal cals |
| `ageFocusNode1/2` | `FocusNode` | Age fields |
| `weightFocusNode1/2` | `FocusNode` | Weight fields |
| `heightFocusNode1/2` | `FocusNode` | Height fields |
| `targetWeightFocusNode1/2` | `FocusNode` | Target weight |
| `breakfastCalTextController` | `TextEditingController` | Breakfast cal |
| `lunchCalTextController` | `TextEditingController` | Lunch cal |
| `dinerCalTextController` | `TextEditingController` | Dinner cal |
| `snackCalTextController` | `TextEditingController` | Snack cal |

### V1 Changes

- Clarify the purpose of the 2-field-per-parameter pattern — likely should be single field per parameter
- Add units labels next to fields (kg, cm) visually
- Calorie section: show recommended ranges per meal type based on total target
- Validate numeric inputs on save, not just on form submit

---

## Page 19 — Create / Edit Profile

**Route:** `/createEditProfil` · `CreateEditProfilWidget`
**Auth Required:** Yes
**MVP file:** `lib/create_edit_profil/create_edit_profil_widget.dart`

### Purpose
Edit profile photo and public/private visibility — the profile appearance settings.

### UI Layout

```
┌─────────────────────────────────┐
│  ← Créer / Mettre à jour profil │  ← AppBar, 100px height
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │  [Profile Image 100×100]│   │  ← Circular, 2px alternate border
│  └─────────────────────────┘   │
│                                 │
│  [  Ajouter une image  ]        │  ← 40px button
│                                 │
│  [✓] Profil public              │  ← SwitchListTile
│                                 │
│  [Votre prénom]                 │  ← (may have name fields below)
│  [Votre nom]                    │
│                                 │
│  [       Enregistrer         ]  │
└─────────────────────────────────┘
```

**AppBar:** 100px flexibleSpace height, back button (50×50), "Créer / Mettre à jour mon profil" title

**Profile Image Section:**
- 100×100px circular container, 2px `alternate` color border
- Shows current `users.profil_image_url` (via `CachedNetworkImage`) or selected local image (`Image.memory`)
- Tap image or "Ajouter une image" button → `selectMediaWithSourceBottomSheet()`:
  - Options: Camera / Galerie
  - Validates format via `validateFileFormat()`
  - Sets `uploadedLocalFile_uploadDataJr7` (FFUploadedFile)
  - Sets `isDataUploading_uploadDataJr7 = true` during processing

**Public Profile Toggle:**
- `SwitchListTile` — "Profil public" label
- On change: `users.update({ public: value })` immediately

**Name Fields** (if present):
- `yourNameTextController1` — first name
- `yourNameTextController2` — last name

**Save Button:** on tap — upload image to Supabase Storage → update `users.profil_image_url` + `name`

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `users` | `.eq('user_id', uid).single()` | Current profile data |

**On save:**
- Upload image to Supabase Storage bucket
- `users.update({ profil_image_url: storageUrl, name: name, public: switchValue })`

### User Interactions

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Tap image / "Ajouter" | Image picker bottom sheet |
| Select photo | Preview in circle, `isDataUploading = true` |
| Toggle public switch | Immediate DB update |
| Tap "Enregistrer" | Upload photo → update user record |

### Navigation

- **Arrives from:** Profile Settings
- **Goes to:** Pops to Profile Settings

### V1 Changes

- Add image crop/resize before upload (use `image_cropper` package)
- Add username field (separate from first/last name)
- Show upload progress indicator during image upload
- Preview image before confirming upload

---

## Page 20 — Payment & Subscription

**Route:** `/paymentSubscription` · `PaymentSubscriptionWidget`
**Auth Required:** Yes
**MVP file:** `lib/payment_subscription/payment_subscription_widget.dart`

### Purpose
Subscription plan information, management, and account deletion — currently a MVP stub requiring full implementation in V1.

### UI Layout (Current MVP)

```
┌─────────────────────────────────┐
│ ←   Options d'abonnement        │  ← AppBar
├─────────────────────────────────┤
│  Options d'abonnement           │  ← headlineMedium, weight 500
│                                 │
│  ╔═══════════════════════════╗ │
│  ║ Votre abonnement          ║ │
│  ║ Vous bénéficiez d'un      ║ │
│  ║ accès complet...          ║ │
│  ╚═══════════════════════════╝ │
│                                 │
│  ╔═══════════════════════════╗ │
│  ║ [☐] Supprimer mon compte  ║ │  ← CheckboxListTile
│  ║ Toutes vos données seront ║ │
│  ║ supprimées...             ║ │
│  ╚═══════════════════════════╝ │
│                                 │
│  (Additional sections below)    │
└─────────────────────────────────┘
```

### V1 Target Layout

```
┌─────────────────────────────────┐
│ ←   Abonnement                  │
├─────────────────────────────────┤
│  Statut actuel                  │
│  ╔═══════════════════════════╗ │
│  ║ ✓ ACTIF — Essai gratuit   ║ │  ← or Plan de base / Premium
│  ║ Expire le: 27 Jan 2025    ║ │
│  ╚═══════════════════════════╝ │
│                                 │
│  Choisir un plan                │
│  ╔═══════════════════╗         │
│  ║ Gratuit           ║         │  ← Plan card
│  ║ 0€/mois           ║         │
│  ║ • Recettes        ║         │
│  ╚═══════════════════╝         │
│  ╔═══════════════════╗         │
│  ║ Premium     ★     ║         │  ← Highlighted plan card
│  ║ 4,99€/mois        ║         │
│  ║ • Tout inclus     ║         │
│  ║ [  S'abonner  ]   ║         │
│  ╚═══════════════════╝         │
│                                 │
│  ─────────────────────────────  │
│  Danger Zone                    │
│  [☐] Supprimer mon compte       │
│  [Confirmer suppression]        │
└─────────────────────────────────┘
```

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `users` | `.eq('user_id', uid).single()` | Current user |
| `user_subscription` | `.eq('user_id', uid).single()` | Active subscription |

**On subscribe (V1):**
- Call Stripe SDK to process payment
- On success: `user_subscription.update({ active: true, plan: 'premium', expiry: date })`

**On delete account:**
- `users.delete()` where `user_id = uid`
- `auth.admin.deleteUser(uid)` — Supabase Admin API
- Cascading deletes for all user data

### User Interactions (V1)

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Select plan | Highlight selected plan card |
| Tap "S'abonner" | Launch Stripe payment sheet |
| Payment success | Update subscription record, refresh |
| Check delete account | Enable confirm button |
| Tap confirm deletion | Multi-step confirmation → delete all data → log out |

### V1 Changes

- **Fully implement payment:** Integrate Stripe (via Stripe Flutter SDK or Stripe Checkout URL)
- Define subscription tiers (currently only 1 level in MVP)
- Show current plan status clearly with expiry date
- Implement restore purchase (iOS/Android)
- Implement account deletion properly — currently only a checkbox stub (`print()`)
- Show feature comparison table (Free vs Premium)

---

## Page 21 — Notifications

**Route:** `/notifications` · `NotificationsWidget`
**Auth Required:** Yes
**MVP file:** `lib/profil_management/notifications/notifications_widget.dart`

### Purpose
Central notification inbox — three tabs for meal reminders, chat notifications, and friend/group request notifications.

### UI Layout

```
┌─────────────────────────────────┐
│ ←   Notifications               │  ← AppBar, primary bg
├─────────────────────────────────┤
│  [Repas (3)][Chat (1)][Dem. (2)]│  ← TabBar with live counts
├─────────────────────────────────┤
│                                 │
│  TAB 1 — REPAS                  │
│  [NotificationWidget × n]       │  ← Meal reminder notifications
│                                 │
│  TAB 2 — CHAT                   │
│  [NotificationChatWidget × n]   │  ← Chat message notifications
│                                 │
│  TAB 3 — DEMANDE                │
│  [NotificationDemandWidget × n] │  ← Friend/group request notifs
│                                 │
└─────────────────────────────────┘
```

**AppBar:** primary background, back button, "Notifications" (`headlineLarge`)

**TabBar (3 tabs with live counts):**
- "Repas {n}" — from `total_notifications.meal_count` (real-time stream)
- "Chat {n}" — from `total_notifications.chat_count`
- "Demande {n}" — from `total_notifications.demand_count`

**Tab 1 — Repas:**
- `FutureBuilder` on `meal_notifications` where `user_id = uid`, ordered by `sent_at`
- Each item: `NotificationWidget` component
- Separator: 10px

**Tab 2 — Chat:**
- `FutureBuilder` on `chat_notifications` where `user_id = uid`
- Each item: `NotificationChatWidget` component

**Tab 3 — Demande:**
- `FutureBuilder` on `demand_notifications` where `user_id = uid`
- Each item: `NotificationDemandWidget` component

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `total_notifications` | stream, `.eq('user_id', uid)` | Real-time tab counts |
| `meal_notifications` | `.eq('user_id', uid).order('sent_at')` | Meal reminders |
| `chat_notifications` | `.eq('user_id', uid)` | Chat notifications |
| `demand_notifications` | `.eq('user_id', uid)` | Request notifications |

### User Interactions

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Switch tab | Show corresponding notification type |
| Tap notification item | (Handled inside component — likely navigate) |
| Scroll | View all notifications |

### Navigation

- **Arrives from:** Home AppBar 🔔 icon
- **Goes to:** Depends on notification tap (handled in components)

### V1 Changes

- Add "Mark all as read" button per tab
- Add swipe-to-delete on notifications
- Change tab counts to update in real-time (Supabase stream already in place)
- Empty state for each tab ("Aucune notification")

---

## Page 22 — Notification Settings

**Route:** `/notificationSetting` · `NotificationSettingWidget`
**Auth Required:** Yes
**MVP file:** `lib/notification_setting/notification_setting_widget.dart`

### Purpose
Control which types of notifications the user receives — push, chat, meals, and demand alerts.

### UI Layout

```
┌─────────────────────────────────┐
│ ←   Paramètre de notification   │  ← AppBar (typo in MVP)
├─────────────────────────────────┤
│                                 │
│  Push Notifications             │
│  Recevez vos notif. sur le tél. │
│                              [●]│  ← SwitchListTile
│                                 │
│  Chat Notifications             │
│  Recevez les notif. de vos…    │
│                              [●]│
│                                 │
│  Notification de Repas          │
│                              [○]│
│                                 │
│  (additional toggles below)     │
│                                 │
└─────────────────────────────────┘
```

**AppBar:** "Paramètre de notification" title (note typo: "Paramètre" instead of "Paramètres" — V1 fix)

**Toggle List (SwitchListTile.adaptive):**
Each row: title + subtitle + trailing switch

| Toggle | Default | State var | Description |
|--------|---------|-----------|-------------|
| Push Notifications | `true` | `pushNotificationValue` | Receive push notifications |
| Chat Notifications | `true` | `chatNotificationsValue` | Chat message alerts |
| Notification de Repas | `true` | `mealNotificationValue` | Meal reminder alerts |
| Notifications de Demande | (below) | `demandNotificationValue` | Friend/group requests |

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `notification_preferences` | `.eq('user_id', uid).single()` | Load current settings |

**On toggle:**
- `notification_preferences.update({ push_notifications: val })` (or relevant field) immediately on switch change

### User Interactions

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Toggle switch | Immediate update to `notification_preferences` |

### Navigation

- **Arrives from:** Profile Settings
- **Goes to:** Pops to Profile Settings

### V1 Changes

- Fix AppBar typo: "Paramètre" → "Paramètres"
- Add save button (or confirm immediate-save UX pattern explicitly)
- Add toggle for "Weekly summary" notifications

---

## Page 23 — Support

**Route:** `/support` · `SupportWidget`
**Auth Required:** Yes
**MVP file:** `lib/support/support_widget.dart`

### Purpose
Contact form for submitting support requests, bug reports, or feedback.

### UI Layout

```
┌─────────────────────────────────┐
│ ←                               │  ← AppBar, no title
├─────────────────────────────────┤
│  (16px padding top/sides)       │
│                                 │
│  Votre nom                      │
│  ┌───────────────────────────┐  │
│  │                           │  │  ← TextFormField, 12px rounded
│  └───────────────────────────┘  │
│                                 │
│  Votre mail                     │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  Votre message                  │
│  ┌───────────────────────────┐  │
│  │                           │  │  ← Multiline textarea
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  [        Envoyer           ]   │
└─────────────────────────────────┘
```

**AppBar:** back button, no title visible

**3 TextFormField inputs (all Poppins font, 12px border radius):**
1. "Votre nom" — single line
2. "Votre mail" — email keyboard
3. "Votre message" — multiline textarea

**All field styling:**
- Border: 2px, `alternate` color (enabled), `primary` (focused), `error` (error)
- Padding: 16px
- Fill: `secondaryBackground`
- Label: `labelMedium`, gray color

**Submit button:** "Envoyer", full-width or 230px centered

### Data Sources

On submit: insert to `contact_messages` table:
```
contact_messages.insert({
  user_id: uid,
  name: textController1,
  email: textController2,
  message: textController3,
  created_at: now()
})
```

### User Interactions

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Fill fields | Update controllers |
| Tap "Envoyer" | Validate → insert to `contact_messages` → show success → pop |

### Navigation

- **Arrives from:** Profile Settings
- **Goes to:** Pops on success

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `textController1` | `TextEditingController` | Name input |
| `textController2` | `TextEditingController` | Email input |
| `textController3` | `TextEditingController` | Message input |
| `textFieldFocusNode1/2/3` | `FocusNode` | Focus management |

### V1 Changes

- Remove `print()` debug statements (currently in widget)
- Implement actual submit: insert to `contact_messages` Supabase table
- Show success state after send (green checkmark, "Message envoyé!")
- Pre-fill name and email from current user's profile data
- Add subject/topic dropdown (Bug report, Feature request, Billing question, Other)

---

## Page 24 — Referral

**Route:** `/referral` · `ReferralWidget`
**Auth Required:** Yes
**MVP file:** `lib/referral/referral_widget.dart`

### Purpose
Create a personal referral code to earn rewards when friends sign up, or apply an existing referral code from another user.

### UI Layout

**State A — No referral code exists:**
```
┌─────────────────────────────────┐
│ ←                               │  ← AppBar, primary bg
├─────────────────────────────────┤
│  Créer un code de parrainage    │
│                                 │
│  L'application vous a plu ?     │
│  Vous pouvez en parler à vos    │
│  amis et gagner des bonus!      │
│                                 │
│  ┌───────────────┐              │
│  │ Votre nom...  │  [Créer]     │  ← 200px wide input + button
│  └───────────────┘              │
│                                 │
│  ──────────────────────────     │
│                                 │
│  Vous avez déjà un code ?       │
│  ┌───────────────┐              │
│  │ Code...       │  [Valider]   │
│  └───────────────┘              │
└─────────────────────────────────┘
```

**State B — Referral code exists:**
```
┌─────────────────────────────────┐
│ ←                               │
├─────────────────────────────────┤
│  Votre code parrainage:         │
│  ╔═══════════════════════════╗ │
│  ║  AFRO-JEAN-2024           ║ │  ← Code display
│  ║  Parrainages: 3           ║ │
│  ║  Bonus: 15,00€            ║ │
│  ╚═══════════════════════════╝ │
│  [📋 Copier] [📤 Partager]     │
└─────────────────────────────────┘
```

**AppBar:** primary background, back button

**State A:**
- Title "Créer un code de parrainage"
- Description text with incentive message
- Row: 200px `TextFormField` (name input) + "Créer" button → `CreateAReferralCall`
- Divider
- "Vous avez déjà un code ?" section
- Row: 200px `TextFormField` (code input) + "Valider" button → find + apply referral

**State B:**
- Referral code display in styled card
- Referral count, earned bonus
- Copy and share actions

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `referral` | `.eq('auth_id', uid).maybeSingle()` | Check existing code |

**Edge Function:**
- `CreateAReferralCall` — create new referral code
  - Params: `name = currentUserDisplayName`, `customName = textController1`
  - Returns: created referral row

**On apply code:**
- `referral.update({ firebase_auth_id: uid, user_id: uid })` where `code = textController2.text`
- If no matching code: show "Code inconnu" error

### User Interactions

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Type custom name → "Créer" | Call `CreateAReferralCall` → refresh with new code |
| Type referral code → "Valider" | Look up code in `referral` table → apply to account |
| Invalid code | Show inline error "Code inconnu" |
| Tap "Copier" (State B) | Copy code to clipboard |
| Tap "Partager" (State B) | Share sheet with referral code |

### Navigation

- **Arrives from:** Profile Settings
- **Goes to:** Pops to Profile Settings

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `textController1` | `TextEditingController` | Custom referral name |
| `textController2` | `TextEditingController` | Code to apply |
| `_model.createAreferral` | API response | New referral row |
| `_model.requestCompleter2` | `Completer` | Refresh trigger |

### V1 Changes

- Remove `print()` debug statements
- Fix error display for "Code inconnu" — currently may not show to user
- State B: add actual copy-to-clipboard (`Clipboard.setData`)
- State B: add native share sheet (`share_plus` package)
- Add referral dashboard: how many people joined via your code, total bonus earned
