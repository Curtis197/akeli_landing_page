# 03 — Creator Monetization & Fan Tiers

> **Status:** Strategic design — validated 2026-06-25
> **Author:** Curtis — Founder Akeli
> **Session:** V2 vision expansion — language, ultralight, growth, conversion, fan tiers

---

## Context

This document captures the V2 strategic updates decided in June 2026. It expands on `01-vision-architecture.md` and `02-specifications-fonctionnelles.md` with four new directions:

1. African language expansion
2. Ultralight data version for Africa
3. Revised growth model
4. Creator conversion improvements
5. Fan Mode V2 — creator-defined tiers (Patreon model)

---

## 1. African Language Expansion

### Current V1 (8 languages)
FR, EN, ES, PT, WO (Wolof), BM (Bambara), LN (Lingala), AR (Arabic)

### V2 Target — Phase 1 additions (better AI coverage)

| Language | Speakers | Region | AI quality |
|---|---|---|---|
| Hausa | 70M+ | West Africa (Nigeria, Niger, Ghana) | Good |
| Yoruba | 50M+ | Nigeria, Benin, Togo | Moderate |
| Igbo | 30M+ | Nigeria | Moderate |
| Amharic | 35M+ | Ethiopia, Eritrea | Good |
| Zulu | 12M+ | South Africa | Moderate |
| Xhosa | 8M+ | South Africa | Moderate |

### V2 Target — Phase 2 (lower AI coverage, needs community validation)

| Language | Speakers | Region | Notes |
|---|---|---|---|
| Twi/Akan | 11M+ | Ghana | Low AI quality — community correction required |
| Fula/Pulaar | 40M+ | Sahel | Low AI quality |
| Tigrinya | 9M+ | Eritrea, Ethiopia | Low AI quality |
| Soninke | 3M+ | Sahel | Very low AI quality |

### Strategy

**The quality problem:** AI translation degrades sharply for low-resource African languages. A bad translation is worse than no translation — it erodes creator trust.

**Solution — Community Correction Layer:**
- Phase 1 languages ship with AI translations + "Help us improve" badge
- Bilingual creators can validate and correct translations directly from the recipe editor
- Corrections are versioned — never overwritten by re-generation
- Incentive: creators who validate translations for a language get a "Language Guardian" badge on their public profile
- Community corrections feed back into improving future AI generations

**Rollout order:** Hausa → Amharic → Yoruba → Igbo → Zulu/Xhosa → Phase 2

---

## 2. Ultralight Data Version for Africa

### Two distinct problems — different priorities

**Problem A — Mobile app (primary):** African consumers on 2G/3G need a low-data consumption mode for the Flutter app.

**Problem B — Web creator platform (secondary):** African creators need the website to load fast on slow connections.

### Mobile App Ultralight Mode (primary target)

Features:
- Reduced image resolution option (thumbnail-quality vs. full-res toggle)
- Download-once meal plans — cache content locally, sync only on WiFi
- Sync-on-WiFi setting — no background data consumption
- Text-first recipe view — images load on tap, not automatically
- Compressed recipe data — strip metadata not needed for offline use
- Offline draft saving — recipe consumption tracking queued and synced later

Implementation approach: Progressive enhancement — ultralight is a settings toggle, not a separate app.

### Web Platform Ultralight (secondary target)

Features:
- PWA with offline draft saving for the recipe wizard (works without connection, syncs when online)
- Aggressive image lazy-loading — no image loads until visible
- Smaller thumbnails on catalog pages (200px vs. 600px)
- Target: recipe wizard initial JS bundle under 50KB
- Target: recipe catalog page load under 2s on 3G

---

## 3. Revised Growth Model

### Why the original model was wrong

The original V2 targets (50 Pro creators at 3 months, 500 at 12 months) assumed slow linear growth. The reality of platforms with direct monetization promises is a step-function. The constraint isn't finding creators — there are millions of people across the diaspora who want to be paid for their cooking. The real constraints are:

- Infrastructure at scale (Supabase, Edge Functions, vectorization costs at 5,000+ creators)
- Support bandwidth (Stripe Connect onboarding issues, payout disputes, account problems)
- Content quality floor (too many low-effort recipes dilute the catalog for mobile users)
- Moderation at scale

### Revised targets

| Milestone | Creators | MRR (Pro Tier) | Key risk |
|---|---|---|---|
| Launch | — | — | Quality bar |
| Month 1 | 500+ | €15,000 | Onboarding bottleneck |
| Month 3 | 2,000+ | €60,000 | Support volume |
| Month 6 | 8,000+ | €240,000 | Infrastructure cost |
| Month 12 | 25,000+ | €750,000 | Content moderation |

