import { createClient } from '@/lib/supabase/client'

// ─── Gemini: Spell correction (call with 2s debounce) ────────────────────────
export async function correctText(
  text: string,
  fieldType: 'title' | 'description' | 'step' | 'bio',
  sourceLanguage: string
) {
  if (text.length < 5) return null

  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('gemini-correct-text', {
    body: { text, field_type: fieldType, source_language: sourceLanguage },
  })
  if (error) throw error
  return data
}

// ─── Gemini: Translate recipe (fire & forget — no await needed) ───────────────
export function translateRecipeAsync(recipeId: string, sourceLocale: string): void {
  // Intentionally not awaited — translation happens in background
  const supabase = createClient()
  supabase.functions.invoke('translate-recipe', {
    body: { recipe_id: recipeId, source_locale: sourceLocale },
  }).catch(err => console.warn('Translation background error:', err))
}

// ─── Claude: Explain dashboard stats ─────────────────────────────────────────
export async function explainCreatorStats(creatorId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('explain-creator-stats', {
    body: { creator_id: creatorId },
  })
  if (error) throw error
  return data as {
    explanation: string
    insights: Array<{ type: 'positive' | 'neutral' | 'opportunity'; text: string }>
    suggestions: Array<{ action: string; reason: string; priority: 'high' | 'medium' | 'low' }>
  }
}

// ─── Claude: Explain recipe performance ──────────────────────────────────────
export async function explainRecipePerformance(recipeId: string, creatorId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('explain-recipe-performance', {
    body: { recipe_id: recipeId, creator_id: creatorId },
  })
  if (error) throw error
  return data as {
    explanation: string
    insights: Array<{ type: 'positive' | 'neutral' | 'opportunity'; text: string }>
    suggestions: Array<{ action: string; reason: string; priority: 'high' | 'medium' | 'low' }>
  }
}
