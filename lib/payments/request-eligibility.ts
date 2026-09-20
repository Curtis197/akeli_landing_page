import { hasAvailableBalance } from "./available-balance";

export type RequestEligibility =
  | "no_identity"
  | "pending_verification"
  | "open_request"
  | "no_balance"
  | "eligible";

export function getRequestEligibility(input: {
  identityStatus: "submitted" | "verified" | null;
  hasOpenPayout: boolean;
  availableBalance: number;
}): RequestEligibility {
  if (input.hasOpenPayout) return "open_request";
  if (input.identityStatus === null) return "no_identity";
  if (input.identityStatus === "submitted") return "pending_verification";
  if (!hasAvailableBalance(input.availableBalance)) return "no_balance";
  return "eligible";
}
