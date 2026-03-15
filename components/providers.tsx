"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/stores/authStore";

function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setCreator, setLoading } = useAuthStore();
  const supabase = createClient();

  useEffect(() => {
    console.log("[AuthProvider] SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("[AuthProvider] ANON_KEY set:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log("[AuthProvider] session user:", session?.user?.id ?? "null");
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log("[AuthProvider] fetching creator for user:", session.user.id);
        const timeout = setTimeout(() => console.error("[AuthProvider] creator fetch TIMED OUT after 5s"), 5000);
        const { data: creator, error: creatorError } = await supabase
          .from("creator")
          .select("*")
          .eq("user_id", session.user.id)
          .single();
        clearTimeout(timeout);
        console.log("[AuthProvider] creator fetch:", { id: creator?.id, error: creatorError?.message });
        setCreator(creator);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthProvider] auth event:", event, "user:", session?.user?.id ?? "null");
      setUser(session?.user ?? null);
      if (session?.user) {
        console.log("[AuthProvider] fetching creator (event) for user:", session.user.id);
        const timeout2 = setTimeout(() => console.error("[AuthProvider] creator fetch (event) TIMED OUT after 5s"), 5000);
        const { data: creator, error: creatorError } = await supabase
          .from("creator")
          .select("*")
          .eq("user_id", session.user.id)
          .single();
        clearTimeout(timeout2);
        console.log("[AuthProvider] creator (event):", { id: creator?.id, error: creatorError?.message });
        setCreator(creator);
      } else {
        setCreator(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );
}
