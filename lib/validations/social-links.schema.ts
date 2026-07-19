import { z } from "zod";

export function normalizeHandle(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const lastSegment = withoutProtocol.includes("/")
    ? withoutProtocol.split("/").filter(Boolean).pop() ?? ""
    : withoutProtocol;
  return lastSegment.replace(/^@/, "");
}

export function normalizeWebsiteUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export const socialLinksSchema = z.object({
  instagram_handle: z.string().max(30, "Maximum 30 caractères"),
  tiktok_handle: z.string().max(30, "Maximum 30 caractères"),
  youtube_handle: z.string().max(60, "Maximum 60 caractères"),
  website_url: z.union([z.literal(""), z.string().url("URL invalide")]),
});

export type SocialLinksData = z.infer<typeof socialLinksSchema>;