*Pricing basis: €30 EU / €12 Africa weighted average ~€20 blended*

### Scaling triggers — infrastructure readiness checkpoints

These must be built **before** hitting the threshold, not after:

| Creator count | Required infrastructure |
|---|---|
| 1,000 | Automated Stripe Connect onboarding (no manual review) |
| 5,000 | Batch vectorization cost cap + caching strategy |
| 10,000 | Dedicated creator support system (not just email) |
| 20,000 | Automated content moderation (AI flagging + human review queue) |
| 50,000 | Sharding strategy for recipe catalog DB |

### Philosophy

> "It will be a race to keep up with the growth rather than a slow growth."

Design every system assuming 10x the conservative number. The biggest risk is not growing fast enough to capture the market — it is infrastructure that breaks under demand.

---

## 4. Creator Conversion Improvements

### The gap

Current funnel: visits `/become-creator` → creates account → publishes first recipe.
The dropout happens between account creation and first published recipe.

### High-impact interventions

**1. AI-assisted recipe drafting**
Not just spell-check — "describe your dish in 2 sentences and we'll draft the full recipe for you to edit." Removes the blank-page problem entirely. Estimated conversion lift: +40%.

**2. Recipe import**
- Paste Instagram/TikTok caption → auto-parsed into recipe form fields
- Photo-to-recipe OCR — upload a photo of a handwritten recipe
- Import from URL (if recipe is already on a blog)

Many creators already have their recipes written informally. Don't make them retype.

**3. Personalized earnings projection on the conversion page**
Dynamic calculator on `/become-creator`:
- "You have X Instagram followers → estimated first-month range: €Y–€Z"
- Shows real comparable creator earnings (anonymized)
- Updates in real-time as they enter their social stats

**4. 7-day onboarding sequence**
Automated email + in-app sequence:
- Day 0: Welcome + "complete your profile" (avatar, bio, region)
- Day 1: "Create your first recipe" — direct link into wizard with a pre-filled example
- Day 3: "You're halfway there" — progress nudge
- Day 5: First earnings projection personalized to their draft recipes
- Day 7: "Your first recipe is live" — celebration + share kit

**5. Recipe duplication tool**
"Duplicate this recipe and modify it" — lets creators build a catalog fast from variations of the same base recipe.

**6. Creator referral (not parrainage — just attribution)**
When a creator shares their referral link and another creator joins and publishes, both get a visibility boost (not cash). Avoids the referral complexity, still drives organic growth.

---

## 5. Fan Mode V2 — Creator-Defined Tiers

### Architecture decision

V2 Fan Mode is **separate** from the V1 in-app Fan Mode.

| | V1 Fan Mode | V2 Creator Tiers |
|---|---|---|
| Platform | Mobile app | Website |
| Model | Meal plan exclusivity (90%) | Subscription to creator content/services |
| Pricing | Fixed €1/month | Creator-defined |
| Fan constraint | One creator only | Multi-creator subscriptions |
| Revenue split | 100% to creator | Platform cut TBD (target 15-20% on tier revenue) |

### Fan relationship model on the website

- **Follow** (free) — you like a creator, you follow them publicly on the website
- **Subscribe to a tier** (paid) — you pay for access to content and services, completely independent of the mobile app's meal plan mechanics
- A fan can subscribe to multiple creators simultaneously at different tier levels

### Creator-defined tier system

Creators define their own tiers — names, prices, and benefits. Akeli provides:
- The billing and payment infrastructure (Stripe)
- The access gating system (what content/features unlock at what tier)
- The delivery infrastructure for platform-native services (vault, AI, community tools)
- A booking + ticketing system for creator-managed services (consultations, events)

Creators set:
- Number of tiers (recommended: 2–4)
- Tier names and descriptions
- Price per tier per month
- Which benefits are included at each tier

### Delivery model: Hybrid

**Platform-delivered (Akeli builds):** Automatically unlocked when a fan subscribes. No creator action required per subscriber.

**Creator-managed (Akeli gates, creator delivers):** Akeli handles billing and access. Creator delivers the service manually. Example: 1-on-1 consultation — fan pays, Akeli notifies creator, creator schedules and delivers.

---

## 6. Full Service Catalog

### SHIP V2 — Akeli builds the infrastructure

**Core vault & access**
- Subscriber-only recipe vault with tier-based unlock levels
- Full recipe detail (complete ingredients + steps, vs. public teasing)
- Early access scheduling — new recipes visible to subscribers before public
- Content archive access — everything the creator ever posted, gated by tier
- Subscriber-only comment sections

