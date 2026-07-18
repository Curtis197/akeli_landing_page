import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import BlogFeedClient from "@/components/public/blog/BlogFeedClient";

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username: creatorId } = await params;

  const { data: creator } = await supabase()
    .from("creator")
    .select("display_name, bio")
    .eq("id", creatorId)
    .single();

  if (!creator) notFound();

  const title = `${creator.display_name ?? "Créateur"} — Blog`;

  return {
    title,
    description: creator.bio ?? undefined,
  };
}

export default function CreatorBlogFeedPage() {
  return <BlogFeedClient />;
}
