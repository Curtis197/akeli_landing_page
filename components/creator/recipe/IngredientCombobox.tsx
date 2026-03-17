"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocale } from "next-intl";
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
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { results, loading } = useIngredientSearch(query, creatorUserId, locale);

  // Total items = results + optionally the "submit" row at the end
  const hasSubmitRow = !loading && results.length === 0 && query.length >= 2;
  const totalItems = results.length + (hasSubmitRow ? 1 : 0);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-option]");
    const el = items[activeIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleSelect = useCallback((ingredient: IngredientOption) => {
    onChange(ingredient);
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
  }, [onChange]);

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % totalItems);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => (i <= 0 ? totalItems - 1 : i - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < results.length) {
          handleSelect(results[activeIndex]);
        } else if (hasSubmitRow && activeIndex === results.length) {
          setOpen(false);
          onNotFound(query);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const showDropdown = open && query.length >= 2;

  return (
    <div className="relative w-full">
      {/* Input */}
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
          onBlur={() => setTimeout(() => { setOpen(false); setActiveIndex(-1); }, 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `ingredient-option-${activeIndex}` : undefined}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm
                     text-foreground placeholder:text-muted-foreground
                     focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            tabIndex={-1}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
            aria-label="Effacer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Pending badge */}
      {value?.status === "pending" && (
        <span className="mt-1 inline-block text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
          ⏳ En attente de validation Akeli
        </span>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-background shadow-lg overflow-hidden"
          role="listbox"
        >
          {loading && (
            <div className="px-3 py-2 text-sm text-muted-foreground">Recherche...</div>
          )}

          {!loading && results.length > 0 && (
            <ul ref={listRef} className="max-h-52 overflow-y-auto divide-y divide-border">
              {results.map((ing, i) => (
                <li
                  key={ing.id}
                  id={`ingredient-option-${i}`}
                  data-option
                  role="option"
                  aria-selected={i === activeIndex}
                >
                  <button
                    type="button"
                    onMouseDown={() => handleSelect(ing)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                      i === activeIndex ? "bg-primary/10 text-foreground" : "hover:bg-secondary"
                    }`}
                  >
                    <span className="text-foreground">{ing.name}</span>
                    <span className="flex items-center gap-2">
                      {ing.category && (
                        <span className="text-xs text-muted-foreground capitalize">{ing.category}</span>
                      )}
                      {ing.status === "pending" && (
                        <span className="text-xs text-amber-500">⏳</span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {hasSubmitRow && (
            <div className="px-3 py-3 text-sm">
              <p className="text-muted-foreground mb-2">Aucun résultat pour « {query} »</p>
              <button
                type="button"
                id={`ingredient-option-${results.length}`}
                data-option
                onMouseDown={() => { setOpen(false); onNotFound(query); }}
                onMouseEnter={() => setActiveIndex(results.length)}
                className={`text-primary text-xs font-medium hover:underline transition-colors ${
                  activeIndex === results.length ? "underline" : ""
                }`}
              >
                + Soumettre « {query} » comme nouvel ingrédient
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
