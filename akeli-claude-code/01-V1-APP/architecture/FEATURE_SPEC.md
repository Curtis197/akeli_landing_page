# V1 Feature Specification

> **Purpose:** Define what V1 includes — which MVP features to keep, cut, complete, or improve — and what new requirements exist. This is the product handoff document for V1 development.

---

## Product Vision (unchanged from MVP)

**Afro Health** is a multilingual health and nutrition app for African communities. Users can:
- Plan meals and track daily nutrition
- Discover and save African recipes
- Generate personalized AI-powered diet plans
- Track weight and health progress
- Connect with a community of users
- Get AI assistant support

V1 goal: take the validated MVP concept and deliver a **clean, stable, production-ready app** — removing workarounds, completing half-built features, and establishing a maintainable codebase.

---

## Language Support

All 6 languages from the MVP are retained in V1:

| Language | Code |
|----------|------|
| French | `fr` |
| English | `en` |
| German | `de` |
| Lingala | `ln` |
| Bambara | `bm` |
| Wolof | `wo` |

All UI strings must use i18n keys. The BottomNavigationBar labels (currently all "Home") must be localized.

---

## Feature Inventory

### Keep — Core Features (Working in MVP)

| Feature | MVP Status | V1 Action | Route |
|---------|------------|-----------|-------|
| Meal Planning | 95% | Keep, clean API calls | `/mealPlanner` |
| Meal Detail | 95% | Keep | `/mealDetail/:mealID` |
| Add Meal | 95% | Keep | (modal) |
| Add Snack | 90% | Keep | (modal) |
| Recipe Discovery | 95% | Keep, fix typos in API | `/recipeResearchingList` |
| Recipe Detail | 95% | Keep, fix typos (`receipe`) | `/receipeDetail/:receipeID` |
| Recipe Filtering | 90% | Keep, consolidate filter components | (modal) |
| Home Dashboard | 90% | Keep, fix nav labels | `/home` |
| Weight Graph | 90% | Keep | (component) |
| Diet Plan Generation | 90% | Keep | `/dietPlan` |
| User Profile View | 95% | Keep | `/userprofile` |
| Profile Settings | 95% | Keep | `/profileSetting` |
| Edit Profile | 95% | Keep | `/editInfo`, `/createEditProfil` |
| Onboarding / Patient Intake | 85% | Refine UX flow | `/inscriptionpage`, `/create05PatientIntake` |
| Shopping List | 90% | Keep | `/shoppingList` |
| Community (conversations + groups) | 85% | Keep | `/community` |
| Private Chat | 85% | Keep | `/chatPage` |
| Group Chat | 85% | Keep | `/groupPage` |
| AI Chat Assistant | 80% | Keep, clarify API chain | (component) |
| Notification Settings | 85% | Keep | `/notificationSetting` |
| Notifications | 85% | Keep | `/notifications` |
| Referral System | 80% | Keep | `/referral` |
| Terms & Conditions | 90% | Keep | `/cgu` |
| Support | 80% | Keep, remove print() | `/support` |

---

### Complete — Unfinished MVP Features

#### Payment / Subscription (`/paymentSubscription`)
**MVP Status: ~40%** — UI shell exists, no payment integration.

V1 requirements:
- Integrate a payment provider (Stripe recommended for cross-platform)
- Define subscription tiers (what is free vs paid?)
- Implement paywall enforcement for premium features
- Handle subscription state in Supabase (`user_preferences` or dedicated table)
- Handle restore purchases (iOS/Android)
- Show proper subscription status in profile settings

**This is the highest priority incomplete feature for V1.**

#### Dashboard (`/dash`)
**MVP Status: Unknown** — Route exists but not fully linked in main navigation.

V1 action: Audit what `dash` does, merge with `/home` if redundant, or promote to main tab if distinct.

---

### Cut — Remove in V1

