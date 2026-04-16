// ============================================================
// N8N API Client — Enrichment
// Fetches execution details (tokens, model) from N8N REST API
// Called async after inserting the execution row
// ============================================================

interface N8NExecutionDetail {
  tokens_prompt: number
  tokens_completion: number
  model_name: string | null
  duration_ms: number | null
}

/**
 * Fetch execution details from the N8N API.
 * Returns null if the instance has no API credentials or the request fails.
 * This is non-blocking — enrichment failure should never break the pipeline.
 */
// Poll interval schedule: 4s, 8s, 12s, 16s, 20s (max ~60s total wait)
const POLL_DELAYS_MS = [4_000, 4_000, 4_000, 4_000, 4_000]

export async function fetchN8NExecutionDetail(
  apiBaseUrl: string,
  apiKey: string,
  executionId: string
): Promise<N8NExecutionDetail | null> {
  const url = `${apiBaseUrl.replace(/\/$/, '')}/api/v1/executions/${executionId}?includeData=true`
  const headers = { 'X-N8N-API-KEY': apiKey, 'Accept': 'application/json' }

  // N8N fires the webhook mid-execution (before AI nodes finish).
  // Poll until finished=true, up to 5 retries (~60s window).
  for (let attempt = 0; attempt <= POLL_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, POLL_DELAYS_MS[attempt - 1]))
    }

    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) })

      if (!res.ok) {
        console.warn(`[n8n-enrichment] API returned ${res.status} for execution ${executionId}`)
        return null
      }

      const data = await res.json() as Record<string, unknown>

      if (data.finished === false) {
        console.log(`[n8n-enrichment] exec=${executionId} not finished yet — retry ${attempt + 1}/${POLL_DELAYS_MS.length}`)
        continue
      }

      const { tokens_prompt, tokens_completion, model_name } = extractTokenUsage(data)
      console.log(`[n8n-enrichment] exec=${executionId} extracted: tokens_prompt=${tokens_prompt} tokens_completion=${tokens_completion} model=${model_name}`)
      return {
        tokens_prompt,
        tokens_completion,
        model_name,
        duration_ms:
          typeof data.stoppedAt === 'string' && typeof data.startedAt === 'string'
            ? new Date(data.stoppedAt).getTime() - new Date(data.startedAt).getTime()
            : null,
      }
    } catch (error) {
      console.warn(`[n8n-enrichment] Failed to fetch execution ${executionId} (attempt ${attempt + 1}):`, error)
      if (attempt === POLL_DELAYS_MS.length) return null
    }
  }

  console.warn(`[n8n-enrichment] exec=${executionId} did not finish within polling window`)
  return null
}

/**
 * Extract token usage from N8N execution data.
 *
 * N8N AI/LLM sub-nodes store tokenUsage directly on item.json inside
 * the "ai_languageModel" output channel (not "main"). The model name
 * lives in inputOverride.ai_languageModel[*][*].json.options.model.
 */
function extractTokenUsage(data: Record<string, unknown>): {
  tokens_prompt: number
  tokens_completion: number
  model_name: string | null
} {
  let totalPrompt = 0
  let totalCompletion = 0
  let modelName: string | null = null

  try {
    const resultData = data.data as Record<string, unknown> | undefined
    const runData = resultData?.resultData as Record<string, unknown> | undefined
    const nodeResults = runData?.runData as Record<string, unknown[]> | undefined

    if (!nodeResults) {
      console.log(`[n8n-enrichment] runData vacío o estructura inesperada. Keys en data: ${Object.keys(data).join(', ')}`)
      return { tokens_prompt: 0, tokens_completion: 0, model_name: null }
    }
    console.log(`[n8n-enrichment] nodeResults keys: ${Object.keys(nodeResults).join(', ')}`)

    for (const nodeRuns of Object.values(nodeResults)) {
      if (!Array.isArray(nodeRuns)) continue

      for (const run of nodeRuns) {
        const runObj = run as Record<string, unknown>
        const outputData = runObj.data as Record<string, unknown> | undefined
        if (!outputData) continue

        // Search ALL output channels: main, ai_languageModel, ai_memory, etc.
        for (const channelData of Object.values(outputData)) {
          if (!Array.isArray(channelData)) continue

          for (const outputSet of channelData) {
            if (!Array.isArray(outputSet)) continue

            for (const item of outputSet) {
              const itemObj = item as Record<string, unknown>
              const json = itemObj.json as Record<string, unknown> | undefined

              // tokenUsage lives directly on json for ai_languageModel nodes
              const tokenUsage = json?.tokenUsage as Record<string, number> | undefined
              if (tokenUsage) {
                totalPrompt += tokenUsage.promptTokens || tokenUsage.prompt_tokens || 0
                totalCompletion += tokenUsage.completionTokens || tokenUsage.completion_tokens || 0
              }

              // Fallback: some node versions put it in item.metadata
              const meta = itemObj.metadata as Record<string, unknown> | undefined
              const metaTokens = meta?.tokenUsage as Record<string, number> | undefined
              if (metaTokens) {
                totalPrompt += metaTokens.promptTokens || metaTokens.prompt_tokens || 0
                totalCompletion += metaTokens.completionTokens || metaTokens.completion_tokens || 0
              }
            }
          }
        }

        // Extract model from inputOverride.ai_languageModel[0][0].json.options.model
        // Structure: 2 levels of arrays → object with .json.options.model
        if (!modelName) {
          const inputOverride = runObj.inputOverride as Record<string, unknown> | undefined
          const aiLmSets = inputOverride?.ai_languageModel as unknown[] | undefined
          if (Array.isArray(aiLmSets)) {
            for (const set of aiLmSets) {
              if (!Array.isArray(set)) continue
              for (const item of set) {
                const itemObj = item as Record<string, unknown>
                const json = itemObj.json as Record<string, unknown> | undefined
                const options = json?.options as Record<string, unknown> | undefined
                if (typeof options?.model === 'string') {
                  modelName = options.model
                }
              }
            }
          }
        }
      }
    }
  } catch {
    // Silently handle parsing errors — enrichment is best-effort
  }

  return { tokens_prompt: totalPrompt, tokens_completion: totalCompletion, model_name: modelName }
}
