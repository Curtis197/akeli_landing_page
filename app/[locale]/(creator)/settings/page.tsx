"use client";

import { useState } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { reset } = useAuthStore();

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
