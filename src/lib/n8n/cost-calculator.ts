// ============================================================
// Cost Calculator — LLM token cost from model_pricing table
// ============================================================

import { getSupabaseAdmin } from '@/lib/supabase/admin'

// In-memory cache to avoid hitting DB on every execution
let pricingCache: Map<string, { prompt: number; completion: number }> | null = null
let cacheLoadedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Load model pricing from the database (cached for 5 minutes).
 */
async function loadPricing(): Promise<Map<string, { prompt: number; completion: number }>> {
  if (pricingCache && Date.now() - cacheLoadedAt < CACHE_TTL_MS) {
    return pricingCache
  }

  const { data, error } = await getSupabaseAdmin()
    .from('model_pricing')
    .select('model_name, cost_per_1k_prompt, cost_per_1k_completion')
    .eq('is_active', true)

  if (error || !data) {
    console.warn('[cost-calculator] Failed to load model pricing:', error?.message)
    return pricingCache || new Map()
  }

  pricingCache = new Map()
  for (const row of data) {
    pricingCache.set(row.model_name, {
      prompt: Number(row.cost_per_1k_prompt),
      completion: Number(row.cost_per_1k_completion),
    })
  }
  cacheLoadedAt = Date.now()
  return pricingCache
}

/**
 * Calculate the cost of an LLM execution based on token usage and model.
 * Returns 0 if the model is not found in the pricing table.
 *
 * @param modelName - The model name (e.g. "gpt-4o", "claude-sonnet-4")
 * @param tokensPrompt - Number of prompt tokens
 * @param tokensCompletion - Number of completion tokens
 * @returns Cost in USD
 */
export async function calculateCost(
  modelName: string | null,
  tokensPrompt: number,
  tokensCompletion: number
): Promise<number> {
  if (!modelName || (tokensPrompt === 0 && tokensCompletion === 0)) {
    return 0
  }

  const pricing = await loadPricing()

  // Try exact match first, then try normalized (lowercase, trimmed)
  let rates = pricing.get(modelName)
  if (!rates) {
    rates = pricing.get(modelName.toLowerCase().trim())
  }

  if (!rates) {
    // Model not in pricing table — can't calculate
    return 0
  }

  const promptCost = (tokensPrompt / 1000) * rates.prompt
  const completionCost = (tokensCompletion / 1000) * rates.completion
  return Number((promptCost + completionCost).toFixed(6))
}
