# V1 Architecture Redesign

> **Purpose:** Define the target architecture for V1 — clean, consolidated, and executable by Claude Code. This document replaces the implicit FlutterFlow-generated architecture with deliberate decisions.

---

## Guiding Principles

1. **Single backend** — Supabase for everything. No dual Firebase/Supabase split.
2. **Typed everything** — No `dynamic` in business logic. Use existing Dart structs.
3. **Explicit state** — Grouped, named state slices. Not one 559-line blob.
4. **No test code in production** — Test endpoints, test routes, and test files are removed.
5. **Clean naming** — Fix all typos as part of the rebuild (coordinated front + back rename).

---

## Backend: Consolidate to Supabase

### Current state
Two backends running in parallel — see [ARCHITECTURE_ANALYSIS.md](../audit/ARCHITECTURE_ANALYSIS.md).

### V1 target
```
Mobile App (Flutter)
│
└── Supabase
      ├── Auth (Email, Google, Apple)
      ├── PostgreSQL (81 tables → cleaned)
      ├── Storage (images, avatars, recipe photos)
      ├── Edge Functions (25 → ~18 after cleanup)
      └── Realtime (chat, notifications)

[Optional]
└── Firebase Cloud Messaging (FCM)
      └── Push notifications only (no data storage)
```

### Migration steps (in order)

1. **Enable Supabase Auth providers**
   - Email/password
   - Google OAuth
   - Apple OAuth

2. **Migrate auth layer in Flutter**
   - Delete `lib/auth/firebase_auth/` directory
   - Create `lib/auth/supabase_auth/` with equivalent flows
   - Update GoRouter auth redirect to use `Supabase.instance.client.auth.currentUser`

3. **Remove Firebase from pubspec.yaml**
   ```yaml
   # Remove these:
   firebase_core
   firebase_auth
   cloud_firestore
   firebase_storage
   google_sign_in  # (only if using Supabase OAuth instead)
   ```

4. **Migrate user records**
   - Supabase Auth creates a user in `auth.users` automatically
   - Map existing Firebase UIDs to Supabase UUIDs in the `users` table
   - Write a one-time migration script

5. **Simplify environment config**
   ```json
   {
     "supabaseUrl": "https://[project].supabase.co",
     "supabaseAnonKey": "...",
     "geminiApiKey": "..."
   }
   ```
   Replace the 3×(URL+Key) structure with a single Supabase project config.

6. **Update `main.dart` initialization**
   ```dart
   Future<void> main() async {
     WidgetsFlutterBinding.ensureInitialized();
     try {
       await Supabase.initialize(
         url: EnvironmentValues.supabaseUrl,
         anonKey: EnvironmentValues.supabaseAnonKey,
       );
     } catch (e) {
       // Show error UI — don't silently fail
     }
     // Remove: await initFirebase()
   }
   ```

---

## State Management Redesign

### Problem
`lib/app_state.dart` is 559 lines of ungrouped, mixed-concern state with naming violations and anti-patterns.

### V1 approach: Domain slices

Split `FFAppState` into focused providers:

```dart
// Replace single FFAppState with:

RecipeFilterState      // Recipe search filters only
UserHealthState        // Health params: sex, weight, height, age, activity, targetWeight
MealPlanState          // Active meal plan, shopping list data
ChatState              // Conversation participants, readby lists
AuthState              // Wraps Supabase auth session
```

### Implementation pattern (Provider)
```dart
// Each slice:
class RecipeFilterState extends ChangeNotifier {
  List<String> tags = [];
  List<String> types = [];
  String difficulty = '';
  RangeValues calories = const RangeValues(0, 5000);
  int cookingTime = 0;     // was cookingTIme
  bool tagAndOr = false;   // was TagAndOR
  bool typeAndOr = false;  // was TypeAndOr

  void clearAll() { /* ... */ notifyListeners(); }
  void setTag(String tag) { /* ... */ notifyListeners(); }
}
```

