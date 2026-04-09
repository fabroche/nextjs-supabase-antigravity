import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { NormalizedEvent } from './types'

// Resolve a Telegram user ID to a Supabase user ID via user_profiles.telegram_id
async function resolveTelegramUser(telegramId: number): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from('user_profiles')
    .select('id')
    .eq('telegram_id', String(telegramId))
    .single()
  return data?.id ?? null
}

function normalizeTelegram(payload: Record<string, unknown>): NormalizedEvent | null {
  const message = payload.message as Record<string, unknown> | undefined
  if (!message) return null

  const from = message.from as Record<string, unknown> | undefined
  const chat = message.chat as Record<string, unknown> | undefined
  const text = (message.text as string) || ''
  const actor = from
    ? `${from.first_name || ''}${from.last_name ? ' ' + from.last_name : ''}`.trim()
    : 'Unknown'
  const chatTitle = (chat?.title as string) || 'DM'

  // Detect if this is a reply to someone
  const replyTo = message.reply_to_message as Record<string, unknown> | undefined
  const isReply = !!replyTo

  return {
    source: 'telegram',
    event_type: isReply ? 'message.reply' : 'message.new',
    actor,
    action: isReply ? 'respondió' : 'envió mensaje',
    description: isReply
      ? `${actor} respondió en ${chatTitle}: "${text.slice(0, 120)}"`
      : `${actor} en ${chatTitle}: "${text.slice(0, 120)}"`,
    channel: chatTitle,
    metadata: {
      telegram_message_id: message.message_id,
      telegram_chat_id: chat?.id,
      telegram_from_id: from?.id,
    },
  }
}

// ─── N8N ────────────────────────────────────────────────────────────────────
//
// Contrato de payload esperado desde el nodo "HTTP Request" de N8N:
//
//   {
//     "event_type":     "workflow.success" | "workflow.error" | "workflow.started" | string,
//     "workflow_name":  "Nombre del workflow",          // recomendado
//     "description":    "Texto legible para el feed",   // opcional — se autogenera si falta
//     "channel":        "ventas" | "deploy" | "sync",   // categoría libre
//     "error_message":  "...",   // solo en workflow.error
//     "error_node":     "...",   // nodo donde falló
//     "execution_id":   "...",   // ID de ejecución de N8N
//     "duration_ms":    1500,    // tiempo de ejecución
//     "items_processed": 10,     // items procesados
//     "metadata":       { ... }  // cualquier dato extra
//   }
//
// Extensible: cualquier event_type personalizado es válido.
// Los event_types conocidos reciben labels y acciones predefinidas.

type N8NEventType =
  | 'workflow.success'
  | 'workflow.error'
  | 'workflow.started'
  | 'metric.update'
  | 'alert.threshold'
  | 'data.sync'
  | string

interface N8NPayload {
  event_type?: N8NEventType
  workflow_name?: string
  description?: string
  channel?: string
  error_message?: string
  error_node?: string
  execution_id?: string
  duration_ms?: number
  items_processed?: number
  metadata?: Record<string, unknown>
}

const N8N_EVENT_LABELS: Record<string, { action: string; fallback_description: (wf: string) => string }> = {
  'workflow.success':  { action: 'completó',         fallback_description: (wf) => `Workflow "${wf}" completado exitosamente` },
  'workflow.error':    { action: 'falló',             fallback_description: (wf) => `Workflow "${wf}" terminó con error` },
  'workflow.started':  { action: 'inició',            fallback_description: (wf) => `Workflow "${wf}" inició ejecución` },
  'metric.update':     { action: 'actualizó métrica', fallback_description: (wf) => `Métrica actualizada por "${wf}"` },
  'alert.threshold':   { action: 'activó alerta',     fallback_description: (wf) => `Alerta de umbral disparada por "${wf}"` },
  'data.sync':         { action: 'sincronizó datos',  fallback_description: (wf) => `Sincronización de datos completada por "${wf}"` },
}

function normalizeN8N(payload: Record<string, unknown>): NormalizedEvent | null {
  const p = payload as N8NPayload
  const eventType = p.event_type || 'workflow.success'
  const workflowName = p.workflow_name || 'Workflow desconocido'

  const label = N8N_EVENT_LABELS[eventType] ?? {
    action: 'ejecutó',
    fallback_description: (wf: string) => `${wf}: ${eventType}`,
  }

  // Description: use provided or autogenerate. Append error info if present.
  let description = p.description || label.fallback_description(workflowName)
  if (eventType === 'workflow.error' && p.error_message) {
    description += ` — ${p.error_message}${p.error_node ? ` (nodo: ${p.error_node})` : ''}`
  }

  // Build metadata — merge execution context with any extra data provided
  const metadata: Record<string, unknown> = { ...(p.metadata ?? {}) }
  if (p.execution_id)    metadata.execution_id    = p.execution_id
  if (p.duration_ms)     metadata.duration_ms     = p.duration_ms
  if (p.items_processed) metadata.items_processed = p.items_processed
  if (p.error_node)      metadata.error_node      = p.error_node

  return {
    source: 'n8n',
    event_type: eventType,
    actor: 'N8N',
    action: label.action,
    description,
    channel: p.channel ?? workflowName,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  }
}

// ────────────────────────────────────────────────────────────────────────────

export async function normalizeEvent(
  source: string,
  payload: unknown
): Promise<NormalizedEvent | null> {
  const data = payload as Record<string, unknown>

  switch (source) {
    case 'telegram': {
      const event = normalizeTelegram(data)
      if (!event) return null

      // Try to resolve target user for notifications (reply recipient)
      const message = data.message as Record<string, unknown> | undefined
      const replyTo = message?.reply_to_message as Record<string, unknown> | undefined
      if (replyTo) {
        const replyFrom = replyTo.from as Record<string, unknown> | undefined
        if (replyFrom?.id) {
          event.target_user_id = await resolveTelegramUser(replyFrom.id as number)
        }
      }

      return event
    }

    // Future sources — add normalizers here
    // case 'dokploy': return normalizeDokploy(data)
    // case 'notion': return normalizeNotion(data)

    case 'n8n':
      return normalizeN8N(data)

    default:
      return null
  }
}
