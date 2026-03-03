# Core Pages Specification

> Pages: Home, Meal Planner, Meal Detail, Diet Plan, Shopping List

---

## Page 1 — Home

**Route:** `/home` · `HomePageWidget`
**Bottom Tab:** Tab 1
**MVP file:** `lib/home_page/home_page/home_page_widget.dart`

### Purpose
Main dashboard — greets the user, surfaces weight progress, today's meal plan, shopping list items, and the AI assistant.

### UI Layout

```
┌─────────────────────────────────┐
│ [Avatar]  Bienvenue, {name}  [🔔][⚙] │  ← Floating SliverAppBar
├─────────────────────────────────┤
│  ╔══════════════════════════╗   │
│  ║   Weight Graph Card      ║   │  ← Tap → /dash
│  ║   [WeightGraphWidget]    ║   │
│  ╚══════════════════════════╝   │
├─────────────────────────────────┤
│  ╔══════════════════════════╗   │
│  ║ Voir mon plan diététique ║   │  ← Tap → /dietPlan
│  ╚══════════════════════════╝   │
├─────────────────────────────────┤
│  Repas de la semaine            │
│  ┌────────────────────────┐     │
│  │ [MealCard] Breakfast   │     │  ← Tap → /mealDetail/:id
│  │ [MealCard] Lunch       │     │
│  │ [MealCard] Dinner      │     │
│  └────────────────────────┘     │
├─────────────────────────────────┤
│  Liste de courses               │
│  ☐ Item 1 — 2kg                 │  ← Checkbox toggles checked
│  ☑ Item 2 — 1 head             │
│  ☐ Item 3 — 500g               │
├─────────────────────────────────┤
│                        [AI FAB] │  ← Only if paidPlan=true
│                      ↓ opens   │
│  ╔══════════════════════════╗   │
│  ║  [AIThreadWidget]        ║   │
│  ╚══════════════════════════╝   │
└─────────────────────────────────┘
```

**AppBar (SliverAppBar, floating):**
- Left: Profile picture (40×40px circular) from `users.profil_image_url`, tap → `/userprofile` (self)
- Center: "Bienvenue sur Afro Health, {users.name}"
- Right: 🔔 notification icon with badge count from `total_notifications` · ⚙ settings icon → `/profileSetting`

**Weight Graph Card:** wraps `WeightGraphWidget`, full-width card, tap navigates to `/dash`

**Diet Plan Card:** Labeled "Voir mon plan diététique", tap → `/dietPlan`

**Meal Plan Section:**
- Heading "Repas de la semaine"
- Queries active `meal_plan` (start_date ≤ today ≤ end_date)
- Lists meals from `meal` table for that plan
- Each `MealCard` shows: thumbnail image from `receipe_image`, name, type (Petit-Déjeuner/Déjeuner/Dîner/Collation), calories
- Tap card → `/mealDetail/:mealID`

**Shopping List Section:**
- Heading "Liste de courses"
- Items from `shopping_ingredient` joined to active `shopping_list`
- Each item: checkbox + name + quantity + unit
- Checkbox tap → updates `shopping_ingredient.checked`

**AI FAB (bottom-right):**
- Only visible if user subscription is active (`paidPlan = true`)
- Tap toggles `_model.aiChat` bool → shows/hides `AIThreadWidget` overlay

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `users` | `.eq('user_id', userId).single()` | Profile image, name |
| `total_notifications` | stream, `.eq('user_id', userId)` | Badge count |
| `meal_plan` | `.eq('user_id', userId)`, date range | Active plan |
| `meal` | `.eq('meal_plan_id', planId)` | Week's meals |
| `receipe_image` | `.eq('receipe_id', id).limit(1)` | Meal thumbnails |
| `shopping_list` | `.eq('user_id', userId).single()` | Active shopping list |
| `shopping_ingredient` | `.eq('shopping_list_id', listId)` | Shopping items |
| `updated_weight` | `.eq('user_id', userId).order('date')` | Weight graph data |

No edge function calls on initial load.

### User Interactions

| Action | Result |
|--------|--------|
| Tap profile avatar | Navigate to `/userprofile` (own profile) |
| Tap 🔔 icon | Navigate to `/notifications` |
| Tap ⚙ icon | Navigate to `/profileSetting` |
| Tap weight graph | Navigate to `/dash` |
| Tap diet plan card | Navigate to `/dietPlan` |
| Tap meal card | Navigate to `/mealDetail/:mealID` |
| Tap shopping checkbox | Toggle `shopping_ingredient.checked` via update |
| Tap AI FAB | Toggle `AIThreadWidget` visibility |
| Scroll | Vertical scroll through all sections |

