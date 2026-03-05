import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Akeli — Mangez comme vous êtes",
    template: "%s | Akeli",
  },
  description:
    "Des recettes créées par des créateurs de votre culture, adaptées à votre vie d'aujourd'hui.",
  metadataBase: new URL("https://a-keli.com"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
