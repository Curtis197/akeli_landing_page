import type { ReactNode } from "react";

// Supports **bold** and *italic* only — matches exactly what the post editor's
// placeholder text tells creators to type (BlockRenderer.tsx's paragraph
// placeholder: "Écris ton paragraphe... (**gras**, *italique*)"). No nesting,
// no other markdown syntax.
export function renderInlineMarkdown(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter((t) => t !== "");
  return tokens.map((token, i) => {
    if (token.startsWith("**") && token.endsWith("**") && token.length > 4) {
      return <strong key={i}>{token.slice(2, -2)}</strong>;
    }
    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      return <em key={i}>{token.slice(1, -1)}</em>;
    }
    return token;
  });
}
