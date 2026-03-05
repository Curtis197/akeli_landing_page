# V1 Design System

> **Purpose:** Document the existing MVP design tokens, identify design debt from FlutterFlow defaults, and define V1 design goals and action items.

---

## Current Design Tokens (MVP)

**Source:** `lib/flutter_flow/flutter_flow_theme.dart`

### Color Palette

#### Brand Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#3BB78F` | Teal/Green — primary actions, active states |
| `secondary` | `#FF9F1C` | Orange — secondary actions, highlights |
| `tertiary` | `#9C88FF` | Purple — tertiary accents |
| `alternate` | `#E5E5E5` | Light gray — dividers, disabled states |

#### Text Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `primaryText` | `#2F2F2F` | Dark gray — primary body text |
| `secondaryText` | `#5A5A5A` | Medium gray — subtitles, labels |
| `primaryBackground` | `#F9F9E8` | Cream/off-white — page backgrounds |
| `secondaryBackground` | `#FFFFFF` | White — card backgrounds |

#### Accent Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `accent1` | `#4D96FF` | Blue — info/link |
| `accent2` | `#FF6B6B` | Red/coral — warnings, delete |
| `accent3` | `#6D9F71` | Green — success |
| `accent4` | `#FFBC42` | Yellow — caution |

#### Semantic Colors
| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#249689` | Positive feedback |
| `warning` | `#F9CF58` | Caution messages |
| `error` | `#FF5963` | Error states |
| `info` | `#FFFFFF` | Info (currently white — likely wrong) |

#### Dark Mode Equivalents
Dark mode colors are defined in the theme file. The existing dark mode implementation uses `SharedPreferences` to persist theme choice — this pattern is valid and should be kept.

---

### Typography

**Font families:**
- **Outfit** — Display, Headline, Title Large
- **Poppins** — Body, Label, Title Medium/Small

Both loaded via `GoogleFonts` package.

#### Type Scale (from FlutterFlow theme)
| Style | Font | Size | Weight |
|-------|------|------|--------|
| `displayLarge` | Outfit | 64 | normal |
| `displayMedium` | Outfit | 44 | normal |
| `displaySmall` | Outfit | 36 | normal |
| `headlineLarge` | Outfit | 32 | normal |
| `headlineMedium` | Outfit | 24 | normal |
| `headlineSmall` | Outfit | 20 | normal |
| `titleLarge` | Outfit | 22 | normal |
| `titleMedium` | Poppins | 16 | 500 |
| `titleSmall` | Poppins | 14 | 500 |
| `bodyLarge` | Poppins | 16 | normal |
| `bodyMedium` | Poppins | 14 | normal |
| `bodySmall` | Poppins | 12 | normal |
| `labelLarge` | Poppins | 14 | 500 |
| `labelMedium` | Poppins | 12 | normal |
| `labelSmall` | Poppins | 11 | 500 |

---

## Design Debt (MVP Problems)

### 1. Material 2 mode
```dart
// flutter_flow_theme.dart
useMaterial3: false  // Still on Material 2
```
FlutterFlow defaults to Material 2. Material 3 has been stable since Flutter 3.7 and is the current standard. Material 2 components look dated and will not receive future Flutter updates.

**V1 action:** Enable `useMaterial3: true` and audit every component for visual regressions.

### 2. FlutterFlow default widget styling
FlutterFlow generates code using its own widget wrappers (`FFButtonWidget`, `FlutterFlowDropDown`, etc.). These wrappers have a distinctive look that is recognizable as FlutterFlow default — adequate for MVP, not appropriate for a branded V1.

Affected components:
- Button styling (FFButtonWidget defaults — rounded rects with flat color)
- Text field styling (FF default outlines)
- Dropdown menus (dropdown_button2 with FF styling)
- Bottom sheet modals (FF modal pattern)
- Loading states (FlutterFlow spinners)

**V1 action:** Define a component library that wraps these with brand-specific styling.

### 3. Inconsistent spacing
No spacing scale exists. Padding values appear to be whatever FlutterFlow auto-generated: 8, 10, 12, 16, 20, 24, 30 used inconsistently. Without a scale, visual rhythm is off across screens.

**V1 action:** Define an 8px base grid. All spacing values must be multiples of 4 or 8.

### 4. No shadow/elevation system
Shadows and elevations appear ad-hoc — some cards have shadow, some don't, no consistency.

**V1 action:** Define 3–4 elevation levels as constants.

### 5. `info` color is white
The semantic `info` color is set to `#FFFFFF` (white), which renders as invisible on white backgrounds.

**V1 action:** Change to `#4D96FF` (accent1/blue) — the standard convention for info.

### 6. Missing accessible contrast checks
The cream background (`#F9F9E8`) with `secondaryText` (`#5A5A5A`) has not been verified against WCAG AA contrast requirements.

**V1 action:** Verify all foreground/background combinations meet 4.5:1 minimum ratio.

---

## V1 Design Goals

### Primary goal: Move beyond FlutterFlow defaults

The brand identity of Afro Health should feel warm, rooted, and culturally resonant. The existing color palette (teal primary, orange secondary, cream background) is a good foundation — the problem is execution quality.

### Goal 1: Enable Material 3
Switch `useMaterial3: true` in the theme. This unlocks better typography, color scheme, shape theming, and component quality from Flutter's built-in widgets.

### Goal 2: Define a spacing scale
```dart
// lib/flutter_flow/flutter_flow_theme.dart or new lib/utils/spacing.dart
class AppSpacing {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
}
```

