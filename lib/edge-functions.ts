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

// ─── Gemini: Recipe standardization (preview/apply) ──────────────────────────

// functions.invoke() surfaces a non-2xx as a generic "returned a non-2xx status code"
// error and hides the real body on error.context (a Response). Unwrap it so the caller
// gets the function's own categorized error code instead of that generic string.
async function unwrapFunctionError(error: any): Promise<Error> {
  if (error?.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json()
      if (body?.error) return new Error(body.error)
    } catch {
      // fall through to the generic error below
    }
  }
  return error instanceof Error ? error : new Error(String(error))
}

export interface RecipeCleanSuggestion {
  suggested: string
  reason: string
}

export interface RecipeCleanStepProposal {
  step_id: string
  change_type: 'reworded' | 'split'
  suggested: Array<{
    title: string | null
    content: string | null
    timer_seconds: number | null
    is_section_header: boolean
  }>
  reason: string | null
}

export interface RecipeCleanNewStepSuggestion {
  after_step_id: string | null
  content: string
  reason: string
}

export interface PreviewRecipeCleanResult {
  title_suggestion: RecipeCleanSuggestion | null
  description_suggestion: RecipeCleanSuggestion | null
  step_proposals: RecipeCleanStepProposal[]
  new_step_suggestions: RecipeCleanNewStepSuggestion[]
  evaluation: {
    ordering_issues: string | null
    general_observations: string | null
  }
}

export async function previewRecipeClean(recipeId: string): Promise<PreviewRecipeCleanResult> {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('recipe-cleaner', {
    body: { recipe_id: recipeId, mode: 'preview' },
  })
  if (error) throw await unwrapFunctionError(error)
  return data as PreviewRecipeCleanResult
}

export interface RecipeCleanApplyStep {
  step_number: number
  sort_order: number
  title: string | null
  content: string | null
  image_url: string | null
  timer_seconds: number | null
  is_section_header: boolean
  ingredient_ids: string[]
}

export interface ApplyRecipeCleanResult {
  applied: boolean
  steps_count: number
  title_description_error?: string
}

export async function applyRecipeClean(
  recipeId: string,
  payload: { title: string; description: string | null; steps: RecipeCleanApplyStep[] }
): Promise<ApplyRecipeCleanResult> {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('recipe-cleaner', {
    body: { recipe_id: recipeId, mode: 'apply', ...payload },
  })
  if (error) throw await unwrapFunctionError(error)
  return data as ApplyRecipeCleanResult
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
