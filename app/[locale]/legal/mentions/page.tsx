import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions légales — Akeli",
};

export default function MentionsPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-foreground">Mentions légales</h1>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Éditeur du site</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Akeli</strong></p>
            <p>Contact : <a href="mailto:hello@akeli.app" className="text-primary hover:underline">hello@akeli.app</a></p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Hébergement</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Vercel Inc.</strong></p>
            <p>440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Base de données</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Supabase Inc.</strong></p>
            <p>970 Toa Payoh North #07-04, Singapour</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Paiements</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">Stripe Inc.</strong></p>
            <p>354 Oyster Point Blvd, South San Francisco, CA 94080, États-Unis</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Propriété intellectuelle</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            L'ensemble du contenu de ce site (textes, images, code) est protégé par les lois
            en vigueur sur la propriété intellectuelle. Toute reproduction sans autorisation
            préalable est strictement interdite.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Droit applicable</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Les présentes mentions légales sont soumises au droit français. En cas de litige,
            les tribunaux français seront seuls compétents.
          </p>
        </section>
      </div>
    </main>
  );
}