### Navigation

- **Arrives from:** App launch (authenticated), bottom nav tab 1
- **Goes to:** `/dash`, `/dietPlan`, `/mealDetail/:id`, `/notifications`, `/profileSetting`, `/userprofile`

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `_model.aiChat` | `bool` | Controls AIThreadWidget visibility |
| `_model.queriedMealPlan` | `List<MealPlanRow>` | Active meal plan rows |

### Embedded Components

- `WeightGraphWidget` — weight trend visualization
- `AIThreadWidget` — AI assistant overlay (conditional)

### V1 Changes

- Fix notification badge: wire to real-time Supabase stream
- Fix AI FAB: check `user_preferences.paid_plan` from Supabase (not Firebase)
- Add empty states for when no meal plan / no shopping list exists
- Add pull-to-refresh on main scroll
- Shopping list section: add "View full list" → `/shoppingList` navigation

---

## Page 2 — Meal Planner

**Route:** `/mealPlanner` · `MealPlannerWidget`
**Bottom Tab:** Tab 2
**MVP file:** `lib/meal_planner/meal_planner/meal_planner_widget.dart`

### Purpose
Displays the user's full weekly meal plan, day by day, with all meal types — and lets the user navigate to diet plan generation or add/view individual meals.

### UI Layout

```
┌─────────────────────────────────┐
│  ← [back]  Vos repas de la semaine  │  ← SliverAppBar
├─────────────────────────────────┤
│  ╔══════════════════════════╗   │
│  ║ Voir mon plan diététique ║   │  ← Tap → /dietPlan
│  ╚══════════════════════════╝   │
├─────────────────────────────────┤
│  [WeeklyProgressionWidget]      │  ← Weekly macro summary
├─────────────────────────────────┤
│  Lundi                          │
│  ┌─────────────────────────┐    │
│  │ Petit-Déjeuner          │    │
│  │  [MealCard] or [+]      │    │
│  │ Déjeuner                │    │
│  │  [MealCard] or [+]      │    │
│  │ Dîner                   │    │
│  │  [MealCard] or [+]      │    │
│  │ Collation               │    │
│  │  [MealCard] or [+]      │    │
│  └─────────────────────────┘    │
│  Mardi ... (repeat for 7 days)  │
├─────────────────────────────────┤
│                        [AI FAB] │
└─────────────────────────────────┘
```

**SliverAppBar:** transparent background, title "Vos repas de la semaine", no leading (bottom nav manages back)

**Diet Plan Link Card:** "Voir mon plan diététique" → `/dietPlan` — only visible if plan exists AND user has paid plan

**Weekly Progression Widget:** `WeeklyProgressionWidget` showing macro summary for the week

**Day Sections (×7, Monday–Sunday):**
- Day label in `headlineMedium`
- For each meal type (Petit-Déjeuner, Déjeuner, Dîner, Collation):
  - If meal exists: `MealCard` — image, name, type label, calorie count — tap → `/mealDetail/:mealID`
  - If no meal: `[+]` add button — tap → `AddNewMealWidget` modal (with pre-filled meal type + date)

**Snack add:** Tap Collation `[+]` → opens `AddSnackWidget` modal instead

**AI FAB:** identical to Home — only if paid plan, toggles `AIThreadWidget`

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `users` | `.eq('user_id', userId).single()` | Subscription status |
| `meal_plan` | `.eq('user_id', userId)`, date range | Active plan |
| `meal` | `.eq('meal_plan_id', planId).order('date')` | All meals in plan |
| `receipe_image` | per meal, `.limit(1)` | Meal thumbnails |
| `receipe` | per meal | Meal name, calories |

No edge functions on load.

### User Interactions

| Action | Result |
|--------|--------|
| Tap diet plan card | Navigate to `/dietPlan` |
| Tap existing MealCard | Navigate to `/mealDetail/:mealID` |
| Tap `[+]` on meal slot | Open `AddNewMealWidget` modal (pre-filled type + date) |
| Tap `[+]` on snack slot | Open `AddSnackWidget` modal |
| Long-press MealCard | Show delete confirmation → `meal.delete()` |
| Tap AI FAB | Toggle `AIThreadWidget` |
| Scroll | Full vertical scroll through 7 days |

### Navigation

- **Arrives from:** Bottom nav tab 2, Home page
- **Goes to:** `/dietPlan`, `/mealDetail/:id` (on card tap), modal sheets

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `_model.aiChat` | `bool` | AI overlay visibility |

