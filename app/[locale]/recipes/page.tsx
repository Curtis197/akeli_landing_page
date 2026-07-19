import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import RecipesCatalogClient from "./RecipesCatalogClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "recipes" });

  return { title: t("pageTitle"), description: t("subtitle") };
}

export default function RecipesPage() {
  return <RecipesCatalogClient />;
}
