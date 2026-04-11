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
    const url = `${apiBaseUrl.replace(/\/$/, '')}/api/v1/executions/${executionId}`
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

    // N8N execution response structure varies by version
    // Look for token usage in the execution data nodes
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
 * Searches through node execution results for AI/LLM nodes that report tokenUsage.
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

    // Iterate through all nodes looking for tokenUsage
    for (const nodeRuns of Object.values(nodeResults)) {
      if (!Array.isArray(nodeRuns)) continue
      for (const run of nodeRuns) {
        const runObj = run as Record<string, unknown>
        const outputData = runObj.data as Record<string, unknown> | undefined
        const main = outputData?.main as unknown[][] | undefined

        if (!Array.isArray(main)) continue

        for (const outputSet of main) {
          if (!Array.isArray(outputSet)) continue
          for (const item of outputSet) {
            const itemObj = item as Record<string, unknown>
            const meta = itemObj.metadata as Record<string, unknown> | undefined
            const tokenUsage = meta?.tokenUsage as Record<string, number> | undefined

            if (tokenUsage) {
              totalPrompt += tokenUsage.promptTokens || tokenUsage.prompt_tokens || 0
              totalCompletion += tokenUsage.completionTokens || tokenUsage.completion_tokens || 0
            }

            // Extract model name from the first AI node found
            if (!modelName) {
              const model = meta?.model as string | undefined
              if (model) modelName = model
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
