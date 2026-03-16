"use client";

interface SectionHeaderRowProps {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  placeholder?: string;
  dragHandle?: React.ReactNode;
}

export function SectionHeaderRow({
  value,
  onChange,
  onRemove,
  placeholder = "Titre de section...",
  dragHandle,
}: SectionHeaderRowProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
      {dragHandle}
      <span className="text-primary/50 text-xs select-none">▸</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-b border-dashed border-primary/30
                   text-sm font-semibold text-foreground placeholder:text-muted-foreground
                   focus:outline-none focus:border-primary py-0.5"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive transition-colors text-xs shrink-0"
        aria-label="Supprimer le titre de section"
      >
        ✕
      </button>
    </div>
  );
}
