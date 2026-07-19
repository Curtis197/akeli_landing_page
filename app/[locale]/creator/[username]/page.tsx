import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import CreatorProfileClient from "./CreatorProfileClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username: creatorId } = await params; // route segment is the creator's id

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  );

  const { data: creator } = await supabase
    .from("creator")
    .select("display_name, bio, profile_image_url")
    .eq("id", creatorId)
    .single();

  if (!creator) notFound();

  const title = creator.display_name ?? "Créateur Akeli";
  const description = creator.bio ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: creator.profile_image_url ? [{ url: creator.profile_image_url }] : undefined,
    },
  };
}

export default function CreatorProfilePage() {
  return <CreatorProfileClient />;
}
