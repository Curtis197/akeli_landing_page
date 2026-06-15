"use client";

interface SectionHeaderRowProps {
  title: string;
  onChange: (title: string) => void;
  onRemove: () => void;
}

export default function SectionHeaderRow({
  title,
  onChange,
  onRemove,
}: SectionHeaderRowProps) {
  return (
    <li className="flex items-center gap-2 py-2">
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
