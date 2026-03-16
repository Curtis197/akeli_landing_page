"use client";

import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { createClient } from "@/lib/supabase/client";

export interface IngredientOption {
  id: string;
  name: string; // name_fr → name → name_en
  category: string | null;
  status: "validated" | "pending";
}

export function useIngredientSearch(query: string, creatorUserId: string) {
  const [results, setResults] = useState<IngredientOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery] = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const supabase = createClient();
    let cancelled = false;

    const search = async () => {
      setLoading(true);
      try {
        // Get pending ingredients submitted by this creator
        const { data: submissions } = await supabase
          .from("ingredient_submission")
          .select("ingredient_id")
          .eq("submitted_by", creatorUserId)
          .eq("status", "pending");

        const creatorPendingIds = (submissions ?? [])
          .map((s: any) => s.ingredient_id)
          .filter(Boolean);

        const filterExpr =
          creatorPendingIds.length > 0
            ? `status.eq.validated,and(status.eq.pending,id.in.(${creatorPendingIds.join(",")}))`
            : "status.eq.validated";

        const { data, error } = await supabase
          .from("ingredient")
          .select("id, name, name_fr, name_en, category, status")
          .or(filterExpr)
          .or(
            `name_fr.ilike.%${debouncedQuery}%,name_en.ilike.%${debouncedQuery}%,name.ilike.%${debouncedQuery}%`
          )
          .order("name_fr", { ascending: true })
          .limit(10);

        if (cancelled) return;
        if (error) { setResults([]); return; }

        setResults(
          (data ?? []).map((ing: any) => ({
            id: ing.id,
            name: ing.name_fr ?? ing.name ?? ing.name_en ?? "Ingrédient",
            category: ing.category ?? null,
            status: ing.status as "validated" | "pending",
          }))
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    search();
    return () => { cancelled = true; };
  }, [debouncedQuery, creatorUserId]);

  return { results, loading };
}
