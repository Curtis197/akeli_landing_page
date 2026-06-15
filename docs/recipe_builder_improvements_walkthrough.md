# Recipe Builder Improvements & Bug Fixes

We have successfully completed a comprehensive round of updates to the Creator Dashboard and Recipe Builder. These changes address localization issues, enhance the user experience with drag-and-drop capabilities, and improve ingredient categorization.

## 1. Dashboard Localization (Support Link)
- The **"Help"** / **"Aide"** link in the Creator Dashboard navigation (both desktop sidebar and mobile menu) has been successfully added.
- The link directs users to `mailto:support@akeli.app`.
- Translations are active across English, French, and Arabic.

## 2. Draggable Recipe Sections
- You can now **drag and drop Section titles** (e.g., "Marinade", "Sauce") within the recipe builder exactly the same way you can drag individual ingredients or steps.
- We refactored `Step2Ingredients.tsx`, `Step3Steps.tsx`, and `SectionHeaderRow.tsx` to integrate seamlessly with the `dnd-kit` library array mapping.

## 3. Dynamic Ingredient Translations
- Fixed a bug where searched ingredients were hardcoded to always display in French (e.g., `name_fr`) regardless of the user's active locale.
- Ingredient chips selected in Step 2 and rendered in Step 3 now dynamically display the **active localized name** (English, French, or Arabic).

## 4. Category Tags Translation
- Ingredient categories (such as *liquid*, *oil*, *meat*, etc.) which were previously returning raw database ID strings are now fully localized.
- Added a new `ingredientCategories` namespace in `en.json`, `fr.json`, and `ar.json` mapping database codes to human-readable text (e.g., `meat` -> `Viande` -> `لحوم`).

## 5. New `fried_oil` Category
- Created a new database migration (`20260615194500_add_fried_oil_category.sql`) to introduce the `fried_oil` category.
- Updated translations to distinctly display **"Frying Oil"** (or localized equivalents like "Huile de friture") in the creator interface.
- This allows creators to accurately tag ingredients while reserving a more generic "Oil & Fat" term for standard users in the future.

---

> [!TIP]
> **Action Required**: Remember to apply your database migrations (e.g., `npx supabase db push`) to ensure the `fried_oil` category is properly inserted into your remote Supabase `ingredient_category` table! All frontend and translation changes are already deployed.
