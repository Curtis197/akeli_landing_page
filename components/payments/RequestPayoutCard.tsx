"use client";

import { useState } from "react";
import { Link } from "@/lib/i18n/navigation";
import { formatEuro } from "@/lib/utils/format";
import { exceedsAvailableBalance } from "@/lib/payments/available-balance";
import { parsePayoutRequestAmount } from "@/lib/payments/parse-request-amount";
import type { RequestEligibility } from "@/lib/payments/request-eligibility";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_amount: "Montant invalide. Saisis un montant positif avec 2 décimales maximum.",
  no_identity: "Renseigne d'abord ton moyen de paiement dans les paramètres.",
  pending_verification: "Ton moyen de paiement est en cours de vérification.",
  open_request: "Tu as déjà une demande en cours.",
  no_balance: "Aucun solde disponible pour le moment.",
  insufficient_balance: "Le montant dépasse ton solde disponible.",
  not_a_creator: "Ce compte n'est pas un compte créateur.",
  unauthorized: "Ta session a expiré. Reconnecte-toi.",
  server_error: "Une erreur est survenue. Réessaie dans un instant.",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  processing: "En cours",
};

// French input format ("25,00") that parsePayoutRequestAmount accepts.
function toFieldValue(amount: number): string {
  return amount.toFixed(2).replace(".", ",");
}

export function RequestPayoutCard({
  eligibility,
  openPayout,
  availableBalance,
  onRequested,
}: {
  eligibility: RequestEligibility;
  openPayout: { amount: number; status: string } | null;
  availableBalance: number;
  onRequested: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // The server enforces this too; checking here just avoids a pointless round trip.
    const parsed = parsePayoutRequestAmount(amount);
    if (parsed !== null && exceedsAvailableBalance(parsed, availableBalance)) {
      setError(ERROR_MESSAGES.insufficient_balance);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/payouts/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(ERROR_MESSAGES[data.error] ?? ERROR_MESSAGES.server_error);
        return;
      }
      setAmount("");
      onRequested();
    } catch {
      setError(ERROR_MESSAGES.server_error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl p-6 bg-card space-y-3" style={{ border: "1px solid var(--color-border)" }}>
      <h2 className="text-xl font-semibold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
        Demander un versement
      </h2>

      {eligibility === "no_identity" && (
        <p className="text-sm text-muted-foreground">
          {ERROR_MESSAGES.no_identity}{" "}
          <Link href="/settings" className="font-medium text-primary hover:underline">
            Renseigner mon moyen de paiement
          </Link>
        </p>
      )}

      {eligibility === "pending_verification" && (
        <p className="text-sm text-muted-foreground">{ERROR_MESSAGES.pending_verification}</p>
      )}

      {eligibility === "open_request" && openPayout && (
        <p className="text-sm text-muted-foreground">
          Demande en cours : <strong className="text-foreground">{formatEuro(openPayout.amount)}</strong> —{" "}
          {STATUS_LABELS[openPayout.status] ?? openPayout.status}
        </p>
      )}

      {eligibility === "no_balance" && <p className="text-sm text-muted-foreground">{ERROR_MESSAGES.no_balance}</p>}

      {eligibility === "eligible" && (
        <>
          <p className="text-sm text-muted-foreground">
            Disponible : <strong className="text-foreground">{formatEuro(availableBalance)}</strong>
          </p>
          <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label htmlFor="payout-amount" className="text-sm font-medium text-foreground">
                Montant (€)
              </label>
              <input
                id="payout-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="ex. 25,00"
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setAmount(toFieldValue(availableBalance))}
                className="text-xs font-medium text-primary hover:underline"
              >
                Tout demander ({formatEuro(availableBalance)})
              </button>
            </div>
            <button
              type="submit"
              disabled={submitting || !amount.trim()}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Envoi…" : "Demander un versement"}
            </button>
          </form>
        </>
      )}

      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
    </div>
  );
}
