"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";
import { getCreatorBalance, getPayoutHistory } from "@/lib/queries/payments";
import { formatEuro, formatDate, formatMonthLabel } from "@/lib/utils/format";

interface Balance {
  available_balance: number;
  pending_balance: number;
  lifetime_earnings: number;
  last_payout_at: string | null;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  stripe_payout_id: string | null;
  requested_at: string;
  completed_at: string | null;
}

const STATUS_CFG: Record<string, { label: string; dot: string; text: string }> = {
  completed:  { label: "Payé",       dot: "bg-emerald-400",  text: "text-emerald-700" },
  pending:    { label: "En attente", dot: "bg-amber-400",    text: "text-amber-700"   },
  processing: { label: "En cours",   dot: "bg-blue-400",     text: "text-blue-700"    },
  failed:     { label: "Échoué",     dot: "bg-red-400",      text: "text-red-700"     },
};

const PAGE_SIZE = 12;

export default function PaymentsPage() {
  const supabase = createClient();
  const { creator } = useAuthStore();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);

  useEffect(() => {
    if (!creator) return;
    setLoading(true);
    Promise.all([
      getCreatorBalance(supabase, creator.id),
      getPayoutHistory(supabase, creator.id, 0, PAGE_SIZE),
    ]).then(([bal, hist]) => {
      setBalance(bal);
      setPayouts(hist.data);
      setTotal(hist.total);
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creator]);

  async function loadPage(p: number) {
    if (!creator) return;
    setPageLoading(true);
    const hist = await getPayoutHistory(supabase, creator.id, p, PAGE_SIZE);
    setPayouts(hist.data);
    setPage(p);
    setPageLoading(false);
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div style={{ borderBottom: "2px solid var(--color-brand-dark)", paddingBottom: "1.25rem" }}>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-1">
          Espace Créateur
        </p>
        <h1
          className="text-4xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Paiements
        </h1>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BalanceCard
          label="Disponible"
          sublabel="Versement le mois prochain"
          amount={balance?.available_balance ?? 0}
          loading={loading}
          accent="var(--color-brand-green)"
        />
        <BalanceCard
          label="En attente"
          sublabel="Consommations en traitement"
          amount={balance?.pending_balance ?? 0}
          loading={loading}
          accent="var(--color-brand-amber)"
        />
        <BalanceCard
          label="Total gagné"
          sublabel={
            balance?.last_payout_at
              ? "Dernier versement " + formatDate(balance.last_payout_at)
              : "Depuis le début"
          }
          amount={balance?.lifetime_earnings ?? 0}
          loading={loading}
          accent="var(--color-brand-forest)"
        />
      </div>

      {/* Payout history */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-xl font-semibold text-foreground"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Historique des versements
          </h2>
          {total > 0 && (
            <span className="text-xs text-muted-foreground">
              {total} versement{total > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {loading ? (
          <PayoutSkeleton />
        ) : payouts.length === 0 ? (
          <EmptyPayouts />
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
            {/* Table header */}
            <div
              className="hidden sm:grid text-xs font-medium uppercase tracking-wider text-muted-foreground px-6 py-3"
              style={{
                gridTemplateColumns: "1fr 120px 110px 150px 120px",
                background: "var(--color-brand-cream)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <span>Période</span>
              <span className="text-right">Montant</span>
              <span className="text-center">Statut</span>
              <span className="text-right">Date versement</span>
              <span className="text-right">Référence</span>
            </div>

            {/* Rows */}
            <div
              className={"divide-y bg-card transition-opacity" + (pageLoading ? " opacity-60" : "")}
              style={{ borderColor: "var(--color-border)" }}
            >
              {payouts.map((payout) => {
                const cfg = STATUS_CFG[payout.status] ?? STATUS_CFG.pending;
                return (
                  <div
                    key={payout.id}
                    className="flex flex-col sm:grid items-start sm:items-center px-6 py-4 gap-2 sm:gap-0 hover:bg-secondary/40 transition-colors"
                    style={{ gridTemplateColumns: "1fr 120px 110px 150px 120px" }}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {formatMonthLabel(payout.requested_at)}
                    </span>
                    <span
                      className="text-left sm:text-right text-sm font-bold"
                      style={{ fontFamily: "var(--font-display)", color: "var(--color-brand-amber)" }}
                    >
                      {formatEuro(payout.amount)}
                    </span>
                    <span className="flex items-center sm:justify-center gap-1.5">
                      <span className={"w-2 h-2 rounded-full shrink-0 " + cfg.dot} />
                      <span className={"text-xs font-medium " + cfg.text}>{cfg.label}</span>
                    </span>
                    <span className="text-left sm:text-right text-xs text-muted-foreground">
                      {payout.completed_at
                        ? formatDate(payout.completed_at)
                        : payout.status === "failed"
                        ? "—"
                        : "En cours"}
                    </span>
                    <span className="text-left sm:text-right text-xs font-mono text-muted-foreground">
                      {payout.stripe_payout_id
                        ? payout.stripe_payout_id.slice(-8).toUpperCase()
                        : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderTop: "1px solid var(--color-border)", background: "var(--color-brand-cream)" }}
              >
                <p className="text-xs text-muted-foreground">
                  Page {page + 1} sur {Math.ceil(total / PAGE_SIZE)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadPage(page - 1)}
                    disabled={page === 0 || pageLoading}
                    className="px-4 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-40"
                  >
                    ← Précédent
                  </button>
                  <button
                    onClick={() => loadPage(page + 1)}
                    disabled={(page + 1) * PAGE_SIZE >= total || pageLoading}
                    className="px-4 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-secondary transition-colors disabled:opacity-40"
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BalanceCard({
  label, sublabel, amount, loading, accent,
}: {
  label: string; sublabel: string; amount: number; loading: boolean; accent: string;
}) {
  return (
    <div
      className="rounded-2xl p-6 bg-card flex flex-col gap-3"
      style={{ border: "1px solid var(--color-border)", borderTop: "3px solid " + accent }}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {loading
        ? <div className="h-9 w-32 rounded-lg bg-secondary animate-pulse" />
        : <p className="text-3xl font-bold leading-none" style={{ fontFamily: "var(--font-display)", color: accent }}>
            {formatEuro(amount)}
          </p>
      }
      <p className="text-xs text-muted-foreground leading-snug">{sublabel}</p>
    </div>
  );
}

function PayoutSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border last:border-0">
          <div className="h-4 w-32 rounded bg-secondary animate-pulse" />
          <div className="ml-auto h-4 w-20 rounded bg-secondary animate-pulse" />
          <div className="h-4 w-16 rounded bg-secondary animate-pulse" />
          <div className="h-4 w-24 rounded bg-secondary animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function EmptyPayouts() {
  return (
    <div className="rounded-2xl p-12 text-center" style={{ border: "1px dashed var(--color-border)" }}>
      <p className="text-4xl mb-3">💳</p>
      <p className="font-semibold text-foreground">Aucun versement pour le moment</p>
      <p className="text-sm text-muted-foreground mt-1">
        Tes paiements apparaîtront ici après traitement des consommations.
      </p>
    </div>
  );
}
