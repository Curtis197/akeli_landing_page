import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import { BetaSignupForm } from "@/components/beta/BetaSignupForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("beta.meta");
  return { title: t("title"), description: t("description") };
}

export default function BetaPage() {
  const t = useTranslations("beta");

  return (
    <>
      <Navbar />
      <main style={{ fontFamily: "var(--font-sans)" }}>
        <section className="px-6 sm:px-12 py-20 sm:py-28" style={{ backgroundColor: "var(--color-brand-cream)" }}>
          <div className="max-w-md mx-auto">
            <h1
              className="font-bold leading-[1.05] mb-4 text-3xl sm:text-4xl"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-dark)" }}
            >
              {t("title")}
            </h1>
            <p className="text-lg leading-relaxed mb-8" style={{ color: "var(--color-brand-dark)" }}>
              {t("subtitle")}
            </p>
            <BetaSignupForm
              emailLabel={t("emailLabel")}
              emailPlaceholder={t("emailPlaceholder")}
              platformLabel={t("platformLabel")}
              platformIos={t("platformIos")}
              platformAndroid={t("platformAndroid")}
              submitLabel={t("submit")}
              successMessage={t("success")}
              alreadySignedUpMessage={t("alreadySignedUp")}
              errorMessage={t("error")}
            />
          </div>
        </section>
      </main>
    </>
  );
}
