"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SectionHeaderRowProps {
  id: string;
  title: string;
  onChange: (title: string) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isMobile?: boolean;
}

export default function SectionHeaderRow({
  id,
  title,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  isMobile = false,
}: SectionHeaderRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-2 py-2"
    >
      {isMobile ? (
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!onMoveUp}
            className="p-0.5 text-muted-foreground disabled:opacity-50"
            aria-label="Remonter la section"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!onMoveDown}
            className="p-0.5 text-muted-foreground disabled:opacity-50"
            aria-label="Descendre la section"
          >
            ▼
          </button>
        </div>
      ) : (
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground p-1 hover:text-foreground transition-colors"
          aria-label="Réordonner la section"
        >
          ⠿
        </button>
      )}
      <div className="flex-1 h-px bg-border" />
      <input
        type="text"
        value={title}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nom de la section"
        className="px-3 py-1 rounded-md border border-dashed border-primary/50 bg-primary/5 text-sm font-medium text-primary placeholder:text-primary/40 focus:outline-none focus:ring-2 focus:ring-ring w-48 text-center"
      />
      <div className="flex-1 h-px bg-border" />
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
        aria-label="Supprimer la section"
      >
        ✕
      </button>
    </li>
  );
}
