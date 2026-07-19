// app/[locale]/blog/page.tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import BlogCatalogClient from "./BlogCatalogClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  return { title: t("globalFeedTitle"), description: t("globalFeedSubtitle") };
}

export default function BlogPage() {
  return <BlogCatalogClient />;
}
