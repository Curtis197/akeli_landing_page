import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Navbar from "@/components/layout/Navbar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legalPrivacy");
  return { title: `${t("title")} — Akeli` };
}

export default function PrivacyPage() {
  const t = useTranslations("legalPrivacy");
  const sections = ["section1", "section2", "section3", "section4", "section5", "section6"] as const;

  return (
    <>
    <Navbar />
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("lastUpdated")}</p>

        {sections.map((section) => (
          <section key={section} className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t(`${section}.title`)}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(`${section}.content`)}
            </p>
          </section>
        ))}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">{t("section7.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("section7.content")}{" "}
            <a href={`mailto:${t("section7.email")}`} className="text-primary hover:underline">
              {t("section7.email")}
            </a>
          </p>
        </section>
      </div>
    </main>
    </>
  );
}
