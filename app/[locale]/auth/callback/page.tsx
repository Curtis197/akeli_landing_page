"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setUser, setCreator } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();
    const code = new URLSearchParams(window.location.search).get("code");

    async function handleSession(userId: string) {
      // Ensure a creator row exists for this user
      const { data: existing } = await supabase
        .from("creator")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (!existing) {
        await supabase.from("creator").insert({ user_id: userId, display_name: '' });
      }

      // Fetch full creator profile
      const { data: creator } = await supabase
        .from("creator")
        .select("*")
        .eq("user_id", userId)
        .single();
      setCreator(creator);
    }

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(async ({ data, error }) => {
        if (!error && data.session?.user) {
          setUser(data.session.user);
          await handleSession(data.session.user.id);
          router.replace("/dashboard");
        } else {
          router.replace("/auth/login");
        }
      });
    } else {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          await handleSession(session.user.id);
          router.replace("/dashboard");
        } else {
          router.replace("/auth/login");
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Connexion en cours…</p>
      </div>
    </main>
  );
}