### Goal 3: Button hierarchy
Define 3 button variants with clear visual hierarchy:

| Variant | Use case | Style |
|---------|----------|-------|
| Primary | Main CTA (e.g., "Save", "Generate Plan") | Filled, brand teal |
| Secondary | Supporting action (e.g., "Cancel", "Skip") | Outlined, teal border |
| Destructive | Delete, remove actions | Filled, error red |

### Goal 4: Card system
Define a consistent card style used across meal cards, recipe cards, and list items:

| Property | Value |
|----------|-------|
| Border radius | 12px |
| Background | `secondaryBackground` (#FFFFFF) |
| Elevation | 2 (low/medium shadow) |
| Padding | 16px (AppSpacing.md) |

### Goal 5: Dark mode polish
Dark mode exists but was not designed with care — it was auto-generated by FlutterFlow. V1 should audit each screen in dark mode to ensure readability and visual consistency.

---

## Component Inventory

68 components in `lib/components/`. Below is the list by category with V1 design actions.

### AI & Chat
| Component | File | V1 Action |
|-----------|------|-----------|
| AI Chat message | `ai_chat_widget.dart` | Redesign — improve bubble layout |
| AI Thread | `ai_thread_widget.dart` | Redesign — text input styling |
| Chat message | `chat_widget.dart` | Redesign — message bubble consistency |
| Chat user | `chat_user_widget.dart` | Keep — avatar + name pattern is fine |
| Conversation message | `conversation_message_widget.dart` | Redesign |

### Meal Management
| Component | File | V1 Action |
|-----------|------|-----------|
| Add meal | `add_meal_widget.dart` | Keep structure, style upgrade |
| Add snack | `add_snack_widget.dart` | Keep structure, style upgrade |
| Unpaid meal | `unpaid_meal_widget.dart` | Keep — paywall component |

### Progress Tracking
| Component | File | V1 Action |
|-----------|------|-----------|
| Daily recap | `daily_recap_widget.dart` | Keep (canonical) |
| Daily recap copy | `daily_recap_copy_widget.dart` | **DELETE** |
| Daily recap view | `daily_recapv_view_widget.dart` | Audit — merge with daily_recap or keep if distinct purpose |
| Weekly recap | `weeklyrecap_widget.dart` | Keep (canonical) |
| Weekly recap copy | `weeklyrecap_copy_widget.dart` | **DELETE** |
| Weekly int | `weekly_int_widget.dart` | Keep (canonical) |
| Weekly int copy | `weekly_int_copy_widget.dart` | **DELETE** |

### Group Management
| Component | File | V1 Action |
|-----------|------|-----------|
| Group creation | `group_creation_widget.dart` | Style upgrade |
| Edit group | `edit_group_widget.dart` | Style upgrade |
| Delete group | `delete_group_widget.dart` | Keep — confirmation pattern |

### Notifications
| Component | File | V1 Action |
|-----------|------|-----------|
| Notification | `notification_widget.dart` | Keep |
| Chat notification | `notification_chat_widget.dart` | Keep |
| Demand notification | `notification_demand_widget.dart` | Keep |

### Filtering & Search
| Component | File | V1 Action |
|-----------|------|-----------|
| Recipe filters | `recipe_filters_widget.dart` | Keep (canonical) |
| Recipe filters copy | `recipe_filters_copy_widget.dart` | **DELETE** |
| Tag and/or | `tag_and_or_widget.dart` | Keep |
| Type and/or | `type_and_or_widget.dart` | Keep |
| Ordering selector | `oredering_selector_widget.dart` | Keep, fix typo in filename |
| Ordering icon | `ordering_icon_widget.dart` | Keep |

### Plan Errors
| Component | File | V1 Action |
|-----------|------|-----------|
| Diet plan error | `diet_plan_error_widget.dart` | Keep pattern, style upgrade |
| Meal plan error | `meal_plan_error_widget.dart` | Keep pattern, style upgrade |

### Utilities
| Component | File | V1 Action |
|-----------|------|-----------|
| Text field | `textfield_widget.dart` | Redesign with new style |
| Error component | `error_comp_widget.dart` | Keep pattern |
| Similar recipe | `similar_receipe_widget.dart` | Keep, fix typo in filename |

---

## V1 Design Action Items (Priority Order)

| Priority | Action | File(s) |
|----------|--------|---------|
| 1 | Enable Material 3 | `lib/flutter_flow/flutter_flow_theme.dart` |
| 2 | Fix `info` color (#FFFFFF → #4D96FF) | `lib/flutter_flow/flutter_flow_theme.dart` |
| 3 | Define spacing scale (AppSpacing class) | `lib/utils/spacing.dart` (new) |
| 4 | Delete 8 `_copy_` component files | `lib/components/` |
| 5 | Define 3-variant button system | `lib/flutter_flow/flutter_flow_theme.dart` + button components |
| 6 | Define card elevation system | Theme extensions |
| 7 | Audit dark mode on all screens | All page widgets |
| 8 | Verify contrast ratios | All text/background pairs |
| 9 | Fix typo in `oredering_selector_widget.dart` filename | `lib/components/` |
| 10 | Fix typo in `similar_receipe_widget.dart` filename | `lib/components/` |

---

## What Not to Change in V1

- **Color palette** (teal, orange, cream) — the brand identity is solid, just poorly executed
- **Font families** (Outfit + Poppins) — good pairing, keep
- **Dark mode toggle mechanism** (SharedPreferences) — works correctly
- **i18n infrastructure** (FFLocalizationsDelegate + 6 locales) — already multilingual, preserve it