| Item | Reason |
|------|--------|
| `/test` route (`TestWidget`) | Dev utility, no place in production |
| All `_copy_` component variants (8+ pairs) | Duplicates — pick one canonical version |
| `buildResearchRequestCopy` function | Replace with corrected `buildResearchRequest` |
| `PersonalMealPlanNoMealCall` OR `PersonalMealPlanCall` | Audit and keep only the one in use |
| `SearchAConversationCall` OR `SearchAPrivateConversationCall` | Audit and keep only the one in use |
| `SearchAGroupCall` OR `SearchAGroupByNameCall` | Audit and keep only the one in use |

---

### Improve — MVP Features That Need Quality Uplift

#### Onboarding Flow
Current state: Multi-page form with smooth page indicator. Works but UX is basic.

V1 improvements:
- Progressive disclosure (don't ask everything at once)
- Save partial progress (resume where user left off)
- Clearer progress indication
- Better error messaging for validation failures

#### AI Diet Plan
Current state: Calls edge function, displays result. Works but no feedback loop.

V1 improvements:
- Allow users to regenerate / adjust the plan
- Integrate `ai_plan_feedback` table (exists in DB but likely unused)
- Show plan history

#### Community / Chat
Current state: Groups and direct messages work. Notifications partially implemented.

V1 improvements:
- Ensure `chat_notifications` table is fully wired
- Conversation request flow (accept/decline) needs UX polish
- Push notification integration (FCM or Supabase webhook)

#### Recipe Filtering
Current state: Filter modal works but `recipe_filters_copy` vs `recipe_filters` duplication causes confusion.

V1 improvements:
- Consolidate to single filter component
- Fix `buildResearchRequest` to use `List<String>?` consistently
- Add clear-all filters action

---

## Navigation Structure (V1)

### Bottom Tab Bar (4 tabs)
| Tab | Route | Label (i18n key) |
|-----|-------|-----------------|
| 1 | `/home` | `nav.home` |
| 2 | `/mealPlanner` | `nav.meals` |
| 3 | `/recipeResearchingList` | `nav.recipes` |
| 4 | `/community` | `nav.community` |

### Stack Routes (from tabs)
```
/home
  └── /dash (if distinct)

/mealPlanner
  ├── /mealDetail/:mealID
  ├── /shoppingList
  └── /dietPlan

/recipeResearchingList
  └── /receipeDetail/:receipeID  (fix typo → /recipeDetail/:recipeID)

/community
  ├── /chatPage
  ├── /groupPage
  └── /userprofile

Profile (accessible from all tabs via icon)
  ├── /profileSetting
  ├── /editInfo
  ├── /createEditProfil
  ├── /notificationSetting
  ├── /paymentSubscription
  ├── /referral
  ├── /support
  └── /cgu

Auth (pre-login)
  ├── /authentication
  ├── /forgottenPassword
  ├── /inscriptionpage
  └── /create05PatientIntake
```

**Remove:** `/test` route

---

## V1 Quality Requirements

These apply to all features:

### No print() in production
Replace with `debugPrint()` at minimum. Consider adopting `logger` or `talker` package.

### Error states for all network calls
Every API call must have an error UI state. The existing `error_comp_widget.dart` and `diet_plan_error_widget.dart` patterns are good — apply them everywhere.

### Loading states
Every async operation must show a loading indicator. Use `flutter_spinkit` (already a dependency).

### Typed API responses
All API response parsing must use typed Dart structs (34 structs already exist in `lib/backend/schema/structs/`). No raw `dynamic` handling in UI code.

### Auth consistency
After V1 auth migration to Supabase: all pages must check auth state before loading. The current GoRouter redirect logic in `lib/flutter_flow/nav/nav.dart` is the right pattern — ensure it works with Supabase Auth.

---

## Feature Flags (V1 Considerations)

For features that aren't ready at V1 launch but are partially built:

| Feature | Recommended Approach |
|---------|---------------------|
| Payment | Gate behind a server-side flag in `user_preferences` |
| Creator profiles | Keep in DB, hide in UI until creator program launches |
| Push notifications | Implement FCM setup but make notification opt-in |

---

## Out of Scope for V1

- Web version (Flutter Web support exists in pubspec but is not a V1 priority)
- New AI features beyond existing diet plan + AI assistant
- Video content features (video_player is a dependency but no video feature is defined)
- PDF generation (pdf dependency exists but no feature defined)
