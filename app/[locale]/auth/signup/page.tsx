"use client";

import { useState } from "react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const { setUser } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    setError(null);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
      },
    });

    if (authError) {
      setError(authError.message ?? "Une erreur est survenue lors de l'inscription.");
      setLoading(false);
      return;
    }

    // Si confirmation email requise
    if (data.user && !data.session) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    if (data.user) {
      setUser(data.user);
      router.push("/dashboard");
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl">📬</div>
          <h1 className="text-xl font-bold text-foreground">Vérifie ta boite mail</h1>
          <p className="text-sm text-muted-foreground">
            Un lien de confirmation a été envoyé à <strong>{email}</strong>.
            Clique dessus pour activer ton compte créateur.
          </p>
          <Link href="/auth/login" className="text-sm text-primary font-medium hover:underline">
            Retour à la connexion
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Titre */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Devenir créateur Akeli</h1>
          <p className="text-sm text-muted-foreground">
            Partage tes recettes et rejoins la communauté.
          </p>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Nom complet
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ton nom ou pseudo"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

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

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
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
            {loading ? "Création du compte…" : "Créer mon compte"}
          </button>
        </form>

        {/* CGU */}
        <p className="text-center text-xs text-muted-foreground">
          En créant un compte, tu acceptes nos{" "}
          <Link href="/legal/terms" className="underline hover:text-foreground">
            Conditions d'utilisation
          </Link>{" "}
          et notre{" "}
          <Link href="/legal/privacy" className="underline hover:text-foreground">
            Politique de confidentialité
          </Link>
          .
        </p>

        {/* Lien connexion */}
        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/auth/login" className="text-primary font-medium hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
