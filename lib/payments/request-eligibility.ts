export type RequestEligibility = "no_identity" | "pending_verification" | "open_request" | "eligible";

export function getRequestEligibility(input: {
  identityStatus: "submitted" | "verified" | null;
  hasOpenPayout: boolean;
}): RequestEligibility {
  if (input.hasOpenPayout) return "open_request";
  if (input.identityStatus === null) return "no_identity";
  if (input.identityStatus === "submitted") return "pending_verification";
  return "eligible";
}
