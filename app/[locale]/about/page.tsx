import { Link } from "@/lib/i18n/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "À propos — Akeli",
  description: "Découvre la mission d'Akeli : connecter les cultures africaines et diaspora à travers la gastronomie.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Intro */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold text-foreground">À propos d'Akeli</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Akeli est une plateforme de recettes créée pour et par les communautés africaines
            et de la diaspora. Notre mission : rendre la cuisine d'ici et d'ailleurs accessible,
            vivante et moderne.
          </p>
        </div>

        {/* Mission */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Notre mission</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Trop souvent, les recettes de nos familles se transmettent oralement — et disparaissent.
            Akeli donne aux créateurs les outils pour documenter, partager et monétiser leur savoir
            culinaire, tout en offrant aux utilisateurs une expérience de cuisine adaptée à leur vie.
          </p>
        </section>

        {/* Créateurs */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Pour les créateurs</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Que tu sois chef passionné, maman cuisinière ou entrepreneur de la food, Akeli te
            permet de publier tes recettes, construire une audience et générer des revenus depuis
            ton espace créateur.
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Devenir créateur
          </Link>
        </section>

        {/* Contact */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-3">
          <h2 className="text-xl font-semibold text-foreground">Contact</h2>
          <p className="text-sm text-muted-foreground">
            Une question, une suggestion ou un partenariat ?{" "}
            <a
              href="mailto:hello@akeli.app"
              className="text-primary font-medium hover:underline"
            >
              hello@akeli.app
            </a>
          </p>
        </section>

        {/* Footer links */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/legal/terms" className="hover:text-foreground transition-colors">CGU</Link>
          <Link href="/legal/privacy" className="hover:text-foreground transition-colors">Confidentialité</Link>
          <Link href="/legal/mentions" className="hover:text-foreground transition-colors">Mentions légales</Link>
        </div>
      </div>
    </main>
  );
}
