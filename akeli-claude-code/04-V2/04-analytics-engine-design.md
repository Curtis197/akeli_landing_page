# 04 — Creator Analytics Engine

> **Full spec:** `docs/superpowers/specs/2026-06-25-analytics-engine-design.md`
> **Status:** Validated — 2026-06-25
> **Author:** Curtis — Founder Akeli

---

## Summary

The Akeli Creator Analytics Engine gives creators a **data-driven decision system** built on 63 callable functions across two layers, orchestrated by a Claude AI agent.

### Architecture

```
Dashboard (Next.js)
  ├── 20 Insight Cards → direct tool calls + optional "Explain ✨"
  └── Chat Interface → analytics-agent Edge Function
                              │
                    Claude claude-sonnet-4-6 (tool_use)
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    Supabase PostgreSQL              Railway FastAPI
    20 SQL functions                 43 Python endpoints
```

### Function Catalog

| Layer | Domains | Count |
|---|---|---|
| SQL (Supabase) | Revenue · Consumption · Audience · Catalog | 20 |
| Python (Railway) | Original analytics + Niche Research + Idea Validation + Recipe Impact + Audience Study + Potential Audience + Competitive Intelligence + Predictive & Strategy | 43 |
| **Total** | | **63** |

### Python Domains

| Domain | Endpoints | What it answers |
|---|---|---|
| Original Analytics | 8 | Revenue trends, cohorts, patterns, forecasts |
| Niche Research | 6 | Where are the market gaps? What's trending? |
| Idea Validation | 5 | Will this recipe perform? How should I title it? |
| Recipe Impact | 6 | What's the lifecycle of this recipe? What's its halo effect? |
| Audience Study | 6 | Who is my audience really? Are they changing? |
| Potential Audience | 5 | Who could I reach? Where is untapped demand? |
| Competitive Intelligence | 3 | How do I compare to similar creators? |
| Predictive & Strategy | 4 | What will my revenue be next month? What should I build? |

### Key Design Decisions

- `creator_id` always injected server-side — Claude never controls data scoping
- All audience data aggregated and anonymized (min cohort: 10 users)
- Tools execute in parallel when independent
- Pre-built cards bypass agent for speed; "Explain ✨" sends card data directly to Claude (no re-fetch)
- Max agent iterations: 3

### Build Sequence

1. **Phase 1** — 20 SQL functions + agent + revenue cards + chat shell
2. **Phase 2** — 8 original Python endpoints + remaining 15 cards
3. **Phase 3** — 35 expanded Python endpoints + full tool catalog

---

*See full spec for all endpoint definitions, tool formats, and open questions.*
