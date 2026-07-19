import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.a-keli.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/*/dashboard",
        "/*/chat",
        "/*/profile",
        "/*/fan-mode",
        "/*/settings",
        "/*/recipes/new",
        "/*/help",
        "/*/auth/",
        "/*/test-onboarding",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
