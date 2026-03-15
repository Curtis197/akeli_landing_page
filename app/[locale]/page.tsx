import Image from "next/image";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import { faqData } from "@/data/faq";
import { FAQAccordion } from "@/components/ui/FAQAccordion";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.hero");
  return { title: t("title"), description: t("subtitle") };
}

const userFAQ = faqData.filter((q) => q.placement === "landing");
const TICKER_ITEMS = [
  "Recettes authentiques","12 regions africaines","Createurs passionnes",
  "App mobile disponible","Cuisine de la diaspora","Partagez vos repas",
];

export default function LandingPage() {
  const t = useTranslations("landing");
  return (
    <>
      <Navbar />
      <main style={{ fontFamily: "var(--font-sans)" }}>

        {/* HERO */}
        <section className="grid lg:grid-cols-2 min-h-[calc(100svh-56px)]">
          <div className="flex flex-col justify-center px-6 sm:px-12 lg:px-16 xl:px-20 py-16 lg:py-0 order-2 lg:order-1"
            style={{ backgroundColor: "var(--color-brand-cream)" }}>
            <div className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold self-start mb-8"
              style={{ borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)",
                backgroundColor: "rgba(45,140,78,0.06)", animation: "fadeInUp 0.5s ease both" }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "var(--color-brand-amber)" }} />
              Cuisine africaine authentique
            </div>
            <h1 className="font-bold leading-[0.92] mb-6 text-5xl sm:text-6xl lg:text-7xl xl:text-[5.5rem]"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)",
                animation: "fadeInUp 0.65s 0.1s ease both" }}>
              {t("hero.title")}
            </h1>
            <p className="text-base sm:text-lg max-w-md mb-10 leading-relaxed"
              style={{ color: "var(--color-brand-forest)", animation: "fadeInUp 0.65s 0.2s ease both" }}>
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-12" style={{ animation: "fadeInUp 0.65s 0.3s ease both" }}>
              <a href="#" className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{ backgroundColor: "var(--color-brand-dark)", color: "#fff" }}>
                {t("hero.ctaDownload")}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <Link href="/become-creator"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 px-7 py-4 text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{ borderColor: "var(--color-brand-green)", color: "var(--color-brand-green)" }}>
                {t("hero.ctaCreator")}
              </Link>
            </div>
            <div className="flex items-center gap-3" style={{ animation: "fadeInUp 0.65s 0.4s ease both" }}>
              <div className="flex -space-x-2.5">
                {["/akeli/friends-meal.jpg","/akeli/couple-phone.jpg","/akeli/diaspora-couple.jpg"].map((src,i) => (
                  <div key={i} className="relative w-9 h-9 rounded-full overflow-hidden border-2"
                    style={{ borderColor: "var(--color-brand-cream)" }}>
                    <Image src={src} fill className="object-cover" alt="" />
                  </div>
                ))}
              </div>
              <p className="text-xs font-medium" style={{ color: "var(--color-brand-forest)" }}>
                &#9733;&#9733;&#9733;&#9733;&#9733; Rejoignez des centaines de createurs
              </p>
            </div>
          </div>
          <div className="relative min-h-[65vw] sm:min-h-[55vw] lg:min-h-0 order-1 lg:order-2 overflow-hidden"
            style={{ backgroundColor: "var(--color-brand-dark)" }}>
            <Image src="/akeli/creator-kitchen.jpg" fill alt="Creatrice Akeli"
              className="object-cover object-center" style={{ opacity: 0.88 }} priority />
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(28,43,28,0.55) 0%, transparent 50%)" }} />
            <div className="absolute bottom-8 left-6 sm:bottom-10 sm:left-10 bg-white rounded-2xl p-3 shadow-2xl"
              style={{ maxWidth:"155px", animation:"fadeInUp 0.8s 0.55s ease both, float 5s 1.5s ease-in-out infinite" }}>
              <div className="relative w-full rounded-xl overflow-hidden" style={{ height:"90px" }}>
                <Image src="/akeli/plantains.jpg" fill className="object-cover" alt="Alloco" />
              </div>
              <div className="mt-2 px-0.5">
                <p className="text-[11px] font-semibold leading-tight" style={{ color:"var(--color-brand-dark)" }}>
                  Alloco maison &#127820;
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  <span style={{ color:"var(--color-brand-amber)" }}>&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                  {" "}4.9 &middot; 120 fans
                </p>
              </div>
            </div>
            <div className="absolute top-6 right-6 rounded-full px-4 py-2 text-xs font-bold shadow-lg"
              style={{ backgroundColor:"var(--color-brand-amber)", color:"var(--color-brand-dark)",
                animation:"fadeInUp 0.6s 0.65s ease both" }}>
              500+ recettes
            </div>
          </div>
        </section>

        {/* TICKER */}
        <div className="overflow-hidden py-3.5" style={{ backgroundColor: "var(--color-brand-amber)" }}>
          <div className="flex whitespace-nowrap animate-ticker">
            {[...TICKER_ITEMS,...TICKER_ITEMS].map((item,i) => (
              <span key={i} className="mx-8 text-sm font-semibold" style={{ color:"var(--color-brand-dark)" }}>
                &#10022; {item}
              </span>
            ))}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <section className="px-6 sm:px-12 py-20 sm:py-28" style={{ backgroundColor: "var(--color-brand-cream)" }}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color:"var(--color-brand-green)" }}>
                Simple &amp; intuitif
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold"
                style={{ fontFamily:"var(--font-display)", color:"var(--color-brand-dark)" }}>
                {t("howItWorks.title")}
              </h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-8 sm:gap-6">
              {([
                { key: "step1", img: "/akeli/creator-kitchen.jpg", num: 1 },
                { key: "step2", img: "/akeli/plantains.jpg", num: 2 },
                { key: "step3", img: "/akeli/friends-meal.jpg", num: 3 },
              ] as const).map(({ key, img, num }) => (
                <div key={key} className="group flex flex-col">
                  <div className="relative h-52 rounded-2xl overflow-hidden mb-5">
                    <Image src={img} fill className="object-cover transition-transform duration-500 group-hover:scale-105" alt="" />
                    <div className="absolute inset-0"
                      style={{ background:"linear-gradient(to top, rgba(28,43,28,0.6) 0%, transparent 60%)" }} />
                    <div className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor:"var(--color-brand-amber)", color:"var(--color-brand-dark)" }}>
                      {num}
                    </div>
                  </div>
                  <h3 className="font-semibold text-base mb-2" style={{ color:"var(--color-brand-dark)" }}>
                    {t(`howItWorks.${key}.title`)}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color:"var(--color-brand-forest)" }}>
                    {t(`howItWorks.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CREATOR FEATURE */}
        <section className="px-6 sm:px-12 py-20 sm:py-28" style={{ backgroundColor:"var(--color-brand-dark)" }}>
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative h-[420px] sm:h-[480px] rounded-3xl overflow-hidden">
              <Image src="/akeli/couple-phone.jpg" fill className="object-cover object-top" alt="Createurs Akeli" />
              <div className="absolute bottom-6 right-6 rounded-2xl p-4 text-center"
                style={{ backgroundColor:"rgba(245,165,35,0.95)", color:"var(--color-brand-dark)" }}>
                <p className="text-3xl font-bold leading-none">12+</p>
                <p className="text-[11px] font-semibold mt-1">regions africaines</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color:"var(--color-brand-amber)" }}>
                Pour les createurs de contenu
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold leading-[1.05] mb-6"
                style={{ fontFamily:"var(--font-display)", color:"#F7F2EA" }}>
                Creez.<br/>Partagez.<br/>Gagnez.
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color:"rgba(247,242,234,0.75)" }}>
                Rejoignez la plateforme dediee aux createurs culinaires de la diaspora africaine.
                Publiez vos recettes, constituez votre communaute et monetisez votre passion.
              </p>
              <div className="space-y-4 mb-10">
                {["Publiez vos recettes en quelques minutes",
                  "Gagnez sur chaque abonnement de fan",
                  "Analytics et insights en temps reel"].map((feat) => (
                  <div key={feat} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ backgroundColor:"var(--color-brand-green)" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <p className="text-sm" style={{ color:"rgba(247,242,234,0.8)" }}>{feat}</p>
                  </div>
                ))}
              </div>
              <Link href="/become-creator"
                className="inline-flex items-center gap-2 rounded-xl px-7 py-4 text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{ backgroundColor:"var(--color-brand-amber)", color:"var(--color-brand-dark)" }}>
                {t("hero.ctaCreator")}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* FOOD QUOTE */}
        <section className="relative h-[420px] sm:h-[520px] overflow-hidden">
          <Image src="/akeli/feast-table.jpg" fill className="object-cover object-center" alt="La table africaine" />
          <div className="absolute inset-0 flex items-center justify-center text-center px-6"
            style={{ backgroundColor:"rgba(28,43,28,0.65)" }}>
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color:"var(--color-brand-amber)" }}>
                Notre raison d&apos;être
              </p>
              <h2 className="text-3xl sm:text-5xl font-bold text-white max-w-3xl mx-auto leading-tight"
                style={{ fontFamily:"var(--font-display)" }}>
                &ldquo;La cuisine africaine, racontee par ceux qui la vivent.&rdquo;
              </h2>
            </div>
          </div>
        </section>

        {/* COMMUNITY */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <Image src="/akeli/friends-meal.jpg" fill className="object-cover object-top" alt="Communaute Akeli" />
            <div className="absolute inset-0" style={{ backgroundColor:"rgba(28,43,28,0.82)" }} />
          </div>
          <div className="relative px-6 sm:px-12 py-20 sm:py-28 max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color:"var(--color-brand-amber)" }}>
                La communaute grandit
              </p>
              <h2 className="text-4xl sm:text-5xl font-bold text-white"
                style={{ fontFamily:"var(--font-display)" }}>
                Une famille qui partage
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-4 sm:gap-8 text-center">
              {[
                { number: "500+", label: "Recettes publiees" },
                { number: "12", label: "Regions africaines" },
                { number: "100%", label: "Fait avec passion" },
              ].map(({ number, label }) => (
                <div key={label} className="p-4 sm:p-6 rounded-2xl"
                  style={{ backgroundColor:"rgba(247,242,234,0.1)", backdropFilter:"blur(8px)" }}>
                  <p className="text-3xl sm:text-5xl font-bold mb-2"
                    style={{ fontFamily:"var(--font-display)", color:"var(--color-brand-amber)" }}>
                    {number}
                  </p>
                  <p className="text-xs sm:text-sm font-medium" style={{ color:"rgba(247,242,234,0.75)" }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section className="px-6 sm:px-12 py-20 sm:py-28" style={{ backgroundColor:"var(--color-brand-cream)" }}>
          <div className="max-w-lg mx-auto text-center">
            <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color:"var(--color-brand-green)" }}>
              Tarif
            </p>
            <h2 className="text-4xl sm:text-5xl font-bold mb-12"
              style={{ fontFamily:"var(--font-display)", color:"var(--color-brand-dark)" }}>
              {t("pricing.title")}
            </h2>
            <div className="rounded-3xl p-8 sm:p-10 text-left relative overflow-hidden"
              style={{ backgroundColor:"var(--color-brand-dark)" }}>
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-20"
                style={{ backgroundColor:"var(--color-brand-amber)" }} />
              <div className="relative">
                <p className="text-6xl font-bold mb-4"
                  style={{ fontFamily:"var(--font-display)", color:"var(--color-brand-amber)" }}>
                  {t("pricing.price")}
                </p>
                <p className="text-sm mb-8" style={{ color:"rgba(247,242,234,0.7)" }}>
                  {t("pricing.description")}
                </p>
                <div className="space-y-3 mb-8">
                  {["Acces illimite a toutes les recettes",
                    "Recettes des createurs de votre culture",
                    "Nouvelles recettes chaque semaine",
                    "Application mobile iOS et Android"].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor:"var(--color-brand-green)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                      <p className="text-sm" style={{ color:"rgba(247,242,234,0.85)" }}>{item}</p>
                    </div>
                  ))}
                </div>
                <a href="#" className="block w-full text-center rounded-xl py-4 text-sm font-semibold transition-all hover:scale-[1.01]"
                  style={{ backgroundColor:"var(--color-brand-amber)", color:"var(--color-brand-dark)" }}>
                  {t("hero.ctaDownload")}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 sm:px-12 py-20 sm:py-28" style={{ backgroundColor:"#fff" }}>
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl sm:text-5xl font-bold"
                style={{ fontFamily:"var(--font-display)", color:"var(--color-brand-dark)" }}>
                {t("faqTitle")}
              </h2>
            </div>
            <FAQAccordion items={userFAQ} expandFirst />
          </div>
        </section>

        {/* CTA FINALE */}
        <section className="relative overflow-hidden flex items-center" style={{ height:"500px" }}>
          <Image src="/akeli/video-call-dinner.jpg" fill className="object-cover object-center" alt="Rejoindre Akeli" />
          <div className="absolute inset-0"
            style={{ background:"linear-gradient(135deg, rgba(28,43,28,0.88) 0%, rgba(28,43,28,0.6) 100%)" }} />
          <div className="relative px-6 sm:px-12 w-full max-w-3xl mx-auto text-center">
            <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color:"var(--color-brand-amber)" }}>
              Pret a commencer ?
            </p>
            <h2 className="text-4xl sm:text-6xl font-bold text-white mb-8"
              style={{ fontFamily:"var(--font-display)" }}>
              Mangez comme vous &ecirc;tes.
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="#" className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{ backgroundColor:"var(--color-brand-amber)", color:"var(--color-brand-dark)" }}>
                {t("hero.ctaDownload")}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </a>
              <Link href="/become-creator"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 px-8 py-4 text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{ borderColor:"rgba(247,242,234,0.5)", color:"#F7F2EA" }}>
                {t("hero.ctaCreator")}
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="px-6 sm:px-12 py-10" style={{ backgroundColor:"var(--color-brand-dark)" }}>
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/akeli/logo.png" width={28} height={28} alt="Akeli" className="rounded-full opacity-90" />
              <span className="text-base font-bold"
                style={{ fontFamily:"var(--font-display)", color:"var(--color-brand-cream)" }}>
                akeli
              </span>
            </Link>
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {[
                { href: "/about", label: t("footer.about") },
                { href: "/become-creator", label: t("footer.becomeCreator") },
                { href: "/legal/terms", label: t("footer.terms") },
                { href: "/legal/privacy", label: t("footer.privacy") },
                { href: "/legal/mentions", label: t("footer.legal") },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="text-xs transition-colors hover:opacity-80"
                  style={{ color:"rgba(247,242,234,0.5)" }}>
                  {label}
                </Link>
              ))}
            </nav>
            <p className="text-xs" style={{ color:"rgba(247,242,234,0.35)" }}>
              &copy; {new Date().getFullYear()} Akeli
            </p>
          </div>
        </footer>

      </main>
    </>
  );
}