### Embedded Components

- `WeeklyProgressionWidget`
- `AddSnackWidget` (modal)
- `AddNewMealWidget` (modal)
- `AIThreadWidget`

### V1 Changes

- Show empty state with CTA when no active meal plan (link to diet plan generation)
- Add swipe-to-delete on MealCard instead of long-press only
- WeeklyProgressionWidget: ensure macro data loads from `receipe_macro` not from raw meal data

---

## Page 3 — Meal Detail

**Route:** `/mealDetail/:mealID` · `MealDetailWidget`
**MVP file:** `lib/meal_planner/meal_detail/meal_detail_widget.dart`

### Purpose
Full detail view for a single meal in the user's plan — shows images, macros, ingredients, instructions, ratings, comments, and similar recipes.

### UI Layout

```
┌─────────────────────────────────┐
│ ← [back]                        │  ← SliverAppBar, primary bg
├─────────────────────────────────┤
│  {Meal / Recipe Name}           │  ← headlineLarge, Outfit
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │
│  │  [Image Carousel]       │◄──►│  ← CarouselSlider, swipe
│  │  ○ ○ ● ○               │    │  ← page dots
│  └─────────────────────────┘    │
├─────────────────────────────────┤
│  [Calories] [Protein] [Carbs]   │  ← Wrap of macro cards
│  [Fat] [Duration] [Difficulty]  │
├─────────────────────────────────┤
│  ★ ★ ★ ★ ☆  (4.0)             │  ← flutter_rating_bar, interactive
├─────────────────────────────────┤
│  Ingrédients                    │
│  • Tomates        2 kg         │
│  • Poulet         500g         │
│  • ...                          │
├─────────────────────────────────┤
│  Préparation                    │
│  1. Étape une...                │
│  2. Étape deux...               │
├─────────────────────────────────┤
│  Commentaires                   │
│  [AddCommentWidget]             │
│  [CommentWidget × n]            │
│    └─ [CommentThreadWidget]     │
├─────────────────────────────────┤
│  Recettes similaires            │
│  [SimilarReceipeWidget]         │
├─────────────────────────────────┤
│  [  Ajouter à mes repas  ]      │  ← Primary button → AddMealWidget
└─────────────────────────────────┘
```

**Back button:** `arrow_back_rounded` icon, pops navigation

**Recipe Name:** from `receipe.name`, `headlineLarge`, Outfit font

**Image Carousel:**
- `CarouselSlider.builder` with all images from `receipe_image`
- `viewportFraction: 0.85`, `enlargeCenterPage: true`, `infiniteScroll: true`
- Tap image → full-screen `FlutterFlowExpandedImageView` with hero animation
- Page dots track `_model.carouselCurrentIndex`

**Macro Cards (Wrap):** For each entry in `receipe_macro`:
- Card shows: quantity + unit label (kcal, g, mg)
- Background: `secondaryBackground`, border radius 8px
- Always shown: Calories, Protein, Carbs, Fat
- Also: Duration card (`receipe.cooking_time` in minutes), Difficulty badge

**Rating Bar:** `flutter_rating_bar`, 5 stars, interactive — on change: upsert to `user_rating`

**Ingredients:** from `receipe_ingredient` joined to `ingredients` — name, quantity, unit

**Instructions:** from `receipe.instructions` (text or JSON steps) — numbered list

**Comments Section:**
- `AddCommentWidget` — text input at top
- `CommentWidget` × n — each comment with avatar, name, text, timestamp, like button
- `CommentThreadWidget` — nested replies, expanded on tap

**Similar Recipes:** `SimilarReceipeWidget` — horizontal scroll of recipe cards from same tags/region

**Add to Plan Button:** Full-width primary button → opens `AddMealWidget` modal (date + meal type picker)

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `receipe` | `.eq('id', receipeId).single()` | Recipe data |
| `receipe_image` | `.eq('receipe_id', receipeId)` | All images |
| `receipe_macro` | `.eq('receipe_id', receipeId)` | Nutritional macros |
| `receipe_ingredient` | `.eq('receipe_id', receipeId)` | Ingredients |
| `ingredients` | per ingredient id | Names, units |
| `user_rating` | `.eq('receipe_id', id).eq('user_id', uid)` | Current user's rating |
| `receipe_comments` | `.eq('receipe_id', receipeId)` | Comments |
| `users` | per comment author id | Comment author info |

