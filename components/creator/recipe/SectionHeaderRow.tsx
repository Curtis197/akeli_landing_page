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
    <div className="flex items-center gap-2 px-1 py-2">
      {dragHandle}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent border-b border-dashed border-green-500/40
                   text-base font-semibold text-green-600 dark:text-green-400
                   placeholder:text-green-500/40
                   focus:outline-none focus:border-green-500 py-0.5"
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
