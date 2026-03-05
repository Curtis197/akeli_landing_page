"use client";

import { useState } from "react";
import Link from "next/link";
import type { FAQItem } from "@/types/faq";

interface FAQAccordionProps {
  items: FAQItem[];
  showCategories?: boolean;
  expandFirst?: boolean;
}

export function FAQAccordion({
  items,
  showCategories = false,
  expandFirst = false,
}: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(
    expandFirst && items.length > 0 ? items[0].id : null
  );

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  if (showCategories) {
    // Grouper par catégorie
    const categories = Array.from(new Set(items.map((i) => i.category)));
    return (
      <div className="space-y-8">
        {categories.map((cat) => (
          <div key={cat} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {cat}
            </h3>
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {items
                .filter((i) => i.category === cat)
                .map((item) => (
                  <FAQRow
                    key={item.id}
                    item={item}
                    isOpen={openId === item.id}
                    onToggle={() => toggle(item.id)}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
      {items.map((item) => (
        <FAQRow
          key={item.id}
          item={item}
          isOpen={openId === item.id}
          onToggle={() => toggle(item.id)}
        />
      ))}
    </div>
  );
}

function FAQRow({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-card">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-secondary/50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium text-foreground">{item.question}</span>
        <span
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          <ChevronIcon />
        </span>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{item.answer}</p>
          {item.link && (
            <Link
              href={item.link}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              {item.linkLabel ?? "En savoir plus"}
              <ArrowIcon />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 6h7M6.5 3.5L9 6l-2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
