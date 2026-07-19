import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.a-keli.com";
const description =
  "Des recettes créées par des créateurs de votre culture, adaptées à votre vie d'aujourd'hui.";

export const metadata: Metadata = {
  title: {
    default: "Akeli — Mangez comme vous êtes",
    template: "%s | Akeli",
  },
  description,
  metadataBase: new URL(siteUrl),
  openGraph: {
    siteName: "Akeli",
    type: "website",
    images: [{ url: "/akeli/feast-table.jpg", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
