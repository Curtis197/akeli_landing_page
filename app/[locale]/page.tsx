import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import type { Metadata } from "next";
import { faqData } from "@/data/faq";
import { FAQAccordion } from "@/components/ui/FAQAccordion";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing.hero");
  return {
    title: t("title"),
    description: t("subtitle"),
  };
}

const userFAQ = faqData.filter((q) => q.placement === "landing");

export default function LandingPage() {
  const t = useTranslations("landing");

  return (
    <main className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <section className="flex flex-col items-center justify-center text-center px-4 pt-24 pb-20">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-5xl font-bold text-foreground tracking-tight leading-tight">
            {t("hero.title")}
          </h1>
          <p className="text-xl text-muted-foreground">{t("hero.subtitle")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <a
              href="#"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {t("hero.ctaDownload")}
            </a>
            <Link
              href="/become-creator"
              className="inline-flex items-center justify-center rounded-lg border border-primary px-8 py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
            >
              {t("hero.ctaCreator")}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Comment ça marche ── */}
      <section className="bg-secondary/40 px-4 py-20">
        <div className="max-w-4xl mx-auto space-y-12">
          <h2 className="text-3xl font-bold text-foreground text-center">
            {t("howItWorks.title")}
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {(["step1", "step2", "step3"] as const).map((step, i) => (
              <div key={step} className="flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0">
                  {i + 1}
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {t(`howItWorks.${step}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t(`howItWorks.${step}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tarif ── */}
      <section className="px-4 py-20">
        <div className="max-w-sm mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold text-foreground">{t("pricing.title")}</h2>
          <div className="rounded-2xl border border-border bg-card p-8 space-y-4">
            <p className="text-5xl font-bold text-primary">{t("pricing.price")}</p>
            <p className="text-sm text-muted-foreground">{t("pricing.description")}</p>
            <a
              href="#"
              className="block w-full py-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {t("hero.ctaDownload")}
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ utilisateur ── */}
      <section className="bg-secondary/40 px-4 py-20">
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-2xl font-bold text-foreground text-center">
            {t("faqTitle")}
          </h2>
          <FAQAccordion items={userFAQ} expandFirst />
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-4 py-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Akeli</p>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">
              {t("footer.about")}
            </Link>
            <Link href="/become-creator" className="hover:text-foreground transition-colors">
              {t("footer.becomeCreator")}
            </Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">
              {t("footer.terms")}
            </Link>
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
              {t("footer.privacy")}
            </Link>
            <Link href="/legal/mentions" className="hover:text-foreground transition-colors">
              {t("footer.legal")}
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
