# Page Specifications — Index

> **Purpose:** Complete page-by-page specifications for rebuilding Afro Health V1 in Flutter (without FlutterFlow). Each document covers UI layout, data sources, interactions, navigation, state, and V1 changes.

---

## How to Use These Documents

When implementing a page in V1:
1. Read the page spec in the relevant file below
2. Cross-reference [ARCHITECTURE_REDESIGN.md](../ARCHITECTURE_REDESIGN.md) for state management patterns
3. Cross-reference [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) for styling
4. Use Supabase Auth (not Firebase) for all auth checks — see [ARCHITECTURE_REDESIGN.md](../ARCHITECTURE_REDESIGN.md)

---

## Page Inventory (22 pages total)

### [CORE_PAGES.md](CORE_PAGES.md) — 5 pages

| Page | Route | Bottom Tab |
|------|-------|-----------|
| Home | `/home` | Tab 1 |
| Meal Planner | `/mealPlanner` | Tab 2 |
| Meal Detail | `/mealDetail/:mealID` | — |
| Diet Plan | `/dietPlan` | — |
| Shopping List | `/shoppingList` | — |

### [RECIPE_PAGES.md](RECIPE_PAGES.md) — 2 pages

| Page | Route | Bottom Tab |
|------|-------|-----------|
| Recipe Discovery | `/recipeResearchingList` | Tab 3 |
| Recipe Detail | `/receipeDetail/:receipeID` | — |

### [COMMUNITY_PAGES.md](COMMUNITY_PAGES.md) — 5 pages

| Page | Route | Bottom Tab |
|------|-------|-----------|
| Community | `/community` | Tab 4 |
| Chat Page | `/chatPage` | — |
| Group Page | `/groupPage` | — |
| User Profile | `/userprofile` | — |
| Dashboard / Recap | `/dash` | — |

### [AUTH_PAGES.md](AUTH_PAGES.md) — 4 pages

| Page | Route | Auth Required |
|------|-------|--------------|
| Authentication | `/authentification` | No |
| Inscription (Onboarding) | `/inscriptionpage` | Post-signup |
| Patient Intake | `/create05PatientIntake` | Post-signup |
| Terms & Conditions | `/cgu` | No |

### [SETTINGS_PAGES.md](SETTINGS_PAGES.md) — 6 pages

| Page | Route | Auth Required |
|------|-------|--------------|
| Profile Settings | `/profileSetting` | Yes |
| Edit Info | `/editInfo` | Yes |
| Create/Edit Profile | `/createEditProfil` | Yes |
| Payment & Subscription | `/paymentSubscription` | Yes |
| Notifications | `/notifications` | Yes |
| Notification Settings | `/notificationSetting` | Yes |
| Support | `/support` | Yes |
| Referral | `/referral` | Yes |

---

## Navigation Map

```
[Not Authenticated]
  └── /authentification
        ├── Login → /home (bottom nav)
        └── Signup → /inscriptionpage → /create05PatientIntake → /home

[Bottom Navigation — 4 tabs]
  Tab 1: /home
    ├── → /dash (weight graph tap)
    ├── → /dietPlan
    ├── → /mealDetail/:id
    └── → /notifications

  Tab 2: /mealPlanner
    ├── → /mealDetail/:id
    ├── → /dietPlan
    └── → /shoppingList

  Tab 3: /recipeResearchingList
    └── → /receipeDetail/:id
          └── → /mealPlanner (add to meal)

  Tab 4: /community
    ├── → /chatPage (private conversation)
    ├── → /groupPage (group details/join)
    └── → /userprofile (other user)
          └── → /chatPage

[Profile Icon — accessible from all tabs]
  └── /profileSetting
        ├── → /userprofile (self)
        ├── → /paymentSubscription
        ├── → /editInfo
        ├── → /referral
        ├── → /createEditProfil
        ├── → /notificationSetting
        └── → /support
```

---

## Shared Data Contracts

### Auth context (available on all authenticated pages)
```dart
// V1: Replace Firebase with Supabase Auth
final user = Supabase.instance.client.auth.currentUser;
final userId = user?.id;  // UUID string
```

### Common Supabase query pattern
```dart
// V1 pattern for data loading
final result = await Supabase.instance.client
    .from('table_name')
    .select()
    .eq('user_id', userId)
    .single();
```

### Common edge function call pattern
```dart
// V1 pattern for edge function calls
final response = await Supabase.instance.client.functions.invoke(
  'function-name',
  body: {'param': value},
);
```

---

## Global Components (used across multiple pages)

| Component | Used on | Purpose |
|-----------|---------|---------|
| `AIThreadWidget` | Home, Meal Planner, Diet Plan | AI chat floating interface |
| `AddMealWidget` | Meal Planner, Recipe Detail | Add recipe to meal plan |
| `AddSnackWidget` | Meal Planner | Add snack to plan |
| `WeightGraphWidget` | Home | Weight tracking visualization |
| `SimilarRecipeWidget` | Recipe Detail | Related recipes carousel |
| `ErrorWidget` | All data pages | Error state display |
| Bottom NavBar | All main tabs | Tab navigation |

---

## V1 Global Rules (apply to all pages)

1. **No `print()` statements** — use `debugPrint()` or `logger`
2. **All network calls must have loading + error states**
3. **Auth via Supabase Auth** — not Firebase Auth
4. **i18n for all user-visible strings** — especially nav labels
5. **Material 3 enabled** — `useMaterial3: true`
6. **8px spacing grid** — all padding/margin must be multiples of 4 or 8
7. **No `_copy_` component variants** — one canonical version per component
8. **Typed API responses** — no `dynamic` in UI code
