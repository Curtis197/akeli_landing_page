# Recipe Pages Specification

> Pages: Recipe Discovery, Recipe Detail

---

## Page 6 — Recipe Discovery

**Route:** `/recipeResearchingList` · `RecipeResearchingListWidget`
**Bottom Tab:** Tab 3
**MVP file:** `lib/recipe_researching_list/recipe_researching_list_widget.dart`

### Purpose
Searchable, filterable catalogue of African recipes — the primary discovery surface of the app.

### UI Layout

```
┌─────────────────────────────────┐
│       Recette                   │  ← AppBar, primary bg, centered
├─────────────────────────────────┤
│  ┌─────────────────────────┐ 🔽│
│  │🔍 Rechercher votre...   │ ⚡│  ← Search field + Filter icon + Order icon
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│  [Active filter chips × n] ×   │  ← Only if filters active
│  < 500kcal ×  Végétarien ×     │
├─────────────────────────────────┤
│  [AND] [OR]                     │  ← TagAndOrWidget (if tags selected)
├─────────────────────────────────┤
│  Sénégal  Cameroun  Mali …      │  ← Horizontal scrollable tag chips
│  [Tag chip × n]                 │
├─────────────────────────────────┤
│  ┌──────────────────────────┐   │  ← Only if mealID is set
│  │ 🖼 Lunch · Lundi 20 Jan  │ ✕│  ← Selected meal context card
│  └──────────────────────────┘   │
├─────────────────────────────────┤
│  [RecipeCardJSON × n]           │  ← Result list (from edge function)
│  [RecipeCardJSON]               │
│  [RecipeCardJSON]               │
│  ...                            │
│  [⏳ Loading spinner]           │  ← SpinKitDoubleBounce during fetch
└─────────────────────────────────┘
```

**AppBar:** primary background, "Recette" title centered, no leading (bottom nav)

**Search + Control Row:**
- `TextFormField` with 🔍 suffix icon — debounced 2000ms, triggers `UpdatedRecipeResearchCall`
- 🔽 Filter icon button → opens `RecipeFiltersWidget` as bottom sheet (600px)
- ⚡ Order icon button (color changes when active) → shows/hides `OrederingSelectorWidget` dropdown inline

**Ordering Dropdown** (conditional, `FFAppState().orderMenu == true`):
- `OrederingSelectorWidget` — options: name, calories, difficulty, cooking time, trending
- Ascending/descending toggle
- Selection updates `FFAppState().orderBy` + `FFAppState().orderAscend` + re-fetches

**Active Filter Chips Row** (conditional, `FFAppState().filtering == true`):
- Each chip: label + `×` remove button
- Remove tap: clears that filter from `FFAppState`, re-fetches
- Example chips: "< 500 kcal", "Sans porc", "Facile", "Sénégal"

**Tag AND/OR Toggle** (`TagAndOrWidget`): only visible if ≥1 tag selected — switches between AND/OR logic

**Tag Cloud (horizontal scroll):**
- FutureBuilder loading all `tags` where `language='fr'` and `receipe_created > 0`
- Each tag chip: label + recipe count
- Tap tag → adds to `FFAppState().tags` → re-fetches

**Meal Context Card** (conditional, `FFAppState().mealID != 0`):
- Shows the meal currently being populated from recipe search
- Image thumbnail + meal name + meal type + date
- `×` button clears `FFAppState().mealID`

**Recipe Result List:**
- `ListView.separated` with `RecipeCardJSONCopyWidget` for each result
- Results from `FFAppState().receipes` (populated by `UpdatedRecipeResearchCall`)
- Each card: recipe image, name, region, difficulty, calories, cooking time, rating
- Tap → navigate to `/receipeDetail/:receipeID`
- Separator: 10px `SizedBox`

**Loading State:** `SpinKitDoubleBounce` centered while edge function is in flight

### Data Sources