### Persisted state
Use `shared_preferences` for state that should survive app restarts:
- `RecipeFilterState` — last used filters
- Selected locale
- Onboarding completion flag

---

## API Layer Cleanup

### File: `lib/backend/api_requests/api_calls.dart`

#### Rename (fix typos)
| Current Name | V1 Name |
|-------------|---------|
| `RecommandedReceipeCall` | `RecommendedRecipeCall` |
| `ChatNotiificationCall` | `ChatNotificationCall` |
| `.receipes()` method | `.recipes()` |
| `.receipeIDs()` method | `.recipeIDs()` |
| `.suucess()` method | `.success()` |
| `.descrition()` method | `.description()` |

#### Remove duplicate calls (audit first)
Before deleting, grep each class name across the full codebase to confirm which is actively used:
```bash
grep -r "PersonalMealPlanNoMealCall" lib/
grep -r "PersonalMealPlanCall" lib/
# Keep the one with more usages / the one that works
```

| Pair | Keep | Delete |
|------|------|--------|
| PersonalMealPlan vs NoMeal | Audit first | Audit first |
| SearchAPrivateConversation vs SearchAConversation | Audit first | Audit first |
| SearchAGroupByName vs SearchAGroup | Audit first | Audit first |

#### Fix test endpoints
| Call | Current Endpoint | V1 Endpoint |
|------|-----------------|------------|
| `MealIngredientsScaleCall` | `receipe_scaling_test` | `recipe_scaling` |
| `ShoppingListCall` | `shopping_list_test` | `shopping_list` |

Verify corresponding Supabase edge functions exist at the production endpoint names before changing.

#### Remove dead parameters
```dart
// CustomMealCall — remove imagetest parameter
// ShoppingListCall — remove unused shoppingListId, mealPlanId if not passed to edge function
```

---

## Custom Functions Cleanup

**File:** `lib/flutter_flow/custom_functions.dart`

### Keep

```dart
// newCustomFunction — rounds to nearest 0.5 (used in 7 places)
double newCustomFunction(double number) {
  return (number * 2).round() / 2;
}

// listToJson — converts List<String> to JSON string
String listToJson(List<String> inputList) {
  return jsonEncode(inputList);
}

// encodeJson — JSON encode helper (inline candidate, but keep for now)
String encodeJson(dynamic value) {
  return jsonEncode(value);
}
```

### Consolidate

```dart
// REMOVE: buildResearchRequest (uses String? params — wrong type)
// RENAME: buildResearchRequestCopy → buildResearchRequest (uses List<String>? — correct)
// UPDATE: all 27 call sites to use the new signature

String buildResearchRequest({
  List<String>? type,
  List<String>? tags,
  String? difficulty,
  // ...
})
```

### Fix field naming in `buildResearchRequest`
Line ~94 uses `"Food Region"` (capitalized, spaced) — should match the API contract. Verify against the Supabase edge function and normalize.

---

## Navigation Cleanup

**File:** `lib/flutter_flow/nav/nav.dart` and `lib/main.dart`

### Fix bottom nav labels
```dart
// BEFORE (all say 'Home'):
BottomNavigationBarItem(label: 'Home', icon: ...)
BottomNavigationBarItem(label: 'Home', icon: ...)
BottomNavigationBarItem(label: 'Home', icon: ...)
BottomNavigationBarItem(label: 'Home', icon: ...)

// AFTER (use i18n keys):
BottomNavigationBarItem(label: FFLocalizations.of(context).getText('nav_home'), icon: ...)
BottomNavigationBarItem(label: FFLocalizations.of(context).getText('nav_meals'), icon: ...)
BottomNavigationBarItem(label: FFLocalizations.of(context).getText('nav_recipes'), icon: ...)
BottomNavigationBarItem(label: FFLocalizations.of(context).getText('nav_community'), icon: ...)
```

### Remove test route
```dart
// Delete from GoRouter:
GoRoute(path: '/test', builder: (context, state) => const TestWidget())
```

