# Auth Pages Specification

> Pages: Authentication, Inscription (Onboarding), Patient Intake, Terms & Conditions

---

## Page 13 — Authentication

**Route:** `/authentification` · `AuthentificationWidget`
**Auth Required:** No (pre-login)
**MVP file:** `lib/user_authentification/authentification/authentification_widget.dart`

### Purpose
Entry point for new and returning users — dual-tab interface for sign-up (email/password) and login.

### UI Layout

```
┌─────────────────────────────────┐
│                                 │
│         Afro Health             │  ← Large brand title, primary color
│   Bienvenue sur AfroHealth      │  ← subtitle
│                                 │
│  ╔═════════════════════════╗   │
│  ║ [S'inscrire][Se conn.]  ║   │  ← TabBar
│  ║─────────────────────────║   │
│  ║                         ║   │
│  ║  TAB 1 — SIGN UP        ║   │
│  ║  Se créer un compte     ║   │  ← title
│  ║  Commencez avec Afro... ║   │  ← subtitle
│  ║  ┌───────────────────┐  ║   │
│  ║  │ ✉ Email           │  ║   │
│  ║  └───────────────────┘  ║   │
│  ║  ┌───────────────────┐  ║   │
│  ║  │ 🔒 Mot de passe  👁│  ║   │
│  ║  └───────────────────┘  ║   │
│  ║  ┌───────────────────┐  ║   │
│  ║  │ 🔒 Confirmer     👁│  ║   │
│  ║  └───────────────────┘  ║   │
│  ║  [     Commencer     ]  ║   │  ← 230×52px primary button
│  ║                         ║   │
│  ║  TAB 2 — LOGIN          ║   │
│  ║  Heureux de vous revoir ║   │
│  ║  ┌───────────────────┐  ║   │
│  ║  │ ✉ Email           │  ║   │
│  ║  └───────────────────┘  ║   │
│  ║  ┌───────────────────┐  ║   │
│  ║  │ 🔒 Mot de passe  👁│  ║   │
│  ║  └───────────────────┘  ║   │
│  ║  [   Se connecter    ]  ║   │
│  ║  Mot de passe oublié?   ║   │  ← Link → /forgottenPassword
│  ╚═════════════════════════╝   │
└─────────────────────────────────┘
```

**Header (230px):** "Afro Health" brand title in primary color, subtitle "Bienvenue sur AfroHealth"

**Card container:** 530–630px height, max-width 570px, centered, with shadow

**TabBar:** "S'inscrire" | "Se connecter", `TabController(length: 2)`

---

**Tab 1 — Sign Up:**
- Title "Se créer un compte", subtitle "Commencez avec Afrohealth…"
- 3 `TextFormField` inputs:
  1. Email (`emailAddressCreateTextController`) — `TextInputType.emailAddress`
  2. Password (`passwordCreateTextController`) — obscureText, visibility toggle 👁
  3. Confirm password (`passwordConfirmTextController`) — obscureText, visibility toggle 👁
- "Commencer" button (230×52px, primary, rounded) → validate + create account

**Tab 2 — Login:**
- Title "Heureux de vous revoir !"
- 2 `TextFormField` inputs:
  1. Email (`emailAddressTextController`)
  2. Password (`passwordTextController`) — obscureText, visibility toggle
- Login button → authenticate
- "Mot de passe oublié ?" link → `/forgottenPassword`

### Data Sources

**On Sign Up:**
1. `authManager.createAccountWithEmail(email, password)` → Firebase user (MVP) / Supabase Auth (V1)
2. `users.insert({ user_mail, user_id })` — create user record in Supabase
3. `user_subscription.insert({ user_id, start_date, active: true })` — initialize subscription
4. `notification_preferences.insert({ user_id })` — initialize notification settings

**On Login:**
1. `authManager.signInWithEmail(email, password)` → validate credentials

### User Interactions

| Action | Result |
|--------|--------|
| Tap email/password fields | Focus, open keyboard |
| Tap 👁 visibility icon | Toggle `obscureText` |
| Tap "Commencer" | Validate passwords match → create account → insert DB records → navigate to `/inscriptionpage` |
| Tap "Se connecter" | Validate credentials → navigate to `/home` |
| Tap "Mot de passe oublié ?" | Navigate to `/forgottenPassword` |
| Switch tab | Show sign-up or login form |

### Navigation

