/** Accept only same-site relative paths ("/...") so the auth callback's
 *  `next` param can't be abused as an open redirect. Browsers treat both
 *  "//host" and "/\host" as protocol-relative URLs, so both are rejected. */
export function sanitizeNextPath(next: string | null): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
