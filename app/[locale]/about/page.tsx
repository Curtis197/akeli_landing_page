import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about.meta");
  return { title: t("title"), description: t("description") };
}

export default function AboutPage() {
  const t = useTranslations("about");

  const pillars = [
    { key: "pillar1", bg: "var(--color-brand-cream)", color: "var(--color-brand-dark)", body: "var(--color-brand-forest)" },
    { key: "pillar2", bg: "var(--color-brand-dark)", color: "#F7F2EA", body: "rgba(247,242,234,0.78)" },
    { key: "pillar3", bg: "var(--color-brand-cream)", color: "var(--color-brand-dark)", body: "var(--color-brand-forest)" },
  ] as const;

  return (
    <>
      <Navbar />
      <main style={{ fontFamily: "var(--font-sans)" }}>

        {/* ── Intro ── */}
        <section className="px-6 sm:px-12 py-20 sm:py-28" style={{ backgroundColor: "var(--color-brand-cream)" }}>
          <div className="max-w-3xl mx-auto">
            <h1
              className="font-bold leading-[1.05] mb-8 text-4xl sm:text-5xl lg:text-6xl"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)" }}
            >
              {t("intro.title")}
            </h1>
            <p className="text-lg sm:text-xl leading-relaxed mb-6" style={{ color: "var(--color-brand-dark)" }}>
              {t("intro.lead")}
            </p>
            <p
              className="text-base leading-relaxed border-l-2 pl-5"
              style={{ color: "var(--color-brand-forest)", borderColor: "var(--color-brand-amber)" }}
            >
              {t("intro.genesis")}
            </p>
          </div>
        </section>

        {/* ── Pillars ── */}
        {pillars.map(({ key, bg, color, body }, i) => (
          <section key={key} className="px-6 sm:px-12 py-20 sm:py-24" style={{ backgroundColor: bg }}>
            <div className="max-w-3xl mx-auto">
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: "var(--color-brand-amber)" }}>
                {`0${i + 1}`}
              </p>
              <h2
                className="text-3xl sm:text-4xl font-bold leading-tight mb-6"
                style={{ fontFamily: "var(--font-display)", color }}
              >
                {t(`${key}.title`)}
              </h2>
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: body }}>
                {t(`${key}.body`)}
              </p>
            </div>
          </section>
        ))}

        {/* ── CTA ── */}
        <section className="px-6 sm:px-12 py-20 sm:py-28" style={{ backgroundColor: "var(--color-brand-green)" }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2
              className="text-3xl sm:text-5xl font-bold mb-10"
              style={{ fontFamily: "var(--font-display)", color: "#fff" }}
            >
              {t("cta.title")}
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/become-creator"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{ backgroundColor: "var(--color-brand-amber)", color: "var(--color-brand-dark)" }}
              >
                {t("cta.ctaCreator")}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-xl border-2 px-8 py-4 text-sm font-semibold transition-all hover:scale-[1.02]"
                style={{ borderColor: "rgba(255,255,255,0.6)", color: "#fff" }}
              >
                {t("cta.ctaUser")}
              </Link>
            </div>
          </div>
        </section>

        {/* ── Contact + footer ── */}
        <footer className="px-6 sm:px-12 py-12" style={{ backgroundColor: "var(--color-brand-dark)" }}>
          <div className="max-w-3xl mx-auto space-y-6 text-center">
            <p className="text-sm" style={{ color: "rgba(247,242,234,0.75)" }}>
              {t("contact")}
            </p>
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href="/legal/terms" className="text-xs transition-colors hover:opacity-80" style={{ color: "rgba(247,242,234,0.5)" }}>
                {t("footer.terms")}
              </Link>
              <Link href="/legal/privacy" className="text-xs transition-colors hover:opacity-80" style={{ color: "rgba(247,242,234,0.5)" }}>
                {t("footer.privacy")}
              </Link>
              <Link href="/legal/mentions" className="text-xs transition-colors hover:opacity-80" style={{ color: "rgba(247,242,234,0.5)" }}>
                {t("footer.legal")}
              </Link>
            </nav>
          </div>
        </footer>

      </main>
    </>
  );
}
