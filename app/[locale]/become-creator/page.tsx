import { Link } from "@/lib/i18n/navigation";
import type { Metadata } from "next";
import { faqData } from "@/data/faq";
import { FAQAccordion } from "@/components/ui/FAQAccordion";

export const metadata: Metadata = {
  title: "Devenir créateur Akeli — Partagez vos recettes, gagnez des revenus",
  description:
    "Rejoignez Akeli en tant que créateur culinaire. Publiez vos recettes de la diaspora africaine, construisez votre audience et générez des revenus durables.",
};

const prospectFAQ = faqData.filter((q) => q.placement === "creator_page");

const STEPS = [
  {
    number: "1",
    title: "Créez votre compte",
    description: "Inscription gratuite en 2 minutes. Aucune carte bancaire requise.",
  },
  {
    number: "2",
    title: "Publiez vos premières recettes",
    description: "Un wizard guidé en 6 étapes. L'IA traduit automatiquement dans 8 langues.",
  },
  {
    number: "3",
    title: "Partagez avec votre audience",
    description: "Votre profil public et vos recettes sont accessibles depuis l'app mobile.",
  },
  {
    number: "4",
    title: "Percevez vos revenus",
    description: "1€ par tranche de 90 consommations. Paiement le 5 de chaque mois via Stripe.",
  },
];

const STATS = [
  { value: "30 min", label: "pour publier une recette" },
  { value: "8", label: "langues automatiques" },
  { value: "1€", label: "pour 90 consommations" },
  { value: "0%", label: "de commission Akeli" },
];

export default function BecomeCreatorPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <section className="px-4 pt-20 pb-16 text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            Créateurs Akeli V1
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight leading-tight">
            Votre cuisine vaut plus qu'un like.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Publiez vos recettes sur Akeli, touchez une audience qui cherche exactement votre
            cuisine, et générez des revenus durables — sans dépendre des algorithmes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Rejoindre gratuitement
            </Link>
            <a
              href="#faq"
              className="inline-flex items-center justify-center rounded-lg border border-border px-8 py-3 text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              Questions fréquentes
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="bg-secondary/40 px-4 py-10">
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center space-y-1">
              <p className="text-3xl font-bold text-primary">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comment ça marche ── */}
      <section className="px-4 py-16">
        <div className="max-w-3xl mx-auto space-y-10">
          <h2 className="text-2xl font-bold text-foreground text-center">
            Démarrer en 4 étapes
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="rounded-xl border border-border bg-card p-5 flex gap-4"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                  {step.number}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{step.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Modèle économique ── */}
      <section className="bg-secondary/40 px-4 py-16">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Comment vous êtes rémunéré</h2>
            <p className="text-sm text-muted-foreground">
              Deux sources de revenus complémentaires, sans commission Akeli.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {/* Mode standard */}
            <div className="rounded-xl border border-border bg-card p-6 space-y-3">
              <h3 className="text-base font-semibold text-foreground">Mode standard</h3>
              <p className="text-3xl font-bold text-primary">1€</p>
              <p className="text-xs text-muted-foreground">par tranche de 90 consommations</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Chaque fois qu'un utilisateur consomme l'une de vos recettes dans son plan
                alimentaire, c'est comptabilisé. Les consommations s'accumulent d'un mois à
                l'autre — rien n'est perdu.
              </p>
            </div>
            {/* Mode Fan */}
            <div className="rounded-xl border border-primary/40 bg-primary/5 p-6 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">Mode Fan</h3>
                <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  dès 30 recettes
                </span>
              </div>
              <p className="text-3xl font-bold text-primary">1€/fan</p>
              <p className="text-xs text-muted-foreground">garanti chaque mois</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vos fans les plus fidèles vous dédient leur abonnement complet. 100 fans =
                100€/mois stables, indépendamment des consommations.
              </p>
              <Link
                href="/help/mode-fan"
                className="inline-flex items-center text-xs font-medium text-primary hover:underline gap-1"
              >
                En savoir plus →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="px-4 py-16">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-foreground text-center">
            Questions fréquentes
          </h2>
          <FAQAccordion items={prospectFAQ} showCategories expandFirst={false} />
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-primary px-4 py-16 text-center">
        <div className="max-w-xl mx-auto space-y-5">
          <h2 className="text-2xl font-bold text-primary-foreground">
            Prêt à partager votre cuisine ?
          </h2>
          <p className="text-sm text-primary-foreground/80">
            Inscription gratuite. Aucun engagement. Vos premières recettes en ligne en moins
            d'une heure.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-lg bg-white text-primary px-8 py-3 text-sm font-semibold hover:bg-white/90 transition-colors"
          >
            Créer mon compte créateur
          </Link>
        </div>
      </section>

      {/* ── Footer links ── */}
      <footer className="border-t border-border px-4 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Retour à l'accueil
          </Link>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/legal/terms" className="hover:text-foreground">CGU</Link>
            <Link href="/legal/privacy" className="hover:text-foreground">Confidentialité</Link>
            <a href="mailto:creators@akeli.app" className="hover:text-foreground">Contact créateurs</a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
