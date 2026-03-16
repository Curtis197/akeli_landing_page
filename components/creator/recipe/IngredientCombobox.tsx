"use client";

import { useState, useRef } from "react";
import { useIngredientSearch, type IngredientOption } from "@/hooks/use-ingredient-search";

interface IngredientComboboxProps {
  value: IngredientOption | null;
  onChange: (ingredient: IngredientOption | null) => void;
  creatorUserId: string;
  onNotFound: (query: string) => void;
  placeholder?: string;
}

export function IngredientCombobox({
  value,
  onChange,
  creatorUserId,
  onNotFound,
  placeholder = "Rechercher un ingrédient...",
}: IngredientComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading } = useIngredientSearch(query, creatorUserId);

  const handleSelect = (ingredient: IngredientOption) => {
    onChange(ingredient);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value ? value.name : query}
          onChange={(e) => {
            if (value) onChange(null);
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm
                     text-foreground placeholder:text-muted-foreground
                     focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {value?.status === "pending" && (
        <span className="mt-1 inline-block text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
          ⏳ En attente de validation Akeli
        </span>
      )}

      {open && query.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg overflow-hidden">
          {loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Recherche...</div>
          )}

          {!loading && results.length > 0 && (
            <ul className="max-h-48 overflow-y-auto divide-y divide-border">
              {results.map((ing) => (
                <li key={ing.id}>
                  <button
                    type="button"
                    onMouseDown={() => handleSelect(ing)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center justify-between"
                  >
                    <span className="text-foreground">{ing.name}</span>
                    {ing.category && (
                      <span className="text-xs text-muted-foreground capitalize">{ing.category}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && results.length === 0 && (
            <div className="px-3 py-3 text-sm">
              <p className="text-muted-foreground mb-2">Aucun résultat pour "{query}"</p>
              <button
                type="button"
                onMouseDown={() => { setOpen(false); onNotFound(query); }}
                className="text-primary text-xs font-medium hover:underline"
              >
                + Soumettre "{query}" comme nouvel ingrédient
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
