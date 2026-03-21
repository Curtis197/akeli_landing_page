"use client";

import { useState } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { useQuery } from "@tanstack/react-query";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { reset, creator } = useAuthStore();

  // ── Changement de mot de passe ───────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas.");
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message ?? "Impossible de modifier le mot de passe.");
    } else {
      setPasswordSuccess("Mot de passe mis à jour avec succès.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  }

  // ── Stripe Connect ────────────────────────────────────────────────────────────
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const { data: stripeStatus, refetch: refetchStripe } = useQuery({
    queryKey: ["stripe-status", creator?.id],
    queryFn: async () => {
      if (!creator?.id) return null;
      const { data, error } = await supabase
        .from("creator_balance")
        .select("available_balance, pending_balance, last_payout_at")
        .eq("creator_id", creator.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!creator?.id,
  });

  async function handleStripeConnect() {
    setStripeLoading(true);
    setStripeError(null);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboarding", {
        body: { creator_id: creator?.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Pas d'URL de connexion reçue.");
      }
    } catch (err: unknown) {
      setStripeError(
        err instanceof Error ? err.message : "Impossible d'initier la connexion Stripe."
      );
    } finally {
      setStripeLoading(false);
    }
  }

  async function handleStripeDashboard() {
    setStripeLoading(true);
    setStripeError(null);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-dashboard-link", {
        body: { creator_id: creator?.id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      } else {
        throw new Error("Pas d'URL de tableau de bord reçue.");
      }
    } catch (err: unknown) {
      setStripeError(
        err instanceof Error ? err.message : "Impossible d'accéder au tableau de bord Stripe."
      );
    } finally {
      setStripeLoading(false);
    }
  }

  // ── Déconnexion ──────────────────────────────────────────────────────────────
  async function handleLogout() {
    await supabase.auth.signOut();
    reset();
    router.push("/auth/login");
    router.refresh();
  }

  // ── Suppression de compte ────────────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    if (deleteConfirm !== "supprimer") return;
    setDeleteLoading(true);
    setDeleteError(null);

    const { error } = await supabase.rpc("delete_creator_account");
    if (error) {
      setDeleteError("Impossible de supprimer le compte. Contacte le support.");
      setDeleteLoading(false);
      return;
    }
    await supabase.auth.signOut();
    reset();
    router.push("/");
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>

      {/* ── Sécurité ── */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <h2 className="text-base font-semibold text-foreground">Changer le mot de passe</h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
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

          {passwordError && (
            <p className="text-sm text-destructive font-medium">{passwordError}</p>
          )}
          {passwordSuccess && (
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">{passwordSuccess}</p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {passwordLoading ? "Mise à jour…" : "Mettre à jour"}
            </button>
          </div>
        </form>
      </section>

      {/* ── Stripe ── */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#635BFF]/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[#635BFF]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Paramètres Stripe</h2>
            <p className="text-xs text-muted-foreground">Compte de paiement pour tes revenus</p>
          </div>
        </div>

        {/* Balance info */}
        {stripeStatus && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Solde disponible</p>
              <p className="text-lg font-bold text-foreground">
                {(stripeStatus.available_balance ?? 0).toFixed(2)} €
              </p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3 space-y-0.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">En attente</p>
              <p className="text-lg font-bold text-foreground">
                {(stripeStatus.pending_balance ?? 0).toFixed(2)} €
              </p>
            </div>
          </div>
        )}
        {stripeStatus?.last_payout_at && (
          <p className="text-xs text-muted-foreground">
            Dernier versement :{" "}
            {new Date(stripeStatus.last_payout_at).toLocaleDateString("fr-FR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}

        {stripeError && (
          <p className="text-sm text-destructive font-medium">{stripeError}</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleStripeConnect}
            disabled={stripeLoading}
            className="px-5 py-2 rounded-lg bg-[#635BFF] text-white text-sm font-medium hover:bg-[#635BFF]/90 transition-colors disabled:opacity-50"
          >
            {stripeLoading ? "Chargement…" : "Connecter / Modifier Stripe"}
          </button>
          <button
            type="button"
            onClick={handleStripeDashboard}
            disabled={stripeLoading}
            className="px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            Tableau de bord Stripe
          </button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Tes revenus sont versés automatiquement chaque mois via Stripe Express.
          Connecte ton compte bancaire pour recevoir tes paiements.
        </p>
      </section>

      {/* ── Session ── */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Session</h2>
        <p className="text-sm text-muted-foreground">
          Déconnecte-toi de ton compte créateur sur cet appareil.
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
        >
          Se déconnecter
        </button>
      </section>

      {/* ── Zone de danger ── */}
      <section className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 space-y-4">
        <h2 className="text-base font-semibold text-destructive">Zone de danger</h2>
        <p className="text-sm text-muted-foreground">
          La suppression de ton compte est <strong>irréversible</strong>. Toutes tes recettes,
          messages et données seront définitivement supprimés.
        </p>
        <div className="space-y-2">
          <label htmlFor="delete-confirm" className="text-sm font-medium text-foreground">
            Tape <span className="font-mono font-bold">supprimer</span> pour confirmer
          </label>
          <input
            id="delete-confirm"
            type="text"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            placeholder="supprimer"
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive"
          />
        </div>
        {deleteError && (
          <p className="text-sm text-destructive font-medium">{deleteError}</p>
        )}
        <button
          type="button"
          disabled={deleteConfirm !== "supprimer" || deleteLoading}
          onClick={handleDeleteAccount}
          className="px-5 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-40"
        >
          {deleteLoading ? "Suppression…" : "Supprimer mon compte"}
        </button>
      </section>
    </div>
  );
}
