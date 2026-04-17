"use server"

export interface ConnectionTestResult {
  ok: boolean
  error?: string
  workflowCount?: number
}

export async function testN8NConnection(
  apiBaseUrl: string,
  apiKey: string
): Promise<ConnectionTestResult> {
  try {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/api/v1/workflows?limit=1`
    const res = await fetch(url, {
      headers: { 'X-N8N-API-KEY': apiKey },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` }
    }
    const json = await res.json()
    return { ok: true, workflowCount: json?.data?.length ?? 0 }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error de conexión',
    }
  }
}
