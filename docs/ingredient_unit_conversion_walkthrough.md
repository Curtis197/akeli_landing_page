# Unit Conversion Database Architecture

The `Akeli V1` database has been fully adapted to support ingredient-level unit conversions natively, completely satisfying the constraint that creators should not be burdened with selecting units manually in the UI!

## 1. What changed in the Database?
We executed a migration that added four critical columns to your `ingredient` table:
* `default_metric_unit`: Determines whether the ingredient is measured by Weight (`g`) or Volume (`ml`).
* `default_us_unit`: Determines what unit to display to an American user (`cup`, `oz`, `tsp`).
* `us_to_metric_factor`: The mathematical ratio to convert exactly 1 US unit into Metric.
* `hide_in_metric`: A boolean flag used to hide duplicate Ounces rows from European/African users.

We also created the global RPC Function **`convert_ingredient_unit`** which the frontend can query to instantly convert any number of ingredients mathematically.

## 2. Baking Ingredient Handling
To give American creators the choice between precision (Ounces) and casual baking (Cups), we inserted the following duplicate rows into your live database, with `hide_in_metric` set to `true`:
* Farine de blé (Ounces)
* Farine de maïs (Ounces)
* Farine de manioc (Ounces)
* Farine de teff (Ounces)
* Sucre (Ounces)

> [!TIP]
> **Frontend Implementation Note:**
> When fetching the ingredient list for the search dropdown in the frontend:
> * If the user's region is `US`, fetch everything.
> * If the user's region is `FR` or anything else metric, add `WHERE hide_in_metric = false` to the Supabase query. This ensures French users never see the duplicate Ounces ingredients!

## 3. Edge Function Integration (Normalization)
To guarantee the database stays strictly Metric, we deployed a second RPC function: **`normalize_recipe_ingredients_to_metric(p_recipe_id UUID)`**.

When a US creator creates a recipe and inputs ingredients in US units, your `translate-recipe` Edge Function should call this RPC immediately before or after running the text translation. 

**Example TypeScript call inside your Edge Function:**
```typescript
// Call the RPC to convert all US units to Metric permanently
const { error: rpcError } = await supabase
  .rpc('normalize_recipe_ingredients_to_metric', { 
    p_recipe_id: recipe.id 
  });

if (rpcError) {
  console.error("Failed to normalize units:", rpcError);
}
```
This RPC loops through the recipe's ingredients. If it finds an ingredient saved in a US unit (like `cup`), it multiplies it by the `us_to_metric_factor` and overwrites the row with the Metric baseline (`g` or `ml`).

## 4. Frontend UI Dynamic Units
To enforce the "No Unit Dropdown" rule for creators, the frontend recipe form auto-detects the creator's region and assigns the unit for them:
1. **Locale Detection:** The `Step2Ingredients.tsx` component checks `navigator.language` to determine if the creator is American (`en-US`).
2. **Dynamic UI:** When a creator searches for an ingredient, the component fetches `default_metric_unit` and `default_us_unit` from the database.
3. **No Dropdowns:** The dropdown select was entirely removed. If an American selects "Flour", the form automatically assigns `cup` as the unit and displays a static `(cups)` label next to the quantity input.

## 5. Instruction Safety (Regex Validation)
To prevent creators from typing hard-coded measurements into the instructions text (which ruins translations), we added a Regex validation rule to the Zod schema (`stepItemSchema` in `lib/validations/recipe.schema.ts`). 
* The Regex blocks exact quantities like `100g`, `2 cups`, or `3 oz`.
* It intelligently ignores cooking contexts like time and temperature (`30 minutes`, `180°C`).
* If a creator violates the rule, the UI instantly highlights the step in red: *"Veuillez ne pas inclure de quantités exactes dans les instructions. Utilisez la section Ingrédients."*

## 6. What to do next
You will need to manually fill out the rest of the conversion factors for the other ingredients in your database using the Ingredient Data Dictionary we prepared earlier. You can do this easily through the Supabase Studio dashboard!
