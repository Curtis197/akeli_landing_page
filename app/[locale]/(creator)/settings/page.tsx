"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import {
  getPayoutIdentity,
  upsertPayoutIdentity,
  type PayoutIdentityInput,
  type PayoutMethod,
} from "@/lib/queries/payoutIdentity";

const AFRICAN_COUNTRIES = [
  "Côte d'Ivoire",
  "Sénégal",
  "Mali",
  "Burkina Faso",
  "Cameroun",
  "Bénin",
  "Togo",
  "Guinée",
  "Ghana",
  "Nigeria",
  "Kenya",
];

const MOBILE_MONEY_PROVIDERS = [
  { value: "orange_money", label: "Orange Money" },
  { value: "mtn_momo", label: "MTN Mobile Money" },
  { value: "moov_money", label: "Moov Money" },
  { value: "wave", label: "Wave" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "airtel_money", label: "Airtel Money" },
  { value: "other", label: "Autre" },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { reset, creator, user } = useAuthStore();

  // ── Changement de mot de passe ───────────────────────────────────────────────
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const hasEmailIdentity =
    user?.identities?.some((identity) => identity.provider === "email") ?? true;

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

    if (hasEmailIdentity) {
      if (!user?.email) {
        setPasswordError("Session invalide. Reconnecte-toi puis réessaye.");
        setPasswordLoading(false);
        return;
      }
      // Supabase has no dedicated verify endpoint: re-authenticating is the
      // standard way to check the current password. It refreshes the same
      // user's session, which is harmless.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verifyError) {
        setPasswordError("Mot de passe actuel incorrect.");
        setPasswordLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPasswordError(error.message ?? "Impossible de modifier le mot de passe.");
    } else {
      setPasswordSuccess(
        hasEmailIdentity
          ? "Mot de passe mis à jour avec succès."
          : "Mot de passe défini avec succès. Tu peux maintenant te connecter avec ton email."
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setPasswordLoading(false);
  }

  // ── Stripe Connect ────────────────────────────────────────────────────────────
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [stripeReturnMessage, setStripeReturnMessage] = useState<string | null>(null);

  const { data: stripeAccount, refetch: refetchStripe } = useQuery({
    queryKey: ["stripe-account", creator?.id],
    queryFn: async () => {
      if (!creator?.id) return null;
      const { data, error } = await supabase
        .from("creator_stripe_account")
        .select("onboarding_complete, payouts_enabled, stripe_account_id")
        .eq("creator_id", creator.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!creator?.id,
  });

  const stripeStatus = !stripeAccount
    ? "not_configured"
    : !stripeAccount.onboarding_complete
    ? "pending"
    : "active";

  // Handle return from Stripe hosted onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stripe = params.get("stripe");
    if (stripe === "success") {
      setStripeReturnMessage("Configuration en cours de vérification…");
      refetchStripe();
    } else if (stripe === "refresh") {
      handleStripeSetup();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStripeSetup() {
    if (!creator?.id) return;
    setStripeLoading(true);
    setStripeError(null);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { creator_id: creator.id },
      });
      console.log("create-connect-account response:", { data, error });
      
      if (error) throw error;
      const url = data?.url || data?.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("Pas d'URL d'onboarding reçue.");
      }
    } catch (err: unknown) {
      setStripeError(
        err instanceof Error ? err.message : "Impossible d'initier la configuration Stripe."
      );
    } finally {
      setStripeLoading(false);
    }
  }

  function getNextPayoutDate() {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return next.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  }

  // ── Coordonnées de paiement Remitly (créateurs hors Stripe) ────────────────────
  const [payoutFormOpen, setPayoutFormOpen] = useState(false);
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutForm, setPayoutForm] = useState<PayoutIdentityInput>({
    legal_full_name: "",
    country: "",
    id_document_number: "",
    payout_method: "mobile_money",
    mobile_money_provider: "",
    mobile_money_number: "",
    bank_name: "",
    bank_account_number: "",
  });

  const { data: payoutIdentity, refetch: refetchPayoutIdentity } = useQuery({
    queryKey: ["payout-identity", creator?.id],
    queryFn: async () => {
      if (!creator?.id) return null;
      return getPayoutIdentity(supabase, creator.id);
    },
    enabled: !!creator?.id,
  });

  function openPayoutForm() {
    if (payoutIdentity) {
      setPayoutForm({
        legal_full_name: payoutIdentity.legal_full_name,
        country: payoutIdentity.country,
        id_document_number: payoutIdentity.id_document_number,
        payout_method: payoutIdentity.payout_method as PayoutMethod,
        mobile_money_provider: payoutIdentity.mobile_money_provider ?? "",
        mobile_money_number: payoutIdentity.mobile_money_number ?? "",
        bank_name: payoutIdentity.bank_name ?? "",
        bank_account_number: payoutIdentity.bank_account_number ?? "",
      });
    }
    setPayoutError(null);
    setPayoutFormOpen(true);
  }

  async function handleSubmitPayoutIdentity(e: React.FormEvent) {
    e.preventDefault();
    if (!creator?.id) return;

    if (
      !payoutForm.legal_full_name.trim() ||
      !payoutForm.country.trim() ||
      !payoutForm.id_document_number.trim()
    ) {
      setPayoutError("Merci de remplir tous les champs obligatoires.");
      return;
    }
    if (payoutForm.payout_method === "mobile_money" && !payoutForm.mobile_money_number?.trim()) {
      setPayoutError("Merci de renseigner ton numéro Mobile Money.");
      return;
    }
    if (
      payoutForm.payout_method === "bank_transfer" &&
      (!payoutForm.bank_name?.trim() || !payoutForm.bank_account_number?.trim())
    ) {
      setPayoutError("Merci de renseigner ta banque et ton numéro de compte.");
      return;
    }

    setPayoutSubmitting(true);
    setPayoutError(null);
    try {
      await upsertPayoutIdentity(supabase, creator.id, payoutForm);
      await refetchPayoutIdentity();
      setPayoutFormOpen(false);
    } catch (err: unknown) {
      setPayoutError(
        err instanceof Error ? err.message : "Impossible d'enregistrer tes coordonnées de paiement."
      );
    } finally {
      setPayoutSubmitting(false);
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
        <h2 className="text-base font-semibold text-foreground">
          {hasEmailIdentity ? "Changer le mot de passe" : "Définir un mot de passe"}
        </h2>
        {!hasEmailIdentity && (
          <p className="text-sm text-muted-foreground">
            Ton compte utilise Google. Définis un mot de passe pour pouvoir aussi te
            connecter avec ton email.
          </p>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          {hasEmailIdentity && (
            <div className="space-y-1.5">
              <label htmlFor="current-password" className="text-sm font-medium text-foreground">
                Mot de passe actuel
              </label>
              <input
                id="current-password"
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}
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

      {/* ── Paiements ── */}
      <section className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#635BFF]/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-[#635BFF]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Paiements</h2>
            <p className="text-xs text-muted-foreground">Compte de paiement pour tes revenus</p>
          </div>
        </div>

        {stripeReturnMessage && (
          <p className="text-sm text-muted-foreground font-medium">{stripeReturnMessage}</p>
        )}

        {stripeError && (
          <p className="text-sm text-destructive font-medium">{stripeError}</p>
        )}

        {/* État 1 — Non configuré */}
        {stripeStatus === "not_configured" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure ton compte pour recevoir tes revenus chaque mois.
            </p>
            <button
              type="button"
              onClick={handleStripeSetup}
              disabled={stripeLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#635BFF] text-white text-sm font-medium hover:bg-[#635BFF]/90 transition-colors disabled:opacity-50"
            >
              {stripeLoading ? "Chargement…" : "Configurer mon compte de paiement →"}
            </button>
          </div>
        )}

        {/* État 2 — En cours (onboarding démarré, pas terminé) */}
        {stripeStatus === "pending" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <p className="text-sm font-medium text-foreground">Configuration en attente</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Complète ton compte Stripe pour activer les versements.
            </p>
            <button
              type="button"
              onClick={handleStripeSetup}
              disabled={stripeLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#635BFF] text-white text-sm font-medium hover:bg-[#635BFF]/90 transition-colors disabled:opacity-50"
            >
              {stripeLoading ? "Chargement…" : "Continuer la configuration →"}
            </button>
          </div>
        )}

        {/* État 3 — Actif */}
        {stripeStatus === "active" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              <p className="text-sm font-medium text-foreground">Compte actif</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Prochain versement : {getNextPayoutDate()}
            </p>
            <a
              href="https://connect.stripe.com/express_login"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Gérer mon compte Stripe ↗
            </a>
          </div>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          Tes revenus sont versés automatiquement chaque mois via Stripe Express.
        </p>

        <div className="pt-5 border-t border-border space-y-4">
          {!payoutFormOpen && !payoutIdentity && (
            <button
              type="button"
              onClick={openPayoutForm}
              className="text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
            >
              Pas éligible à Stripe ? Renseigne tes coordonnées de paiement (Remitly) →
            </button>
          )}

          {!payoutFormOpen && payoutIdentity && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className={
                    "w-2 h-2 rounded-full shrink-0 " +
                    (payoutIdentity.status === "verified" ? "bg-green-500" : "bg-amber-400")
                  }
                />
                <p className="text-sm font-medium text-foreground">
                  {payoutIdentity.status === "verified" ? "Vérifié ✓" : "En attente de vérification"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {payoutIdentity.payout_method === "mobile_money"
                  ? `${
                      MOBILE_MONEY_PROVIDERS.find((p) => p.value === payoutIdentity.mobile_money_provider)?.label ??
                      "Mobile Money"
                    } •••• ${
                      payoutIdentity.mobile_money_number?.slice(-2) ?? "--"
                    }`
                  : `${payoutIdentity.bank_name} •••• ${
                      payoutIdentity.bank_account_number?.slice(-4) ?? "----"
                    }`}
              </p>
              <button
                type="button"
                onClick={openPayoutForm}
                className="text-sm font-medium text-foreground underline underline-offset-2 hover:no-underline"
              >
                Modifier mes coordonnées
              </button>
            </div>
          )}

          {payoutFormOpen && (
            <form onSubmit={handleSubmitPayoutIdentity} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Coordonnées utilisées pour un versement manuel via Remitly.
              </p>

              {payoutError && (
                <p className="text-sm text-destructive font-medium">{payoutError}</p>
              )}

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Nom complet (légal)
                </label>
                <input
                  type="text"
                  value={payoutForm.legal_full_name}
                  onChange={(e) => setPayoutForm({ ...payoutForm, legal_full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Pays</label>
                <select
                  value={payoutForm.country}
                  onChange={(e) => setPayoutForm({ ...payoutForm, country: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  <option value="">Sélectionner…</option>
                  {AFRICAN_COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  N° pièce d'identité
                </label>
                <input
                  type="text"
                  value={payoutForm.id_document_number}
                  onChange={(e) => setPayoutForm({ ...payoutForm, id_document_number: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Mode de réception
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={payoutForm.payout_method === "mobile_money"}
                      onChange={() => setPayoutForm({ ...payoutForm, payout_method: "mobile_money" })}
                    />
                    Mobile Money
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={payoutForm.payout_method === "bank_transfer"}
                      onChange={() => setPayoutForm({ ...payoutForm, payout_method: "bank_transfer" })}
                    />
                    Virement bancaire
                  </label>
                </div>
              </div>

              {payoutForm.payout_method === "mobile_money" ? (
                <>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Opérateur
                    </label>
                    <select
                      value={payoutForm.mobile_money_provider ?? ""}
                      onChange={(e) =>
                        setPayoutForm({ ...payoutForm, mobile_money_provider: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    >
                      <option value="">Sélectionner…</option>
                      {MOBILE_MONEY_PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Numéro
                    </label>
                    <input
                      type="tel"
                      value={payoutForm.mobile_money_number ?? ""}
                      onChange={(e) =>
                        setPayoutForm({ ...payoutForm, mobile_money_number: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Banque
                    </label>
                    <input
                      type="text"
                      value={payoutForm.bank_name ?? ""}
                      onChange={(e) => setPayoutForm({ ...payoutForm, bank_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      N° compte
                    </label>
                    <input
                      type="text"
                      value={payoutForm.bank_account_number ?? ""}
                      onChange={(e) =>
                        setPayoutForm({ ...payoutForm, bank_account_number: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={payoutSubmitting}
                  className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {payoutSubmitting ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={() => setPayoutFormOpen(false)}
                  className="px-5 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}
        </div>
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
