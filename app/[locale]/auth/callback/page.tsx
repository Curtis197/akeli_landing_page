"use client";

import { useEffect } from "react";
import { useRouter } from "@/lib/i18n/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();
    const code = new URLSearchParams(window.location.search).get("code");

    if (code) {
      // Exchange the PKCE code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (!error && data.session?.user) {
          setUser(data.session.user);
          router.replace("/dashboard");
        } else {
          router.replace("/auth/login");
        }
      });
    } else {
      // Fallback: try existing session (e.g. magic link flow)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
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