**Delivery & downloads**
- PDF recipe booklets — auto-generated from creator's recipes, downloadable
- Recipe variation collections — dietary, regional, substitution bundles

**AI-powered (Akeli-native)**
- AI meal plan built exclusively from a subscribed creator's catalog
- AI shopping list generated from that meal plan
- AI recipe adaptation — "make this keto / halal / dairy-free"
- AI nutritional analysis personalized to subscriber's goals
- AI weekly meal schedule using the creator's recipes
- Personalized recipe recommendations from the creator's catalog

**Community & engagement**
- Private fan community — tier-gated group chat
- Voting / polls — fans vote on creator's next recipe
- Direct messaging access — tier-gated, built on existing chat infrastructure
- Fan recognition — public badge, credits, hall of fame

**Discovery & filtering**
- Macro-optimized collections — filter creator's catalog by fitness goal
- Condition-specific collections — diabetes, hypertension, etc. (tagging layer)

**Gamification**
- Progress tracker — cooking journey with this creator
- Achievement badges — first recipe cooked, 10 cooked, 1 year subscribed
- Subscriber profile badge — shows publicly which tier you're on

---

### V3 ROADMAP — High value, heavy build

- **Live streaming** — cooking classes, live Q&A, cook-alongs (needs WebRTC infrastructure)
- **Structured cooking courses** — curriculum builder, lesson progress tracking
- **AI cooking assistant** — ask questions about creator's recipes (RAG over their catalog)
- **Cooking challenges with feedback** — fan submits a cook attempt, creator responds
- **Offline access** — full PWA sync for low-connectivity Africa use
- **Print-on-demand booklets** — physical recipe books via third-party print API
- **Smart grocery budget optimizer** — AI finds cheapest local sourcing for a meal plan
- **Dual-language exclusive content** — creator records in native language, tier unlocks it

---

### CREATOR-MANAGED — Akeli builds booking + payment + access gating only

**Consulting & personal**
- 1-on-1 cooking consultation (video call)
- Personalized meal plan — creator curates manually per subscriber
- Pantry audit — fan sends photo, creator responds
- Recipe on request — fan names a dish, creator creates it

**Content (creator hosts or links)**
- Behind-the-scenes content
- Exclusive video tutorials
- Technique deep-dives, cultural history, oral stories, regional guides
- Diaspora adaptation guides — cooking X in Europe with local supermarket substitutes
- Cooking in original language

**Events (creator organizes, Akeli does ticketing)**
- In-person cooking workshops
- Supper club / private dining experience
- Cooking retreat (high-tier)
- Market or farm visit with creator
- Monthly virtual meetup

**Physical goods (creator fulfills)**
- Custom spice blends
- Limited edition cookbook
- Branded merchandise — apron, tote
- Handwritten recipe cards for top-tier fans

**Mentorship**
- Aspiring creator mentorship
- Food content strategy consulting
- Catering / pop-up business advice

---

### SKIP — Low signal or operationally unviable

- Meal kit delivery — logistics, perishables, regulations
- Ingredient kits — same reasons
- Preserved foods (creator-made condiments) — food safety regulations, customs
- Farm visits — niche, disconnected from platform role
- Live interactive technique correction — high creator effort, very small audience
- Virtual dinner parties — operationally unviable at scale
- Signed prints — niche, very low WTP

---

## 7. Platform Build Summary — V2

| Category | What Akeli builds |
|---|---|
| Tier system | Creator tier configuration UI, Stripe billing per tier, access gating engine |
| Vault | Tiered recipe unlock, PDF generation, archive access |
| AI layer | Meal plan, shopping list, recipe adaptation, nutritional analysis, recommendations |
| Community | Tier-gated group chat, polls/voting, DM access levels |
| Gamification | Progress tracker, achievement badges, subscriber profile badges |
| Booking | Consultation booking widget, event ticketing, payment split |
| Discovery | Macro/condition tagging + filtering on creator catalog |
| Onboarding | AI recipe drafting, import tools, 7-day sequence |

---

## 8. Open Questions

- Platform cut on tier revenue: 15%? 20%? Sliding scale by tier price?
- Minimum payout threshold for tier revenue (separate from recipe consumption revenue)?
- Moderation policy for creator-managed physical goods (quality, customs, refunds)?
- Should Akeli offer a "suggested tier template" to reduce creator decision fatigue?
- Creator verification / trust badges for creators offering high-ticket consulting?

---

*Document created: 2026-06-25*
*Author: Curtis — Founder Akeli*
*Version: 1.0 — V2 Creator Monetization & Fan Tiers*
