"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { faqData } from "@/data/faq";
import { FAQAccordion } from "@/components/ui/FAQAccordion";

// ─── Pages d'aide détaillées ──────────────────────────────────────────────────

const HELP_PAGES = [
  {
    slug: "remuneration",
    title: "Comment fonctionnent les revenus créateurs",
    description: "Calcul des consommations, tranches de 90, paiements mensuels.",
    icon: "💰",
    category: "Revenus",
  },
  {
    slug: "mode-fan",
    title: "Le Mode Fan — guide complet",
    description: "Éligibilité, revenus garantis, règles utilisateurs, statistiques.",
    icon: "⭐",
    category: "Mode Fan",
  },
  {
    slug: "traduction",
    title: "Traduction automatique des recettes",
    description: "8 langues disponibles, correction manuelle, langue source.",
    icon: "🌍",
    category: "Langues",
  },
  {
    slug: "stripe-setup",
    title: "Configurer votre compte Stripe",
    description: "Étapes d'onboarding, délai de validation, pays supportés.",
    icon: "💳",
    category: "Paiements",
  },
  {
    slug: "suppression-compte",
    title: "Supprimer votre compte créateur",
    description: "Ce qui est supprimé, ce qui est conservé, revenus dus.",
    icon: "🗑️",
    category: "Compte",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const dashboardFAQ = faqData.filter((q) => q.placement === "dashboard");
const categories = Array.from(new Set(dashboardFAQ.map((q) => q.category)));

export default function HelpPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let result = dashboardFAQ;
    if (activeCategory) {
      result = result.filter((q) => q.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (item) =>
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, activeCategory]);

  const noResults = filtered.length === 0;

  return (
    <div className="max-w-3xl space-y-10">
      {/* ── En-tête ── */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Centre d'aide</h1>
        <p className="text-sm text-muted-foreground">
          45 réponses aux questions les plus fréquentes des créateurs Akeli.
        </p>
      </div>

      {/* ── Guides détaillés ── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Guides complets
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {HELP_PAGES.map((page) => (
            <Link
              key={page.slug}
              href={`/help/${page.slug}`}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-secondary/50 transition-colors group"
            >
              <span className="text-2xl shrink-0">{page.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-tight">
                  {page.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {page.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FAQ avec recherche ── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Questions fréquentes
        </h2>

        {/* Barre de recherche */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setActiveCategory(null);
            }}
            placeholder="Rechercher une question…"
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Effacer la recherche"
            >
              <XIcon />
            </button>
          )}
        </div>

        {/* Filtres par catégorie */}
        {!search && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                activeCategory === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-foreground hover:bg-secondary"
              }`}
            >
              Toutes
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  setActiveCategory((prev) => (prev === cat ? null : cat))
                }
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-foreground hover:bg-secondary"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Résultats */}
        {noResults ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-sm text-foreground font-medium">
              Aucune question trouvée pour "{search}"
            </p>
            <p className="text-xs text-muted-foreground">
              Essaie d'autres mots-clés ou{" "}
              <a href="mailto:creators@akeli.app" className="text-primary hover:underline">
                contacte le support
              </a>
              .
            </p>
          </div>
        ) : (
          <FAQAccordion
            items={filtered}
            showCategories={!search && !activeCategory}
          />
        )}

        {/* Compteur */}
        {!noResults && (
          <p className="text-xs text-muted-foreground text-right">
            {filtered.length} question{filtered.length > 1 ? "s" : ""}
            {search ? ` pour "${search}"` : activeCategory ? ` — ${activeCategory}` : ""}
          </p>
        )}
      </section>

      {/* ── Contact support ── */}
      <section className="rounded-xl border border-border bg-card p-6 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Vous n'avez pas trouvé votre réponse ?
          </p>
          <p className="text-xs text-muted-foreground">
            L'équipe Akeli répond sous 48h ouvrées.
          </p>
        </div>
        <a
          href="mailto:creators@akeli.app"
          className="shrink-0 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Contacter le support
        </a>
      </section>
    </div>
  );
}

// ─── Icônes ───────────────────────────────────────────────────────────────────

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
