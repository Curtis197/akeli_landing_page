import Image from "next/image";
import { Link } from "@/lib/i18n/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
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
    img: "/akeli/creator-kitchen.jpg",
  },
  {
    number: "2",
    title: "Publiez vos premières recettes",
    description: "Un wizard guidé en 6 étapes. L'IA traduit automatiquement dans 8 langues.",
    img: "/akeli/plantains.jpg",
  },
  {
    number: "3",
    title: "Partagez avec votre audience",
    description: "Votre profil public et vos recettes sont accessibles depuis l'app mobile.",
    img: "/akeli/couple-phone.jpg",
  },
  {
    number: "4",
    title: "Percevez vos revenus",
    description: "1€ par tranche de 90 consommations. Paiement le 5 de chaque mois via Stripe.",
    img: "/akeli/friends-meal.jpg",
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
    <>
      <Navbar />
      <main style={{ fontFamily: "var(--font-sans)" }}>

        {/* ── Hero ── */}
        <section className="grid lg:grid-cols-2 min-h-[calc(100svh-56px)]">
          {/* Left — text */}
          <div
            className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 py-16 lg:py-0 order-2 lg:order-1"
            style={{ backgroundColor: "var(--color-brand-cream)" }}
          >
            <h1
              className="font-bold leading-[1.05] mb-6 text-4xl sm:text-5xl lg:text-6xl xl:text-[4.5rem]"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)" }}
            >
              Votre cuisine vaut plus qu'un like.
            </h1>

            <p
              className="text-base sm:text-lg max-w-md mb-10 leading-relaxed"
              style={{ color: "var(--color-brand-forest)" }}
            >
              Publiez vos recettes sur Akeli, touchez une audience qui cherche exactement votre
              cuisine, et générez des revenus durables — sans dépendre des algorithmes.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{ backgroundColor: "var(--color-brand-dark)", color: "#fff" }}
              >
                Rejoindre gratuitement
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <a
                href="#faq"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 px-7 py-4 text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{ borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }}
              >
                Questions fréquentes
              </a>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-4">
              {STATS.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)" }}>
                    {s.value}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-brand-forest)" }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — image */}
          <div
            className="relative min-h-[65vw] sm:min-h-[55vw] lg:min-h-0 order-1 lg:order-2 overflow-hidden"
            style={{ backgroundColor: "var(--color-brand-dark)" }}
          >
            <Image
              src="/akeli/creator-kitchen.jpg"
              fill
              alt="Créatrice Akeli en cuisine"
              className="object-cover object-center"
              style={{ opacity: 0.88 }}
              priority
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(28,43,28,0.6) 0%, transparent 50%)" }}
            />
            <div
              className="absolute bottom-8 left-6 sm:bottom-10 sm:left-10 rounded-2xl px-5 py-3"
              style={{ backgroundColor: "rgba(245,165,35,0.95)", color: "var(--color-brand-dark)" }}
            >
              <p className="text-2xl font-bold leading-none" style={{ fontFamily: "var(--font-display)" }}>0%</p>
              <p className="text-xs font-semibold mt-0.5">de commission Akeli</p>
            </div>
          </div>
        </section>

        {/* ── Comment ça marche ── */}
        <section className="px-6 sm:px-12 py-20 sm:py-28" style={{ backgroundColor: "var(--color-brand-cream)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--color-brand-green)" }}>
                Simple &amp; guidé
              </p>
              <h2
                className="text-4xl sm:text-5xl font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)" }}
              >
                Démarrer en 4 étapes
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {STEPS.map((step) => (
                <div key={step.number} className="group flex flex-col">
                  <div className="relative h-48 rounded-2xl overflow-hidden mb-5">
                    <Image
                      src={step.img}
                      fill
                      alt={step.title}
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(to top, rgba(28,43,28,0.65) 0%, transparent 55%)" }}
                    />
                    <div
                      className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: "var(--color-brand-amber)", color: "var(--color-brand-dark)" }}
                    >
                      {step.number}
                    </div>
                  </div>
                  <h3 className="font-semibold text-base mb-2" style={{ color: "var(--color-brand-dark)" }}>
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--color-brand-forest)" }}>
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Modèle économique ── */}
        <section className="px-6 sm:px-12 py-20 sm:py-28" style={{ backgroundColor: "var(--color-brand-dark)" }}>
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Image */}
            <div className="relative h-[380px] sm:h-[440px] rounded-3xl overflow-hidden">
              <Image
                src="/akeli/diaspora-couple.jpg"
                fill
                alt="Créateurs Akeli"
                className="object-cover object-center"
              />
              <div
                className="absolute bottom-6 left-6 rounded-2xl px-5 py-4"
                style={{ backgroundColor: "rgba(245,165,35,0.95)", color: "var(--color-brand-dark)" }}
              >
                <p className="text-3xl font-bold leading-none" style={{ fontFamily: "var(--font-display)" }}>1€/fan</p>
                <p className="text-xs font-semibold mt-1">garanti chaque mois</p>
              </div>
            </div>

            {/* Text */}
            <div className="space-y-8">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--color-brand-amber)" }}>
                  Deux sources de revenus
                </p>
                <h2
                  className="text-4xl sm:text-5xl font-bold leading-[1.05] mb-4"
                  style={{ fontFamily: "var(--font-display)", color: "#F7F2EA" }}
                >
                  Sans commission.<br />Sans algorithme.
                </h2>
                <p className="text-base leading-relaxed" style={{ color: "rgba(247,242,234,0.75)" }}>
                  Akeli ne prend aucune commission sur vos revenus. Vous gagnez sur chaque consommation et sur chaque fan fidèle.
                </p>
              </div>

              <div className="space-y-4">
                {/* Standard */}
                <div className="rounded-2xl p-5 space-y-1" style={{ backgroundColor: "rgba(247,242,234,0.08)", border: "1px solid rgba(247,242,234,0.12)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(247,242,234,0.5)" }}>Mode standard</p>
                  <p className="text-2xl font-bold" style={{ color: "var(--color-brand-amber)", fontFamily: "var(--font-display)" }}>1€</p>
                  <p className="text-sm" style={{ color: "rgba(247,242,234,0.7)" }}>par tranche de 90 consommations — elles s'accumulent d'un mois à l'autre.</p>
                </div>
                {/* Fan */}
                <div className="rounded-2xl p-5 space-y-1" style={{ backgroundColor: "rgba(45,140,78,0.15)", border: "1px solid rgba(45,140,78,0.35)" }}>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "rgba(247,242,234,0.5)" }}>Mode Fan</p>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: "var(--color-brand-green)", color: "#fff" }}>
                      dès 30 recettes
                    </span>
                  </div>
                  <p className="text-2xl font-bold" style={{ color: "var(--color-brand-amber)", fontFamily: "var(--font-display)" }}>1€/fan/mois</p>
                  <p className="text-sm" style={{ color: "rgba(247,242,234,0.7)" }}>100 fans = 100€/mois garantis, indépendamment des consommations.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="px-6 sm:px-12 py-20 sm:py-28" style={{ backgroundColor: "var(--color-brand-cream)" }}>
          <div className="max-w-2xl mx-auto space-y-12">
            <div className="text-center">
              <h2
                className="text-4xl sm:text-5xl font-bold"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)" }}
              >
                Questions fréquentes
              </h2>
            </div>
            <FAQAccordion items={prospectFAQ} showCategories expandFirst={false} />
          </div>
        </section>

        {/* ── CTA final ── */}
        <section className="relative overflow-hidden flex items-center" style={{ height: "480px" }}>
          <Image
            src="/akeli/video-call-dinner.jpg"
            fill
            alt="Rejoindre Akeli"
            className="object-cover object-center"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, rgba(28,43,28,0.9) 0%, rgba(28,43,28,0.65) 100%)" }}
          />
          <div className="relative px-6 sm:px-12 w-full max-w-3xl mx-auto text-center">
            <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--color-brand-amber)" }}>
              Prêt à commencer ?
            </p>
            <h2
              className="text-4xl sm:text-5xl font-bold text-white mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Partagez votre cuisine avec le monde.
            </h2>
            <p className="text-sm mb-8" style={{ color: "rgba(247,242,234,0.75)" }}>
              Inscription gratuite. Aucun engagement. Vos premières recettes en ligne en moins d'une heure.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold transition-all hover:scale-[1.02]"
              style={{ backgroundColor: "var(--color-brand-amber)", color: "var(--color-brand-dark)" }}
            >
              Créer mon compte créateur
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="px-6 sm:px-12 py-10" style={{ backgroundColor: "var(--color-brand-dark)" }}>
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/akeli/logo.png" width={28} height={28} alt="Akeli" className="rounded-full opacity-90" />
              <span className="text-base font-bold" style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-cream)" }}>
                akeli
              </span>
            </Link>
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href="/" className="text-xs transition-colors hover:opacity-80" style={{ color: "rgba(247,242,234,0.5)" }}>
                ← Retour à l'accueil
              </Link>
              <Link href="/legal/terms" className="text-xs transition-colors hover:opacity-80" style={{ color: "rgba(247,242,234,0.5)" }}>
                CGU
              </Link>
              <Link href="/legal/privacy" className="text-xs transition-colors hover:opacity-80" style={{ color: "rgba(247,242,234,0.5)" }}>
                Confidentialité
              </Link>
              <a href="mailto:creators@akeli.app" className="text-xs transition-colors hover:opacity-80" style={{ color: "rgba(247,242,234,0.5)" }}>
                Contact créateurs
              </a>
            </nav>
          </div>
        </footer>

      </main>
    </>
  );
}
