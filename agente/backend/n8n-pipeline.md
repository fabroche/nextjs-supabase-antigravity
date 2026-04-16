# N8N Pipeline — Enrichment y Cost Tracking

## Flujo Completo

```
POST /api/webhooks/n8n
  → validateWebhook() — compara x-n8n-webhook-secret con webhook_sources tabla
  → normalizeN8N() — construye NormalizedEvent con instance_id, workflow_id, execution_id, status
  → processN8NExecution()
      1. Lookup n8n_instances por instance_id → obtiene business_id, api_base_url, api_key
      2. Upsert n8n_workflows (auto-crea en primer webhook del workflow)
      3. Insert n8n_executions con ON CONFLICT (instance_id, execution_id) DO NOTHING
      4. event.business_id = instance.business_id (para activity_feed RLS)
      5. Si api_key && api_base_url && status==='success':
           event.metadata.enrichment_pending = true
           enrichExecution(...) [fire-and-forget, .catch(console.warn)]
  → insert activity_feed (incluye enrichment_pending=true si aplica)
  → return 200 (ya respondido al inicio del webhook — fire-and-forget)
```

## enrichExecution() — Background

```
fetchN8NExecutionDetail(apiBaseUrl, apiKey, executionId)
  → GET ${apiBaseUrl}/api/v1/executions/${id}?includeData=true
  → ⚠️ N8N dispara webhook MID-EXECUTION (antes que los AI nodes terminen)
  → POLLING: si data.finished === false → esperar 4s → reintentar
  → Máx 5 reintentos (POLL_DELAYS_MS = [4000, 4000, 4000, 4000, 4000])
  → Ventana total: ~60s

extractTokenUsage(data)
  → Ruta tokens: data.data.resultData.runData[nodeName][0].data.ai_languageModel[0][0].json.tokenUsage
  → tokenUsage = { completionTokens, promptTokens, totalTokens }
  → Ruta modelo: runData[nodeName][0].inputOverride.ai_languageModel[0][0].json.options.model
  → ⚠️ Son 2 niveles de array [0][0], NO 3. Loop extra rompe la extracción.

calculateCost(modelName, tokensPrompt, tokensCompletion)
  → Lee model_pricing tabla (cache in-memory 5min)
  → cost = (tokensPrompt / 1000 * cost_per_1k_prompt) + (tokensCompletion / 1000 * cost_per_1k_completion)

[try block]
  → Si tokens > 0 || model_name:
      UPDATE n8n_executions SET tokens_prompt, tokens_completion, model_name, cost_usd, is_enriched=true

[finally block — SIEMPRE ejecuta, con o sin error]
  → clearActivityFeedPending(n8nExecutionId, totalTokens, cost)
      → SELECT activity_feed WHERE source='n8n' AND metadata->>'execution_id' = n8nExecutionId
      → Si tokens > 0: append " (X tokens, $Y.YYYY)" a description
      → UPDATE activity_feed SET description=newDesc, metadata.enrichment_pending=false
      → Realtime broadcast UPDATE → frontend merge in-place → skeleton desaparece
```

## Extracción de Tokens — Estructura Real

N8N almacena tokenUsage en el canal `ai_languageModel`, NO en `main`:

```
data (API response)
└── data
    └── resultData
        └── runData
            └── "Modelo OpenAI1" (nombre del nodo)
                └── [0] (primer run)
                    ├── data
                    │   └── ai_languageModel
                    │       └── [0] (outer array)
                    │           └── [0] (inner array) ← item
                    │               └── json
                    │                   └── tokenUsage
                    │                       ├── completionTokens: 20
                    │                       ├── promptTokens: 641
                    │                       └── totalTokens: 661
                    └── inputOverride
                        └── ai_languageModel
                            └── [0][0]
                                └── json
                                    └── options
                                        └── model: "gpt-4.1-mini"
```

## Setup de Instancia (una sola vez por instancia N8N)

```sql
INSERT INTO n8n_instances (business_id, instance_id, name, environment, api_base_url, api_key)
VALUES (
  'UUID-DEL-BUSINESS',
  'genzai-prod',               -- identificador en el payload del webhook
  'Genzai Producción',
  'production',
  'https://n8n.genzai.cloud',
  'N8N-API-KEY'                -- Settings > API en la UI de N8N
);
```

## Cambio Futuro: Tokens en Payload

El equipo N8N está construyendo un Code node que inyectará `tokens_prompt`, `tokens_completion`, `model_name` directamente en el webhook payload.

**Cuando llegue ese cambio**:
1. `normalizeN8N()` ya lee esos campos — sin cambio necesario
2. En `processN8NExecution()`: `if (tokensPrompt > 0)` → usar costo directo, skip enrichment
3. Los workflows legacy siguen por el path de enrichment (fallback automático)
4. Beneficio a escala (500+ msg/min): elimina 1 HTTP call a N8N API + 2 SELECT + 2 UPDATE

## Archivos Clave

| Archivo | Responsabilidad |
|---------|-----------------|
| `src/app/api/webhooks/[source]/route.ts` | `processN8NExecution()`, `enrichExecution()`, `clearActivityFeedPending()` |
| `src/lib/n8n/enrichment.ts` | `fetchN8NExecutionDetail()` con polling |
| `src/lib/n8n/cost-calculator.ts` | `calculateCost()` con cache |
| `src/app/api/webhooks/_lib/normalizers.ts` | `normalizeN8N()` |
