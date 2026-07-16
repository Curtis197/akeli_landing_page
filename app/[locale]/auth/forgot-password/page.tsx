"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const params = useParams();
  const locale = (params.locale as string) ?? "fr";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
    const redirectTo = `${siteUrl}/${locale}/auth/callback?next=${encodeURIComponent(
      `/${locale}/auth/reset-password`
    )}`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (resetError) {
      setError("Impossible d'envoyer l'email pour le moment. Réessaye dans quelques minutes.");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Mot de passe oublié</h1>
          <p className="text-sm text-muted-foreground">
            Reçois un lien par email pour réinitialiser ton mot de passe.
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-foreground">
              Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
              Pense à vérifier tes spams.
            </p>
            <Link
              href="/auth/login"
              className="text-primary text-sm font-medium hover:underline"
            >
              Retour à la connexion
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ton@email.com"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? "Envoi…" : "Envoyer le lien"}
            </button>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