### User Interactions

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Swipe carousel | Navigate between images |
| Tap image | Full-screen hero expand |
| Rate stars | Upsert `user_rating` |
| Add comment | Insert into `receipe_comments` |
| Tap reply | Expand `CommentThreadWidget` |
| Like comment | Increment `comment_like` |
| Tap similar recipe | Navigate to `/receipeDetail/:id` |
| Tap "Ajouter à mes repas" | Open `AddMealWidget` modal |

### Navigation

- **Arrives from:** Home, Meal Planner, Recipe Detail (similar recipes)
- **Goes to:** modal (`AddMealWidget`), `/receipeDetail/:id` (similar recipes)

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `_model.carouselCurrentIndex` | `int` | Active carousel page |

**Widget parameter:** `mealID` (int) — the meal_plan entry ID; recipe is loaded via join

### Embedded Components

- `CarouselSlider`
- `FlutterFlowExpandedImageView`
- `AddMealWidget` / `AddNewMealWidget`
- `CommentWidget`
- `AddCommentWidget`
- `CommentThreadWidget`
- `SimilarReceipeWidget`

### V1 Changes

- Rename route to `/mealDetail/:mealID` (already correct) — but fix internal recipe ID resolution
- Add skeleton loader during image carousel load
- Rating: show average rating + count alongside user's own rating
- Comments: paginate (load more) instead of loading all at once
- `SimilarReceipeWidget`: pass current recipe's `tags` and `food_region` to filter

---

## Page 4 — Diet Plan

**Route:** `/dietPlan` · `DietPlanWidget`
**MVP file:** `lib/diet_plan/diet_plan_widget.dart`

### Purpose
Displays the AI-generated personalized diet plan — macronutrient targets, daily breakdowns, and progress toward weekly goals.

### UI Layout

```
┌─────────────────────────────────┐
│ ← [back]   Plan Diététique      │  ← AppBar
├─────────────────────────────────┤
│  Objectif: Perdre du poids      │  ← from user_goal
│  ┌────────────┐ ┌────────────┐  │
│  │ 1 850 kcal │ │ P 35% / C │  │  ← target macros
│  └────────────┘ └────────────┘  │
├─────────────────────────────────┤
│  Progression hebdomadaire       │
│  [████████░░] 80% Protéines     │
│  [██████████] 95% Glucides      │
│  [████░░░░░░] 45% Lipides       │
├─────────────────────────────────┤
│  Lundi                          │  ← Expandable day card
│  ├ Petit-Déjeuner: Oatmeal      │
│  ├ Déjeuner: Chicken Rice       │
│  ├ Dîner: Grilled Fish          │
│  └ Collation: Fruit             │
│  [Mardi] ... [×7 days]          │
├─────────────────────────────────┤
│  Recommandations IA             │
│  • Augmentez les légumes...     │
│  • Réduisez les sucres...       │
├─────────────────────────────────┤
│                        [AI FAB] │
└─────────────────────────────────┘
```

**AppBar:** back button, "Plan Diététique" title

**Goal + Target Card:**
- From `user_goal` and `user_health_parameter`: shows daily calorie target, macro split (% protein / carbs / fat)
- User's objective label (lose weight, gain muscle, maintain)

**Weekly Progress Bars:**
- `percent_indicator` linear bars for each macro
- Current consumption vs weekly target (from `meal` + `receipe_macro` data)

**Day Sections (×7, expandable):**
- Day label as tappable header
- Expands to show 4 meal slots (same as Meal Planner)
- Each slot shows meal name and calories
- Tap meal → `/mealDetail/:id`

**AI Recommendations Section:**
- Bullet list of AI-generated tips
- From `ai_plan_feedback` table or embedded in diet plan response

**Error State:** `MealPlanErrorWidget` shown if diet plan generation failed — with retry button that calls `DietPlanCall` edge function

**AI FAB:** same as Home/Meal Planner pattern

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `users` | `.eq('user_id', userId).single()` | Subscription, prefs |
| `user_health_parameter` | `.eq('user_id', userId).single()` | Age, weight, height, activity |
| `user_goal` | `.eq('user_id', userId)` | Targets |
| `meal_plan` | active plan | Plan reference |
| `meal` | `.eq('meal_plan_id', planId)` | This week's meals |
| `receipe_macro` | per meal | Macro values |
| `ai_plan_feedback` | `.eq('user_id', userId)` | AI recommendations |

**Edge Function:**
- `DietPlanCall` — called if no diet plan exists or on retry
  - Params: `userId`, user health parameters, goals
  - Returns: `DietPlanDataStruct` or `DietPlanErrorStruct`

