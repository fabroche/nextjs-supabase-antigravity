# Manual de Testing — Sección Automatizaciones

> **Versión del documento**: v0.9.0 | **Fecha**: 2026-04-16  
> Guía para verificar que los datos de N8N llegan, se procesan y se muestran correctamente en la UI.

---

## Índice

1. [Arquitectura de datos — cómo fluye la info](#1-arquitectura-de-datos)
2. [Antes de empezar — verificar registro de instancias](#2-antes-de-empezar)
3. [Registrar una nueva instancia N8N](#3-registrar-instancia)
4. [Soporte para múltiples instancias](#4-múltiples-instancias)
5. [Queries de verificación paso a paso](#5-queries-de-verificación)
6. [Diagnóstico: costo y tokens en cero](#6-diagnóstico-costo-cero)
7. [Checklist de prueba rápida de la UI](#7-checklist-ui)
8. [Errores comunes y soluciones](#8-errores-comunes)

---

## 1. Arquitectura de datos

```
N8N dispara webhook
       │
       ▼
POST /api/webhooks/n8n
  ├─ Valida x-n8n-webhook-secret
  ├─ normalizeN8N() → identifica instance_id
  ├─ processN8NExecution()
  │    ├─ Lookup n8n_instances por instance_id (TEXT)
  │    ├─ Upsert n8n_workflows (auto-crea al primer webhook)
  │    └─ Insert n8n_executions (con is_enriched = false)
  └─ Insert activity_feed (con enrichment_pending = true)
       │
       ▼ (background, ~4-20 seg)
  enrichExecution()
  ├─ Polling API N8N cada 4s hasta finished=true
  ├─ Extrae tokens del nodo AI
  ├─ Calcula costo desde model_pricing
  ├─ UPDATE n8n_executions (tokens, costo, is_enriched=true)
  └─ UPDATE activity_feed (description + enrichment_pending=false)
       │
       ▼
  Realtime → UI se actualiza en vivo
```

**Tablas involucradas:**

| Tabla | Qué guarda | Se crea... |
|-------|-----------|-----------|
| `n8n_instances` | Config de la instancia N8N | Manual (INSERT) |
| `n8n_workflows` | Workflows por instancia | Auto (primer webhook) |
| `n8n_executions` | Datos por ejecución (tokens, costo, error) | Auto (cada webhook) |
| `activity_feed` | Feed visible en el dashboard | Auto (cada webhook) |
| `model_pricing` | Precios LLM para calcular costo | Seed en migración 008 |

---

## 2. Antes de empezar

Abre el **SQL Editor** de Supabase (`supabase.genzai.cloud → SQL Editor`) y ejecuta estas tres queries de diagnóstico inicial:

### 2a. ¿Hay instancias registradas?

```sql
SELECT
  id,
  instance_id,
  name,
  environment,
  api_base_url,
  CASE WHEN api_key IS NOT NULL THEN '✓ configurada' ELSE '✗ falta' END AS api_key,
  is_active
FROM n8n_instances
ORDER BY name;
```

**Resultado esperado:** una fila por instancia registrada. Si no hay filas → ver sección 3.

---

### 2b. ¿Están llegando webhooks?

```sql
SELECT
  e.execution_id,
  i.name       AS instancia,
  w.name       AS workflow,
  e.status,
  e.event_type,
  e.tokens_prompt,
  e.tokens_completion,
  e.cost_usd,
  e.is_enriched,
  e.created_at
FROM n8n_executions e
JOIN n8n_instances i ON i.id = e.instance_id
JOIN n8n_workflows w ON w.id = e.workflow_id
ORDER BY e.created_at DESC
LIMIT 10;
```

**Qué significa cada columna:**

| Campo | Valor bueno | Señal de problema |
|-------|-------------|-------------------|
| `status` | `success` | `error` → revisar `error_message` en la fila |
| `is_enriched` | `true` | `false` → ver sección 6 |
| `tokens_prompt` | `> 0` | `0` → enriquecimiento no extrajo tokens |
| `cost_usd` | `> 0` | `0` → sin tokens o modelo sin precio |
| `event_type` | texto del evento | `null` → normalizer no lo extrajo |

---

### 2c. ¿Qué `instance_id` TEXT llega en los webhooks?

Si no sabes qué identificador envía tu N8N, míralo en el activity feed:

```sql
SELECT
  metadata->>'instance_id'   AS instance_id_en_webhook,
  metadata->>'workflow_name' AS workflow,
  metadata->>'execution_id'  AS execution_id,
  created_at
FROM activity_feed
WHERE source = 'n8n'
ORDER BY created_at DESC
LIMIT 5;
```

El valor de `instance_id_en_webhook` (ej. `"genzai-prod"`) es el que debes usar en el campo `instance_id` al registrar la instancia.

---

## 3. Registrar una instancia N8N

### Paso 1 — Obtener el ID del negocio

```sql
SELECT id, name FROM businesses;
```

Copia el `id` (UUID) del negocio al que pertenece la instancia.

### Paso 2 — INSERT de la instancia

```sql
INSERT INTO n8n_instances (
  business_id,
  instance_id,
  name,
  environment,
  api_base_url,
  api_key
)
VALUES (
  'UUID-DEL-NEGOCIO',          -- id copiado del paso anterior
  'genzai-prod',                -- identificador TEXT que N8N envía en el webhook
  'Genzai Producción',          -- nombre visible en la UI
  'production',                 -- production | staging | development
  'https://n8n.genzai.cloud',   -- URL base de N8N (para enriquecimiento)
  'TU-API-KEY-DE-N8N'           -- N8N: Settings > n8n API > Add API Key
);
```

### Paso 3 — Verificar

```sql
SELECT id, instance_id, name, is_active FROM n8n_instances;
```

A partir de este INSERT, el próximo webhook de esa instancia creará automáticamente el workflow y la ejecución.

---

## 4. Múltiples instancias

**Sí, la app soporta múltiples instancias.** El esquema es multi-tenant completo:

```
Un negocio puede tener N instancias
  └─ Cada instancia puede tener N workflows
       └─ Cada workflow tiene N ejecuciones
```

**Ejemplo: registrar una instancia de staging además de la de producción:**

```sql
-- Instancia de producción (ya existe)
-- instance_id = 'genzai-prod'

-- Agregar staging
INSERT INTO n8n_instances (business_id, instance_id, name, environment, api_base_url, api_key)
VALUES (
  'UUID-DEL-NEGOCIO',
  'genzai-staging',
  'Genzai Staging',
  'staging',
  'https://n8n-staging.genzai.cloud',
  'API-KEY-STAGING'
);
```

En la UI, Level 1 (`/automatizaciones`) mostrará ambas como cards separadas con su indicador de entorno (badge "Producción" / "Staging").

**Para múltiples negocios:** cada negocio usa su propio `business_id` y solo ve sus instancias (RLS automático).

---

## 5. Queries de verificación paso a paso

### 5a. Ver métricas como las ve la UI (Level 1)

```sql
SELECT
  name,
  environment,
  total_executions,
  error_rate      || '%' AS error_rate,
  '$' || total_cost      AS costo_30d,
  total_tokens,
  workflow_count,
  last_execution_at
FROM n8n_instance_stats
ORDER BY name;
```

Si los números coinciden con lo que ves en la UI → los datos están bien.

### 5b. Ver workflows de una instancia (Level 2)

```sql
-- Reemplaza el UUID por el id de tu instancia
SELECT
  name,
  total_executions,
  error_rate || '%' AS error_rate,
  '$' || total_cost AS costo_30d,
  last_execution_at
FROM n8n_workflow_stats
WHERE instance_id = 'UUID-DE-LA-INSTANCIA'
ORDER BY name;
```

### 5c. Ver tabla de ejecuciones de un workflow (Level 3)

```sql
-- Reemplaza el UUID por el id del workflow
SELECT
  execution_id,
  status,
  event_type,
  model_name,
  tokens_prompt + tokens_completion AS total_tokens,
  cost_usd,
  duration_ms,
  is_enriched,
  error_message,
  created_at
FROM n8n_executions
WHERE workflow_id = 'UUID-DEL-WORKFLOW'
ORDER BY created_at DESC
LIMIT 20;
```

### 5d. Tendencia de ejecuciones (lo que muestra el gráfico)

```sql
SELECT * FROM get_execution_trend(
  p_instance_id := 'UUID-DE-LA-INSTANCIA',
  p_workflow_id := NULL,
  p_days        := 30
)
ORDER BY day;
```

Si la query devuelve filas con `total_executions > 0` → el gráfico debería mostrar datos.

---

## 6. Diagnóstico: costo y tokens en cero

### Caso A — `is_enriched = false`

El enriquecimiento no corrió o falló. Causas posibles:

```sql
-- Ver si la instancia tiene api_key configurada
SELECT name, api_base_url, api_key IS NOT NULL AS tiene_api_key
FROM n8n_instances;
```

Si `tiene_api_key = false` → el pipeline saltea el enriquecimiento.  
Solución: actualizar la instancia con la API key:

```sql
UPDATE n8n_instances
SET api_key = 'TU-API-KEY', api_base_url = 'https://n8n.tu-dominio.com'
WHERE instance_id = 'tu-instance-id';
```

### Caso B — `is_enriched = true` pero `cost_usd = 0`

El enriquecimiento corrió y obtuvo tokens, pero el modelo no tiene precio en `model_pricing`.

```sql
-- Ver qué modelos llegaron y si tienen precio
SELECT
  e.model_name,
  COUNT(*)                   AS ejecuciones,
  SUM(e.tokens_prompt)       AS tokens_prompt_total,
  mp.cost_per_1k_prompt      AS precio_prompt,
  mp.cost_per_1k_completion  AS precio_completion
FROM n8n_executions e
LEFT JOIN model_pricing mp ON mp.model_name = e.model_name
WHERE e.model_name IS NOT NULL
GROUP BY e.model_name, mp.cost_per_1k_prompt, mp.cost_per_1k_completion;
```

Si `precio_prompt` es NULL → agregar el modelo:

```sql
-- Ejemplo para gpt-4.1-mini (ajustar nombre exacto según lo que llegó)
INSERT INTO model_pricing (model_name, provider, cost_per_1k_prompt, cost_per_1k_completion)
VALUES ('gpt-4.1-mini', 'openai', 0.000400, 0.001600);
```

> El nombre debe coincidir **exactamente** con el `model_name` que llegó en la columna anterior.

### Caso C — `is_enriched = true`, `tokens_prompt = 0`

El enriquecimiento no encontró el nodo AI en `runData`. Causas:
- El workflow no tiene un nodo de modelo AI (ej. solo es un workflow de automatización sin IA)
- El nombre del nodo AI en N8N cambió → no coincide con la ruta de extracción

En ese caso, el costo real es `$0.0000` (sin consumo de LLM), lo cual es correcto.

---

## 7. Checklist de prueba rápida de la UI

```
Prerrequisitos
  □ Hay al menos 1 instancia en n8n_instances
  □ Hay al menos 1 ejecución en n8n_executions

Level 1 — /automatizaciones
  □ Aparece la card de la instancia (nombre + badge de entorno)
  □ El indicador de status es verde (is_active=true y error_rate<5%)
  □ Las 4 metric cards globales muestran números > 0
  □ Click en la card → navega sin "freeze" (skeleton inmediato)

Level 2 — /automatizaciones/[instanceId]
  □ Breadcrumb muestra "Automatizaciones > nombre-instancia"
  □ Las 4 metric cards de instancia muestran datos reales
  □ El gráfico de tendencia muestra barras (aunque sea 1 día)
  □ Aparecen las workflow cards
  □ Click en workflow → navega sin freeze

Level 3 — /automatizaciones/[instanceId]/[workflowId]
  □ Breadcrumb completo con links correctos
  □ Tabla muestra ejecuciones (fecha, estado, evento, modelo, tokens, costo)
  □ Filtrar por estado "Error" → solo muestra errores
  □ Paginación: si hay > 20 ejecuciones, aparecen los botones < >
  □ DateRangePicker: seleccionar rango → tabla se actualiza

Realtime (requiere N8N activo)
  □ Activar N8N → enviar mensaje → aparece en activity feed del dashboard
  □ El costo aparece tras ~5-20 seg (enriquecimiento background)
  □ En /automatizaciones, el contador de ejecuciones sube sin recargar
```

---

## 8. Errores comunes y soluciones

| Síntoma | Causa | Solución |
|---------|-------|---------|
| Card no aparece en Level 1 | No hay fila en `n8n_instances` | Sección 3 — registrar instancia |
| Card aparece pero métricas en 0 | No han llegado webhooks | Verificar con query 2b |
| `instance_id` en webhook no coincide | Nombre incorrecto en `n8n_instances.instance_id` | Query 2c para ver el valor real |
| Costo siempre $0.0000 | Sin `api_key` o modelo sin precio | Sección 6 |
| Workflow card no aparece | Workflow no se auto-creó | Verificar que llegó al menos 1 webhook exitoso |
| Breadcrumb muestra "Instancia" | `fetchInstanceStats()` no encontró el UUID | Verificar que el UUID en la URL corresponde a `n8n_instances.id` |
| Gráfico sin datos | Sin ejecuciones en últimos 30 días | Query 5d para confirmar |
| Tabla de ejecuciones vacía | Filtros activos sin coincidencias | Limpiar filtros (estado = "Todos") |

---

_Documento generado: 2026-04-16 | Proyecto: nextjs-supabase dashboard v0.9.0_
