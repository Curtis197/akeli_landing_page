import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import CreatorsCatalogClient from "./CreatorsCatalogClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "creators" });

  return { title: t("pageTitle"), description: t("subtitle") };
}

export default function CreatorsPage() {
  return <CreatorsCatalogClient />;
}
