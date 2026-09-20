// Balances are compared in whole cents so floating point noise (0.1 + 0.2) never decides a request.
function toCents(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function hasAvailableBalance(available: number): boolean {
  return toCents(available) > 0;
}

export function exceedsAvailableBalance(amount: number, available: number): boolean {
  return toCents(amount) > toCents(available);
}
