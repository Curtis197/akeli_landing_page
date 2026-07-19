"use client";

import { useState, useEffect, useRef } from "react";
import { searchCreatorRecipes } from "@/lib/queries/creator-recipes";
import type { CreatorRecipeResult } from "@/lib/queries/creator-recipes";

interface RecipeEmbedPickerProps {
  creatorId: string;
  onSelect: (recipe: CreatorRecipeResult) => void;
}

export default function RecipeEmbedPicker({ creatorId, onSelect }: RecipeEmbedPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CreatorRecipeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!creatorId || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await searchCreatorRecipes(creatorId, query);
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, creatorId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (recipe: CreatorRecipeResult) => {
    onSelect(recipe);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher une de tes recettes..."
        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">...</span>
      )}
      {open && (
        <ul className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-background shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Aucune recette trouvée</li>
          ) : (
            results.map((recipe) => (
              <li key={recipe.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(recipe)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-secondary transition-colors text-left"
                >
                  {recipe.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={recipe.cover_image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-secondary shrink-0 flex items-center justify-center text-sm">🍽️</div>
                  )}
                  <span className="flex-1 font-medium text-foreground truncate">{recipe.title}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