- **Arrives from:** App launch (unauthenticated), logout
- **Goes to:** `/inscriptionpage` (new user), `/home` (returning user), `/forgottenPassword`

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `tabBarController` | `TabController(length: 2)` | Active tab |
| `emailAddressCreateTextController` | `TextEditingController` | Sign-up email |
| `passwordCreateTextController` | `TextEditingController` | Sign-up password |
| `passwordConfirmTextController` | `TextEditingController` | Sign-up confirm |
| `emailAddressTextController` | `TextEditingController` | Login email |
| `passwordTextController` | `TextEditingController` | Login password |
| `passwordCreateVisibility` | `bool` | Show/hide password 1 |
| `passwordConfirmVisibility` | `bool` | Show/hide password 2 |
| `passwordVisibility` | `bool` | Show/hide login password |

### Embedded Components

- None (self-contained form page)
- Animations: `containerOnPageLoadAnimation`, `columnOnPageLoadAnimation1/2`

### V1 Changes

- **Replace Firebase Auth with Supabase Auth** — `Supabase.instance.client.auth.signUp()` + `signInWithPassword()`
- **Remove Firebase user record creation** — Supabase Auth creates the user automatically
- Add Google Sign-In button (Supabase OAuth)
- Add Apple Sign-In button (Supabase OAuth)
- Add form validation (email format check, password minimum length 8 chars)
- Show inline error messages (not SnackBar) for failed login / password mismatch
- Add "Mot de passe oublié ?" to login tab (currently may be missing or incomplete)
- On successful sign-up: check if `users` row exists before inserting (handle duplicate)

---

## Page 14 — Inscription (Onboarding)

**Route:** `/inscriptionpage` · `InscriptionpageWidget`
**Auth Required:** Yes (post sign-up)
**MVP file:** `lib/inscriptionpage/inscriptionpage_widget.dart`

### Purpose
Multi-page onboarding flow that collects the user's health parameters and goals immediately after account creation.

### UI Layout

```
┌─────────────────────────────────┐
│                    [Passer →]   │  ← Skip button (top right)
├─────────────────────────────────┤
│  Faisons connaissance           │  ← Page heading
│                                 │
│  Comment vous appelez-vous ?    │
│  ┌───────────────────────────┐  │
│  │ Votre prénom...           │  │
│  └───────────────────────────┘  │
│                                 │
│  Votre âge                      │
│  ┌───────────┐                  │
│  │ 28        │                  │
│  └───────────┘                  │
│                                 │
│  Poids actuel (kg)              │
│  ┌───────────┐                  │
│  │ 75        │                  │
│  └───────────┘                  │
│                                 │
│  Taille (cm)                    │
│  ┌───────────┐                  │
│  │ 175       │                  │
│  └───────────┘                  │
│                                 │
│  Poids cible (kg)               │
│  ┌───────────┐                  │
│  │ 70        │                  │
│  └───────────┘                  │
│                                 │
│  Comment mangez-vous ?          │
│  Régime particulier ?           │
│                                 │
├─────────────────────────────────┤
│  ○ ○ ● ○ ○  (page indicator)   │  ← SmoothPageIndicator
└─────────────────────────────────┘
```

**Layout:** `PageView` with `PageController(initialPage: 0)` — horizontal swipe between pages

**Skip Button:** top-right "Passer →" → navigate directly to `/home` without completing onboarding

**SmoothPageIndicator:** bottom, tracks current page, dot-per-page

**Form Fields (across pages):**
- Name (`TextFormField`) — pre-filled from `users.name`
- Age (`TextFormField`, numeric keyboard, `ageFocusNode`)
- Current weight in kg (`weightFocusNode`)
- Height in cm (`heightFocusNode`)
- Target weight in kg (`targetWeightFocusNode`)
- Eating style — dropdown or radio (from `eating_style` table)
- Special diet (`regimeparticulierFocusNode`) — text or dropdown
- Motivation (`motivationFocusNode`) — free text or choice chips
- Activity level — radio or choice chips (from `activity_level` table)

### Data Sources

| Table | Query | Purpose |
|-------|-------|---------|
| `users` | `.eq('user_id', uid).single()` | Pre-fill name |
| `user_health_parameter` | `.eq('user_id', uid).maybeSingle()` | Pre-fill if exists |
| `eating_style` | all rows | Eating style options |
| `activity_level` | all rows | Activity level options |
| `diet_type` | all rows | Diet type options |

