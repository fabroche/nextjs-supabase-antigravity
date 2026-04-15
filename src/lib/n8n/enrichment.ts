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
export async function fetchN8NExecutionDetail(
  apiBaseUrl: string,
  apiKey: string,
  executionId: string
): Promise<N8NExecutionDetail | null> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/api/v1/executions/${executionId}?includeData=true`
    const res = await fetch(url, {
      headers: {
        'X-N8N-API-KEY': apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(10_000), // 10s timeout
    })

    if (!res.ok) {
      console.warn(`[n8n-enrichment] API returned ${res.status} for execution ${executionId}`)
      return null
    }

    const data = await res.json()

    // TEMP DEBUG — remove after diagnosis
    try {
      const d = data as Record<string, unknown> & {
        data?: { resultData?: { runData?: Record<string, unknown[]> } }
      }
      const runData = d.data?.resultData?.runData ?? {}
      for (const [nodeName, runs] of Object.entries(runData)) {
        if (!Array.isArray(runs)) continue
        for (const run of runs) {
          const r = run as Record<string, unknown>
          const channels = r.data ? Object.keys(r.data as object) : []
          console.log(`[n8n-debug] node="${nodeName}" channels=[${channels.join(',')}]`)
          for (const [ch, chData] of Object.entries((r.data ?? {}) as Record<string, unknown>)) {
            if (!Array.isArray(chData)) continue
            for (const set of chData) {
              if (!Array.isArray(set)) continue
              for (const item of set) {
                const it = item as Record<string, unknown>
                const j = it.json as Record<string, unknown> | undefined
                if (j?.tokenUsage) console.log(`[n8n-debug] FOUND tokenUsage in node="${nodeName}" ch="${ch}"`, JSON.stringify(j.tokenUsage))
                const meta = it.metadata as Record<string, unknown> | undefined
                if (meta?.tokenUsage) console.log(`[n8n-debug] FOUND metadata.tokenUsage in node="${nodeName}" ch="${ch}"`, JSON.stringify(meta.tokenUsage))
              }
            }
          }
          if (r.inputOverride) {
            const io = r.inputOverride as Record<string, unknown>
            if (io.ai_languageModel) console.log(`[n8n-debug] node="${nodeName}" has inputOverride.ai_languageModel`)
          }
        }
      }
    } catch { /* ignore debug errors */ }

    const { tokens_prompt, tokens_completion, model_name } = extractTokenUsage(data)

    return {
      tokens_prompt,
      tokens_completion,
      model_name,
      duration_ms: typeof data.stoppedAt === 'string' && typeof data.startedAt === 'string'
        ? new Date(data.stoppedAt).getTime() - new Date(data.startedAt).getTime()
        : null,
    }
  } catch (error) {
    console.warn(`[n8n-enrichment] Failed to fetch execution ${executionId}:`, error)
    return null
  }
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

    if (!nodeResults) return { tokens_prompt: 0, tokens_completion: 0, model_name: null }

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
