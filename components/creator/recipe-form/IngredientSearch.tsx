"use client";

import { useState, useEffect, useRef } from "react";
import { searchIngredients } from "@/lib/queries/ingredients";
import type { IngredientResult } from "@/lib/queries/ingredients";

interface IngredientSearchProps {
  onSelect: (ingredient: IngredientResult) => void;
  onSubmitNew: (query: string) => void;
}

export default function IngredientSearch({
  onSelect,
  onSubmitNew,
}: IngredientSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IngredientResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchIngredients(query);
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (ingredient: IngredientResult) => {
    onSelect(ingredient);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un ingrédient..."
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">
          ...
        </span>
      )}
      {open && (
        <ul className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-background shadow-lg overflow-hidden">
          {results.map((ing) => (
            <li key={ing.id}>
              <button
                type="button"
                onClick={() => handleSelect(ing)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
              >
                <span className="flex-1 font-medium text-foreground">
                  {ing.name_fr}
                </span>
                {ing.category && (
                  <span className="text-xs text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    {ing.category}
                  </span>
                )}
                {ing.calories_per_100g != null && (
                  <span className="text-xs text-muted-foreground">
                    {ing.calories_per_100g} kcal/100g
                  </span>
                )}
              </button>
            </li>
          ))}
          {query.trim().length >= 2 && (
            <li className="border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSubmitNew(query.trim());
                }}
                className="w-full px-3 py-2 text-sm text-primary hover:bg-primary/5 transition-colors text-left"
              >
                + Soumettre « {query.trim()} » comme nouvel ingrédient
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
