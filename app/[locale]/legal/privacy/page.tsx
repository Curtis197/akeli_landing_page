import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Akeli",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-foreground">Politique de confidentialité</h1>
        <p className="text-sm text-muted-foreground">Dernière mise à jour : mars 2025</p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Données collectées</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Akeli collecte uniquement les données nécessaires au fonctionnement du service :
            adresse email, nom d'affichage, photo de profil (optionnelle), préférences
            culinaires et historique d'utilisation.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Utilisation des données</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Vos données sont utilisées pour personnaliser l'expérience, gérer votre compte,
            traiter les paiements via Stripe et améliorer la plateforme. Elles ne sont jamais
            vendues à des tiers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Hébergement et sécurité</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Les données sont hébergées sur Supabase (infrastructure sécurisée conforme RGPD).
            Les communications sont chiffrées via HTTPS. Les mots de passe ne sont jamais
            stockés en clair.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Vos droits</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, de
            portabilité et de suppression de vos données. Vous pouvez supprimer votre compte
            à tout moment depuis les paramètres.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Cookies</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Akeli utilise uniquement des cookies strictement nécessaires à l'authentification
            et à la session. Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Contact</h2>
          <p className="text-sm text-muted-foreground">
            Pour exercer vos droits ou pour toute question :{" "}
            <a href="mailto:hello@akeli.app" className="text-primary hover:underline">
              hello@akeli.app
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