**Primary: Edge Function**
- `UpdatedRecipeResearchCall` (POST to Supabase edge function `updated-recipe-research`)
- Called on: page load, search input change (debounced), filter change, order change
- Request body built by `buildResearchRequest()`:
  ```json
  {
    "name": "search text",
    "calMin": 0,
    "calMax": 5000,
    "type": ["Déjeuner", "Dîner"],
    "typeLogic": "OR",
    "tags": ["Sénégal", "Végétarien"],
    "tagLogic": "AND",
    "foodRegion": ["Afrique de l'Ouest"],
    "difficulty": ["Facile"],
    "cookingTime": 45,
    "orderBy": "calories",
    "orderAscend": true,
    "sansPorc": false
  }
  ```
- Response: `{ receipes: RecipesStruct[], filters: FilterStruct[], hasFilters: bool }`

**Supabase Tables (direct):**

| Table | Query | Purpose |
|-------|-------|---------|
| `tags` | `.eq('language', 'fr').gt('receipe_created', 0)` | Tag cloud |
| `meal` | `.eq('id', mealID).single()` | Context meal info |
| `receipe_image` | `.eq('receipe_id', id).limit(1)` | Context meal thumbnail |

### User Interactions

| Action | FFAppState change | Result |
|--------|-------------------|--------|
| Type in search field | `name` updated | Debounced re-fetch after 2s |
| Tap filter icon | — | Open `RecipeFiltersWidget` modal |
| Apply filters in modal | `calMin`, `calMax`, `types`, `tags`, `difficulty`, `cookingTime`, `sansPorc` | Re-fetch on dismiss |
| Tap filter chip `×` | Remove that filter value | Re-fetch |
| Tap tag chip | Add to `FFAppState().tags` | Re-fetch |
| Tap AND/OR toggle | Toggle `FFAppState().tagLogic` | Re-fetch |
| Tap order icon | Toggle `FFAppState().orderMenu` | Show/hide dropdown |
| Select order option | `orderBy`, `orderAscend` updated | Re-fetch |
| Tap meal context `×` | `mealID = 0` | Remove meal context card |
| Tap recipe card | — | Navigate to `/receipeDetail/:receipeID` |
| Scroll | — | View more results |

### Navigation

- **Arrives from:** Bottom nav tab 3, Home page, Meal Planner (when adding a meal from recipe search)
- **Goes to:** `/receipeDetail/:receipeID`
- **Special case:** When `FFAppState().mealID != 0`, navigating to recipe detail and selecting "Add to my meals" will associate the recipe with that meal slot

### State

All filter state lives in `FFAppState` (global):

| Variable | Type | Default |
|----------|------|---------|
| `name` | `String` | `''` |
| `calMin` | `int` | `0` |
| `calMax` | `int` | `5000` |
| `type` | `List<String>` | `[]` |
| `typeAndOr` | `bool` | `false` (OR) |
| `tags` | `List<String>` | `[]` |
| `tagAndOr` | `bool` | `false` (OR) |
| `foodRegion` | `List<String>` | `[]` |
| `difficulty` | `List<String>` | `[]` |
| `cookingTime` | `int` | `0` |
| `orderBy` | `String` | `'name'` |
| `orderAscend` | `bool` | `true` |
| `sansPorc` | `bool` | `false` |
| `filtering` | `bool` | `false` |
| `orderMenu` | `bool` | `false` |
| `mealID` | `int` | `0` |
| `receipes` | `List<RecipesStruct>` | `[]` |
| `filter` | `List<FilterStruct>` | `[]` |

Local:
- `_model.nameTextController` — search input controller

### Embedded Components

- `RecipeFiltersWidget` — filter bottom sheet (V1: replace `recipe_filters_copy_widget.dart`)
- `OrederingSelectorWidget` — inline ordering dropdown
- `TagAndOrWidget` — AND/OR toggle
- `RecipeCardJSONCopyWidget` — individual recipe card (V1: rename to `RecipeCardWidget`)

### V1 Changes