### User Interactions

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Tap day header | Expand/collapse day detail |
| Tap meal in day | Navigate to `/mealDetail/:id` |
| Tap retry (error state) | Re-invoke `DietPlanCall` edge function |
| Tap AI FAB | Toggle `AIThreadWidget` |
| Scroll | Vertical through all days |

### Navigation

- **Arrives from:** Home, Meal Planner
- **Goes to:** `/mealDetail/:id`, modal (`AIThreadWidget`)

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `_model.expandedDays` | `Set<int>` | Which day sections are expanded |
| `_model.aiChat` | `bool` | AI overlay toggle |

### Embedded Components

- `MealPlanErrorWidget`
- `AIThreadWidget`
- `percent_indicator` (LinearPercentIndicator)

### V1 Changes

- Wire `ai_plan_feedback` table — currently the feedback loop exists in DB but is unused in UI
- Add "Regenerate plan" button (calls `DietPlanCall` again)
- Persist last generated plan in Supabase so it survives app restart
- Show actual consumed vs target (not just plan targets)

---

## Page 5 — Shopping List

**Route:** `/shoppingList` · `ShoppingListWidget`
**MVP file:** `lib/shopping_list/shopping_list_widget.dart`

### Purpose
Interactive shopping list for ingredients from the active meal plan, organized by category, with checkbox completion tracking.

### UI Layout

```
┌─────────────────────────────────┐
│ ← [back]   Liste de Courses     │  ← AppBar
├─────────────────────────────────┤
│  Plan du: 20 Jan → 26 Jan       │
│  Total estimé: 47,50 €          │
│  Items: 12  ·  Cochés: 4        │
├─────────────────────────────────┤
│  Grouper par:                   │
│  ○ Repas  ● Catégorie           │  ← Radio toggle
├─────────────────────────────────┤
│  ▼ Légumes (3 items, 8,50€)     │  ← Expandable category
│    ☐ Tomates      2 kg  4,50€  │
│    ☑ Laitue       1    2,00€  │
│    ☐ Carottes     1 kg  2,00€  │
│  ▶ Protéines (2 items, 15€)     │
│  ▶ Produits laitiers            │
│  ...                            │
├─────────────────────────────────┤
│  [  Partager  ]  [  Vider ✓  ] │  ← Action buttons
└─────────────────────────────────┘
```

**AppBar:** back button, "Liste de Courses" title

**Header Summary:**
- Plan date range from `shopping_list`
- Total estimated cost (sum of `shopping_ingredient.price × quantity`)
- Item count and checked count

**Grouping Toggle:** Radio buttons — group by meal type (Petit-Déjeuner / Déjeuner / …) or by ingredient category (`ingredient_category`)

**Category Sections (expandable):**
- Category label + item count + subtotal
- Tap header → expand/collapse
- Each item row: checkbox · name · quantity · unit · price
- Checkbox tap → `shopping_ingredient.update(checked: true/false)`
- Long-press item → edit dialog (quantity, price) or delete

**Running Totals (bottom fixed bar):**
- Checked items subtotal
- Remaining items subtotal

**Action Buttons:**
- "Partager" → generates shareable link or QR code
- "Vider ✓" → deletes all checked items with confirmation dialog

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `shopping_list` | widget parameter (passed in) | List metadata |
| `shopping_ingredient` | `.eq('shopping_list_id', listId)` | All items |
| `ingredients` | per ingredient_id | Names, category |
| `ingredient_category` | all | Category names for grouping |
| `meal` | optional, per meal_id on ingredient | For meal-based grouping |

**Widget parameter:** `shoppingList` — `ShoppingListRow` passed from navigation

### User Interactions

| Action | Result |
|--------|--------|
| Tap checkbox | Toggle `shopping_ingredient.checked` |
| Long-press item | Edit dialog (quantity, price) or delete |
| Tap category header | Expand/collapse section |
| Toggle grouping radio | Reorganize list by meal or category |
| Tap "Partager" | Share list (deep link or QR) |
| Tap "Vider ✓" | Confirmation → delete checked items |
| Scroll | View all items |

### Navigation

- **Arrives from:** Home, Meal Planner
- **Widget parameter required:** `ShoppingListRow` (cannot be navigated to without data)

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `_model.groupBy` | `enum` | Category or Meal grouping |
| `_model.expandedCategories` | `Map<String, bool>` | Which sections are open |

### Embedded Components

None — self-contained with inline UI

### V1 Changes

- Add real price tracking (currently price field may be empty)
- PDF export button ("Imprimer")
- Swipe-to-delete on items (instead of long-press only)
- When all items in a category are checked, auto-collapse the category
- If `shopping_list` is null (accessed from deep link), fall back to active plan's list
