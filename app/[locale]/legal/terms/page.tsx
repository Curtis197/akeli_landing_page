import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Akeli",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-foreground">Conditions générales d'utilisation</h1>
        <p className="text-sm text-muted-foreground">Dernière mise à jour : mars 2025</p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Objet</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Les présentes conditions générales d'utilisation (CGU) régissent l'accès et
            l'utilisation de la plateforme Akeli, accessible via l'application mobile et le
            site web akeli.app.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Accès au service</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            L'accès aux recettes complètes est soumis à un abonnement mensuel de 3€/mois.
            Les créateurs peuvent s'inscrire gratuitement et publier leurs recettes. Akeli se
            réserve le droit de modifier les tarifs avec un préavis de 30 jours.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Contenu créateur</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Les créateurs sont responsables du contenu qu'ils publient. Tout contenu doit
            respecter les droits de propriété intellectuelle et ne pas contenir de propos
            illicites, offensants ou trompeurs.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Propriété intellectuelle</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Le créateur conserve la propriété de ses recettes. En les publiant sur Akeli, il
            accorde à la plateforme une licence non-exclusive d'affichage et de diffusion.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Résiliation</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tout utilisateur peut supprimer son compte à tout moment depuis les paramètres.
            L'abonnement est résilié en fin de période en cours.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Contact</h2>
          <p className="text-sm text-muted-foreground">
            Pour toute question relative aux présentes CGU :{" "}
            <a href="mailto:hello@akeli.app" className="text-primary hover:underline">
              hello@akeli.app
            </a>
          </p>
        </section>
      </div>
    </main>
  );
}