- **Rename** `buildResearchRequestCopy` → `buildResearchRequest` (fix `String?` vs `List<String>?` params)
- **Rename** `RecommandedReceipeCall` → `RecommendedRecipeCall`
- **Rename** `RecipeFiltersCopyWidget` → `RecipeFiltersWidget` (delete the original)
- **Rename** `RecipeCardJSONCopyWidget` → `RecipeCardWidget`
- Fix `FFAppState` naming: `dificulty` → `difficulty`, `cookingTIme` → `cookingTime`, `TagAndOR` → `tagAndOr`
- Add "Clear all filters" button when `filtering == true`
- Add result count label ("42 recettes trouvées")
- Reduce debounce from 2000ms to 500ms — 2 seconds is too slow
- Persist filter state between sessions (recipe filters should survive app restart)

---

## Page 7 — Recipe Detail

**Route:** `/receipeDetail/:receipeID` · `ReceipeDetailWidget`
**MVP file:** `lib/receipe_detail/receipe_detail_widget.dart`

### Purpose
Full recipe page — images, nutritional info, ingredients, instructions, rating, comments, and add-to-plan action.

### UI Layout

```
┌─────────────────────────────────┐
│ ←                               │  ← SliverAppBar, primary bg
├─────────────────────────────────┤
│  {Recipe Name}                  │  ← headlineLarge, Outfit 32px
├─────────────────────────────────┤
│  ┌─────────────────────────┐    │
│  │    [Image Carousel]     │◄──►│  ← swipeable, 85% viewport
│  │    ○ ○ ● ○             │    │
│  └─────────────────────────┘    │
├─────────────────────────────────┤
│  [1850kcal] [Prot:35g] [Glu:…] │  ← Macro info cards (Wrap)
│  [45 min]   [Facile]            │
├─────────────────────────────────┤
│  ★ ★ ★ ★ ½   (4.5 / 128 avis) │  ← Rating bar, interactive
├─────────────────────────────────┤
│  Ingrédients                    │
│  • Riz brisé      300g         │
│  • Poulet         500g         │
│  • Tomates        200g         │
│  • Oignons        2 pièces     │
├─────────────────────────────────┤
│  Préparation                    │
│  1. Faire revenir les oignons… │
│  2. Ajouter le poulet…         │
│  3. Cuire 20 minutes…          │
├─────────────────────────────────┤
│  [AddCommentWidget]             │
│  ─────────────────────────────  │
│  [CommentWidget]                │
│    └ [CommentThreadWidget]      │
│  [CommentWidget]                │
├─────────────────────────────────┤
│  Recettes similaires            │
│  ◄ [Card] [Card] [Card] ►      │
├─────────────────────────────────┤
│  [  + Ajouter à mes repas  ]   │  ← Full-width primary button
└─────────────────────────────────┘
```

**SliverAppBar:** primary background, `arrow_back_rounded` back button, pinned: false

**Recipe Name:** from `receipe.name`, `headlineLarge`, Outfit font, 32px

**Image Carousel (`CarouselSlider`):**
- Images from `receipe_image` table for this recipe
- `viewportFraction: 0.85`, `enlargeCenterPage: true`, `infinite: true`
- `onPageChanged` → updates `_model.carouselCurrentIndex`
- Tap image → `FlutterFlowExpandedImageView` full-screen with hero animation
- Page indicator dots below

**Macro Cards (Wrap layout):**
- For each row in `receipe_macro`: label chip (name + quantity + unit)
- Always present: Calories (kcal), Protéines (g), Glucides (g), Lipides (g)
- Also: cooking time from `receipe.cooking_time`, difficulty from `receipe_difficulty`
- Card style: secondary background, rounded 8px, 8px padding

**Rating Bar:**
- `flutter_rating_bar`, 5-star, `allowHalfRating: true`
- Shows current user's rating from `user_rating` table (pre-filled)
- Shows average rating + total count
- `onRatingUpdate` → upsert to `user_rating`