**On save:**
- `user_health_parameter.upsert({ user_id, age, weight, height, target_weight, … })` — or insert if new
- Optionally triggers `PersonalMealPlanCall` or `DietPlanCall` edge function to generate initial plan

### User Interactions

| Action | Result |
|--------|--------|
| Swipe left/right | Navigate between onboarding pages |
| Tap "Passer" | Skip onboarding → navigate to `/home` |
| Fill text fields | Update local state |
| Select eating style | Set radio/dropdown value |
| Complete all pages | Save to `user_health_parameter` → navigate to `/home` |

### Navigation

- **Arrives from:** `/authentification` (post sign-up)
- **Goes to:** `/home` (skip or complete), `/create05PatientIntake` (if additional intake needed)

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `pageViewController` | `PageController` | Swipe navigation |
| `nameFocusNode` | `FocusNode` | Name field |
| `ageFocusNode` | `FocusNode` | Age field |
| `weightFocusNode` | `FocusNode` | Weight field |
| `heightFocusNode` | `FocusNode` | Height field |
| `targetWeightFocusNode` | `FocusNode` | Target weight field |
| `motivationFocusNode` | `FocusNode` | Motivation field |

### Embedded Components

- `SmoothPageIndicator`

### V1 Changes

- **Progressive disclosure:** split into logical page groups (Who are you? / Your goals? / Your diet?)
- **Save partial progress:** upsert to `user_health_parameter` after each page so skip doesn't lose data
- **Better validation:** show inline errors when numeric fields receive non-numeric input
- **Clearer CTA:** each page has "Suivant →" button (don't rely solely on swipe gesture)
- **Completion trigger:** on final page "Terminer" → call `PersonalMealPlanCall` to generate initial plan → `/home`

---

## Page 15 — Patient Intake

**Route:** `/create05PatientIntake` · `Create05PatientIntakeWidget`
**Auth Required:** Yes (post sign-up flow)
**MVP file:** `lib/user_authentification/create05_patient_intake/create05_patient_intake_widget.dart`

### Purpose
Extended medical intake form for detailed health data collection — used as a supplement to the onboarding flow.

### UI Layout

```
┌─────────────────────────────────┐
│  Patient Intake form        [✕] │  ← AppBar with close button
│  Please fill out the form...    │  ← subtitle
├─────────────────────────────────┤
│  (Scrollable form area)         │
│                                 │
│  Full Name *                    │
│  ┌───────────────────────────┐  │
│  │ Jean Dupont               │  │  ← words capitalization
│  └───────────────────────────┘  │
│                                 │
│  Age                            │
│  ┌───────────┐                  │
│  │ 35        │                  │  ← numeric
│  └───────────┘                  │
│                                 │
│  Téléphone                      │
│  ┌───────────────────────────┐  │
│  │ +33 6 12 34 56 78         │  │  ← masked phone input
│  └───────────────────────────┘  │
│                                 │
│  Date de naissance              │
│  ┌───────────────────────────┐  │
│  │ JJ/MM/AAAA                │  │  ← masked ##/##/####
│  └───────────────────────────┘  │
│                                 │
│  Description / Notes            │
│  ┌───────────────────────────┐  │
│  │                           │  │  ← multiline textarea
│  │                           │  │
│  └───────────────────────────┘  │
│                                 │
│  (additional fields below…)     │
│                                 │
├─────────────────────────────────┤
│  [         Soumettre         ]  │  ← Fixed bottom submit button
└─────────────────────────────────┘
```

**AppBar:** title "Patient Intake form", subtitle "Please fill out the form below...", close button [✕] at top-right

**Body:** `Form` widget with `autovalidateMode`, scrollable `Column`

**Fields:**
1. **Full Name** (required) — `TextCapitalization.words`
2. **Age** — numeric input
3. **Phone Number** — `MaskTextInputFormatter` for phone format
4. **Date of Birth** — `MaskTextInputFormatter(mask: '##/##/####')`
5. **Description/Notes** — multiline `TextFormField`
6. Additional fields (allergies, medical conditions, etc.) — below visible section

**Submit button:** fixed at bottom, full-width

### Data Sources

On submit: insert or upsert to patient intake table (likely `user_health_parameter` extended fields or a dedicated patient table)

### User Interactions

| Action | Result |
|--------|--------|
| Tap [✕] close | Pop navigation without saving |
| Fill form fields | Update local state |
| Tap phone field | Masked input activates |
| Tap DOB field | Masked input activates (DD/MM/YYYY) |
| Tap "Soumettre" | Validate form → save to Supabase → pop navigation |

### Navigation

- **Arrives from:** Onboarding flow or profile setup
- **Goes to:** Pops to previous screen on submit or close

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `_model.formKey` | `GlobalKey<FormState>` | Form validation |
| `fullNameTextController` | `TextEditingController` | Name input |
| `ageTextController` | `TextEditingController` | Age input |
| `phoneNumberTextController` | `TextEditingController` | Phone input |
| `dateOfBirthTextController` | `TextEditingController` | DOB input |
| `descriptionTextController` | `TextEditingController` | Notes input |
| `dateOfBirthMask` | `MaskTextInputFormatter` | `##/##/####` |

### V1 Changes

- Clarify relationship to `Inscription` onboarding — currently both collect health data; consolidate or clarify which data goes where
- Use `FlutterFlowChoiceChips` (already used in MVP) for allergy and diet selection
- Add back button (currently only has close `✕`)

---

## Page 16 — Terms & Conditions (CGU)

**Route:** `/cgu` · `CguWidget`
**Auth Required:** No
**MVP file:** `lib/cgu/cgu_widget.dart`

### Purpose
Full terms and conditions document with acceptance toggle and confirmation button — required for regulatory compliance.

### UI Layout

```
┌─────────────────────────────────┐
│  (87% of screen height)         │
│                                 │
│  [FlutterFlowWebView]           │
│  ┌─────────────────────────┐   │
│  │  AKELI                  │   │
│  │  Conditions Générales   │   │
│  │  d'Utilisation          │   │
│  │                         │   │
│  │  En bref:               │   │
│  │  • 7 jours d'essai      │   │
│  │  • 4,99€/mois           │   │
│  │  • Annulation libre     │   │
│  │  • IA = informatif      │   │
│  │  • Non remboursable     │   │
│  │                         │   │
│  │  1. ACCEPTATION DES CGU │   │
│  │  2. ACCÈS...            │   │
│  │  ... (12 sections)      │   │
│  └─────────────────────────┘   │
├─────────────────────────────────┤
│  (13% of screen height)         │
│  ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔   │  ← border top
│  [✓] Vous acceptez les CGU...  │  ← SwitchListTile
│  [         Confirmer         ]  │  ← Button
└─────────────────────────────────┘
```

**Layout:** `Stack` — WebView occupies 87% height, footer bar 13%

**WebView Content (FlutterFlowWebView):** Static HTML embedded in widget, rendering the full legal document:
- Header: "AKELI" logo + "Conditions Générales d'Utilisation" + date
- Summary box: key bullet points (trial, price, cancellation, AI disclaimer, refund policy)
- 12 numbered sections covering all legal requirements
- Contact info: `legal@akeli.app`
- Footer: copyright

**Footer Bar:**
- Top border separator
- `SwitchListTile.adaptive`: "Vous acceptez les conditions générales d'utilisation" — `trailingCheckbox` position
- "Confirmer" button (40px height, primary bg, white text)

### Data Sources

None — static HTML content embedded in widget. No API calls.

### User Interactions

| Action | Result |
|--------|--------|
| Scroll WebView | Read T&C content |
| Toggle switch | Set `switchListTileValue` |
| Tap "Confirmer" | Currently: `print('Button pressed...')` — not implemented |

### Navigation

- **Arrives from:** Signup flow, profile settings (legal links)
- **Goes to:** Depends on context (signup flow → next step; settings → pop)

### State

| Variable | Type | Purpose |
|----------|------|---------|
| `switchListTileValue` | `bool` | T&C acceptance (default: `true`) |

### V1 Changes

- **Implement "Confirmer" action** — currently a `print()` stub:
  - Update `user_preferences.cgu_accepted = true` + `cgu_accepted_at = now()`
  - Navigate to next step in flow (home or onboarding)
- The HTML content references "Akeli" — update to "Afro Health" or confirm brand name
- Default `switchListTileValue = true` (pre-checked) may not meet GDPR requirements — user should actively check the box
- Consider replacing embedded HTML with a proper `WebView` loading from a URL (easier to update T&C without app update)
- Add "Refuser" option with graceful exit / account deletion flow
