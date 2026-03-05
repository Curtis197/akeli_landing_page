"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();
  const { setUser } = useAuthStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        router.replace("/dashboard");
      } else {
        router.replace("/auth/login");
      }
    });
  }, [router, setUser, supabase.auth]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Connexion en cours…</p>
      </div>
    </main>
  );
}