### Fix route typo (if DB migration done)
```
/receipeDetail/:receipeID  →  /recipeDetail/:recipeID
```
Only after Supabase table rename is complete.

---

## Logging

Replace all `print()` calls with `debugPrint()` as the minimum V1 fix.

For a proper logging setup, add `logger` package:
```yaml
# pubspec.yaml
logger: ^2.0.0
```

```dart
// lib/utils/logger.dart
import 'package:logger/logger.dart';
final log = Logger();

// Usage:
log.d('Debug message');
log.e('Error', error: e, stackTrace: s);
```

Files requiring print() removal:
- `lib/payment_subscription/payment_subscription_widget.dart`
- `lib/support/support_widget.dart`
- `lib/referral/referral_widget.dart`
- `lib/cgu/cgu_widget.dart`
- `lib/backend/api_requests/api_calls.dart`
- `lib/environment_values.dart`

---

## V1 Folder Structure

```
lib/
├── main.dart                          # Simplified init (Supabase only)
├── app_state/                         # Replaced app_state.dart
│   ├── recipe_filter_state.dart
│   ├── user_health_state.dart
│   ├── meal_plan_state.dart
│   └── chat_state.dart
├── auth/
│   └── supabase_auth/                 # Replaces firebase_auth/
│       ├── auth_manager.dart
│       ├── email_auth.dart
│       ├── google_auth.dart
│       └── apple_auth.dart
├── backend/
│   ├── supabase/                      # Keep (primary backend)
│   │   ├── database/tables/           # 81 table definitions
│   │   └── supabase.dart
│   └── api_requests/
│       └── api_calls.dart             # Cleaned (typos fixed, duplicates removed)
├── flutter_flow/
│   ├── custom_functions.dart          # Consolidated (remove _copy)
│   ├── flutter_flow_theme.dart        # Update for Material 3
│   ├── nav/nav.dart                   # Fixed labels, removed /test
│   └── ...                            # Keep other utilities
├── components/                        # 68 → ~50 (remove _copy_ variants)
├── [feature pages]                    # Keep existing structure per feature
└── utils/
    └── logger.dart                    # New: centralized logging
```

---

## Files to Rewrite in V1

Priority order for Claude Code:

| File | Action | Why |
|------|--------|-----|
| `lib/main.dart` | Rewrite | Remove Firebase, add error handling, fix splash |
| `lib/app_state.dart` | Replace with domain slices | Anti-patterns, bloat, naming violations |
| `lib/auth/firebase_auth/` | Replace with supabase_auth/ | Auth migration |
| `lib/backend/api_requests/api_calls.dart` | Clean in place | Typos, duplicates, test endpoints |
| `lib/flutter_flow/custom_functions.dart` | Clean in place | Remove duplicate, fix naming |
| `lib/flutter_flow/nav/nav.dart` | Edit | Fix labels, remove test route |
| All `_copy_` components | Delete | Pure duplication |

---

## Dependencies: What to Remove

```yaml
# Remove from pubspec.yaml:
firebase_core
firebase_auth
cloud_firestore
firebase_storage
firebase_analytics        # if present
google_sign_in            # if replaced by Supabase OAuth

# Keep:
supabase_flutter
gotrue
postgrest
realtime_client
functions_client
provider
go_router
# ... all UI/utility packages unchanged
```

---

## Testing Strategy (V1 Minimum)

No tests existed in MVP. V1 should establish a baseline:

| Test | What to test | File |
|------|-------------|------|
| Unit: custom functions | `newCustomFunction`, `buildResearchRequest`, `listToJson` | `test/unit/custom_functions_test.dart` |
| Unit: state slices | RecipeFilterState mutations, UserHealthState | `test/unit/state_test.dart` |
| Unit: API response parsing | Parse each edge function response struct | `test/unit/api_parsing_test.dart` |
| Widget: auth flow | Login, signup, password reset screens | `test/widget/auth_test.dart` |

Integration tests are out of scope for V1 but should be planned for V2.
