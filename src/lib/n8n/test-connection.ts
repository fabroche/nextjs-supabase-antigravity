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
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)

  try {
    const url = `${apiBaseUrl.replace(/\/$/, '')}/api/v1/workflows?limit=1`

    console.log(url)
    console.log("API KEY:", apiKey)
    const res = await fetch(url, {
      headers: { 'X-N8N-API-KEY': apiKey, 'Accept': 'application/json'},
      signal: controller.signal,
    })
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` }
    }
    const json = await res.json()
    return { ok: true, workflowCount: json?.data?.length ?? 0 }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Timeout — la instancia no respondió en 8s' }
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Error de conexión',
    }
  } finally {
    clearTimeout(timer)
  }
}
