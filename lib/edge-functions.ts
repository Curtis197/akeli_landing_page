import { createClient } from '@/lib/supabase/client'

// ─── Onboarding ───────────────────────────────────────────────────────────────
export async function completeOnboarding(profileData: {
  username: string
  display_name: string
  bio?: string
  heritage_region?: string
  specialty_codes?: string[]
  language_codes?: string[]
}) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('complete-onboarding', {
    body: profileData,
  })
  if (error) throw error
  return data
}

// ─── Recipes ─────────────────────────────────────────────────────────────────
export async function toggleRecipeLike(recipeId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('toggle-recipe-like', {
    body: { recipe_id: recipeId },
  })
  if (error) throw error
  return data as { liked: boolean; likes_count: number }
}

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

// ─── Translate content (generic) ─────────────────────────────────────────────
export async function translateContent(params: {
  table: string
  record_id: string
  fields: string[]
  target_locale: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('translate-content', {
    body: params,
  })
  if (error) throw error
  return data
}

// ─── Meal planning ───────────────────────────────────────────────────────────
export async function generateMealPlan(params: {
  start_date: string
  end_date: string
  preferences?: Record<string, unknown>
}) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
    body: params,
  })
  if (error) throw error
  return data as {
    meal_plan_id: string
    entries: Array<{
      date: string
      meal_type: string
      recipe_id: string
      servings: number
    }>
  }
}

export async function logMealConsumption(params: {
  recipe_id: string
  meal_plan_entry_id?: string
  servings: number
  rating?: number
}) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('log-meal-consumption', {
    body: params,
  })
  if (error) throw error
  return data
}

// ─── Fan mode ─────────────────────────────────────────────────────────────────
export async function activateFanMode(creatorId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('activate-fan-mode', {
    body: { creator_id: creatorId },
  })
  if (error) throw error
  return data as { subscription_id: string; checkout_url?: string }
}

export async function cancelFanMode(creatorId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('cancel-fan-mode', {
    body: { creator_id: creatorId },
  })
  if (error) throw error
  return data
}

// ─── Stripe ───────────────────────────────────────────────────────────────────
export async function createCheckoutSession(params: {
  creator_id: string
  price_id?: string
  success_url: string
  cancel_url: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: params,
  })
  if (error) throw error
  return data as { url: string; session_id: string }
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export async function getCreatorDashboard(creatorId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('get-creator-dashboard', {
    body: { creator_id: creatorId },
  })
  if (error) throw error
  return data as {
    revenue: {
      current_month: number
      previous_month: number
      lifetime: number
    }
    fans: { total: number; new_this_month: number }
    recipes: { total: number; published: number; top_performing: unknown[] }
    recent_activity: unknown[]
  }
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

// ─── AI Chat ──────────────────────────────────────────────────────────────────
export async function sendAiChatMessage(params: {
  conversation_id?: string
  message: string
}) {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('ai-assistant-chat', {
    body: params,
  })
  if (error) throw error
  return data as {
    conversation_id: string
    message: { id: string; role: 'assistant'; content: string; tokens_used: number }
  }
}
