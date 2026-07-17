const WORDS_PER_MINUTE = 200;

export function computeReadingTimeMin(blocks: { type: string; text?: string }[]): number {
  const wordCount = blocks
    .map((b) => b.text ?? "")
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  if (wordCount === 0) return 1;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}