**Ingredients Section:**
- Heading "Ingrédients"
- Each row from `receipe_ingredient` × `ingredients`: name · quantity · unit
- Scrollable if many items

**Instructions Section:**
- Heading "Préparation"
- From `receipe.instructions` — numbered steps

**Comments Section:**
- `AddCommentWidget` at top — text input, "Publier" button → insert into `receipe_comments`
- `CommentWidget` × n — each shows: user avatar, username, rating (optional), text, timestamp, ♥ like count
- Like button → increment `comment_like`
- Reply button → expand inline `CommentThreadWidget` input

**Similar Recipes (`SimilarReceipeWidget`):**
- Horizontal `ListView`
- Recipes with matching tags or same `food_region`
- Each card: thumbnail, name, calories
- Tap → navigate to same page with new `receipeID`

**Add to Plan Button:**
- Full-width, primary color
- Tap → open `AddNewMealWidget` as modal bottom sheet
  - Modal: date picker + meal type selector + "Ajouter" confirm
  - Confirm → `meal.insert()` with recipe_id, date, meal_type, meal_plan_id

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `receipe` | `.eq('id', receipeId).single()` | Recipe data, instructions |
| `receipe_image` | `.eq('receipe_id', receipeId)` | All images |
| `receipe_macro` | `.eq('receipe_id', receipeId)` | Nutritional data |
| `receipe_ingredient` | `.eq('receipe_id', receipeId)` | Ingredient list |
| `ingredients` | per ingredient_id | Names, units |
| `receipe_difficulty` | `.eq('receipe_id', receipeId).single()` | Difficulty level |
| `user_rating` | `.eq('receipe_id', id).eq('user_id', uid).maybeSingle()` | User's own rating |
| `receipe_comments` | `.eq('receipe_id', receipeId).order('created_at')` | Comments |
| `users` | per comment `user_id` | Comment author info |
| `comment_like` | per comment | Like counts |
| `receipe_tags` | `.eq('receipe_id', receipeId)` | Tags for similar recipe query |

**Widget parameter:** `receipeID` (int)

### User Interactions

| Action | Result |
|--------|--------|
| Tap back | Pop navigation |
| Swipe carousel | Change active image |
| Tap image | Full-screen hero expand |
| Adjust star rating | Upsert to `user_rating` |
| Write comment | Insert into `receipe_comments` |
| Tap ♥ on comment | Increment `comment_like` |
| Tap reply | Expand `CommentThreadWidget` |
| Tap similar recipe | Navigate to `/receipeDetail/:newId` |
| Tap "Ajouter à mes repas" | Open `AddNewMealWidget` modal |
| Confirm add in modal | Insert `meal` row, pop modal |

### Navigation

- **Arrives from:** Recipe Discovery (`/recipeResearchingList`), Home, Meal Detail (similar recipes)
- **Goes to:** another `/receipeDetail/:id` (similar recipe tap), modal (`AddNewMealWidget`)

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `_model.carouselCurrentIndex` | `int` | Active carousel page |

**Route parameter:** `receipeID` — passed via GoRouter

### Embedded Components

- `CarouselSlider`
- `FlutterFlowExpandedImageView`
- `AddCommentWidget`
- `CommentWidget`
- `CommentThreadWidget`
- `SimilarReceipeWidget`
- `AddNewMealWidget` (modal)
- `flutter_rating_bar`

### V1 Changes

- **Fix route typo:** `/receipeDetail` → `/recipeDetail` (coordinate with DB rename)
- **Fix widget name:** `ReceipeDetailWidget` → `RecipeDetailWidget`
- **Fix file name:** `receipe_detail_widget.dart` → `recipe_detail_widget.dart`
- Add skeleton loader for image carousel (avoid layout jump)
- Comments: load first 10, "Charger plus" pagination
- Rating: show both user's rating and global average clearly
- `SimilarReceipeWidget`: pass tags array to ensure relevant suggestions
- Add share button in AppBar (share recipe link)
