"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";

type PageState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [pageState, setPageState] = useState<PageState>("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The recovery link logs the user in via the callback. Only a session that
  // was recently authenticated by an email link (AMR method "recovery" /
  // "otp" / "magiclink") may set a password here without knowing the current
  // one — an ordinary logged-in session must use the settings page instead.
  useEffect(() => {
    async function checkRecoverySession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPageState("invalid");
        return;
      }
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (error || !data) {
        setPageState("invalid");
        return;
      }
      const RECOVERY_WINDOW_MS = 15 * 60 * 1000;
      // `currentAuthenticationMethods` is typed AMREntry[] | string[] (the
      // string[] shape only applies to custom access-token hooks, which this
      // project doesn't use) — Supabase always returns the detailed
      // { method, timestamp } shape here, so cast to read it safely.
      const isRecentRecovery = data.currentAuthenticationMethods.some((entry) => {
        const { method, timestamp } = entry as { method: string; timestamp: number };
        return (
          ["recovery", "otp", "magiclink"].includes(method) &&
          Date.now() - timestamp * 1000 < RECOVERY_WINDOW_MS
        );
      });
      setPageState(isRecentRecovery ? "ready" : "invalid");
    }
    checkRecoverySession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) {
      setError(updateError.message ?? "Impossible de modifier le mot de passe.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground">
            Choisis un nouveau mot de passe pour ton compte.
          </p>
        </div>

        {pageState === "checking" && (
          <p className="text-center text-sm text-muted-foreground">Vérification du lien…</p>
        )}

        {pageState === "invalid" && (
          <div className="text-center space-y-4">
            <p className="text-sm text-destructive font-medium">
              Ce lien est invalide ou a expiré.
            </p>
            <Link
              href="/auth/forgot-password"
              className="text-primary text-sm font-medium hover:underline"
            >
              Demander un nouveau lien
            </Link>
          </div>
        )}

        {pageState === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-sm font-medium text-foreground">
                Nouveau mot de passe
              </label>
              <input
                id="new-password"
                type="password"
                required
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="8 caractères minimum"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                Confirmer le mot de passe
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
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
              {loading ? "Mise à jour…" : "Mettre à jour le mot de passe"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
