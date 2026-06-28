import { getSupabaseAdmin } from '@/lib/supabase/admin'
import type { NormalizedEvent, EventSeverity } from './types'

// ── N8N Payload Schema ──────────────────────────────────────────────────
// Configure in N8N HTTP Request node body (JSON):
// {
//   "instance_id":        "prod-1",
//   "instance_name":      "Production",
//   "workflow_id":        "{{ $workflow.id }}",
//   "workflow_name":      "{{ $workflow.name }}",
//   "execution_id":       "{{ $execution.id }}",
//   "status":             "success",            // success | error | warning
//   "event_type":         "cita_confirmada",    // business-level event
//   "tokens_prompt":      {{ $json.usage.prompt_tokens ?? 0 }},
//   "tokens_completion":  {{ $json.usage.completion_tokens ?? 0 }},
//   "cost_usd":           0.015,
//   "is_out_of_hours":    true,
//   "chat_id":            "{{ $json.message.chat.id }}",
//   "duration_ms":        {{ $execution.duration ?? 0 }},
//   "error_message":      null,
//   "custom":             {}                    // any extra business data
// }
// Headers: x-n8n-webhook-secret: <your-secret>

// Resolve a Telegram user ID to a Supabase user ID via user_profiles.telegram_id
async function resolveTelegramUser(telegramId: number): Promise<string | null> {
  const { data } = await getSupabaseAdmin()
    .from('user_profiles')
    .select('id')
    .eq('telegram_id', String(telegramId))
    .single()
  return data?.id ?? null
}

function getMediaLabel(message: Record<string, unknown>): string | null {
  if (message.photo) return '📷 Foto'
  if (message.video) return '🎬 Video'
  if (message.animation) return '🎞️ GIF'
  if (message.document) return '📄 Documento'
  if (message.audio) return '🎵 Audio'
  if (message.voice) return '🎤 Nota de voz'
  if (message.video_note) return '🎥 Video nota'
  if (message.video_chat_started) return '📹 Videollamada iniciada'
  if (message.video_chat_ended) return '📹 Videollamada finalizada'
  if (message.video_chat_participants_invited) return '📹 Participantes invitados a videollamada'
  if (message.sticker) {
    const sticker = message.sticker as Record<string, unknown>
    return `🏷️ Sticker${sticker.emoji ? ` ${sticker.emoji}` : ''}`
  }
  return null
}

function normalizeTelegram(payload: Record<string, unknown>): NormalizedEvent | null {
  const message = payload.message as Record<string, unknown> | undefined
  if (!message) return null

  const from = message.from as Record<string, unknown> | undefined
  const chat = message.chat as Record<string, unknown> | undefined
  const actor = from
    ? `${from.first_name || ''}${from.last_name ? ' ' + from.last_name : ''}`.trim()
    : 'Unknown'
  const chatTitle = (chat?.title as string) || 'DM'

  // Detect forum topic (reply_to_message with forum_topic_created is the topic root, NOT a real reply)
  const replyTo = message.reply_to_message as Record<string, unknown> | undefined
  const topicCreated = replyTo?.forum_topic_created as Record<string, unknown> | undefined
  const topicName = (topicCreated?.name as string) || null
  const isReply = !!replyTo && !topicCreated

  // Build location string: "Genzai" or "Genzai > Pruebas Bot"
  const location = topicName ? `${chatTitle} > ${topicName}` : chatTitle

  // Content: text, caption (for media with text), or media label
  const text = (message.text as string) || (message.caption as string) || ''
  const mediaLabel = getMediaLabel(message)
  let content: string
  if (mediaLabel && text) {
    content = `${mediaLabel} — "${text.slice(0, 100)}"`
  } else if (mediaLabel) {
    content = mediaLabel
  } else {
    content = `"${text.slice(0, 120)}"`
  }

  return {
    source: 'telegram',
    event_type: isReply ? 'message.reply' : 'message.new',
    actor,
    action: isReply ? 'respondió' : 'envió mensaje',
    description: isReply
      ? `${actor} respondió en ${location}: ${content}`
      : `${actor} en ${location}: ${content}`,
    channel: topicName ? `${chatTitle} > ${topicName}` : chatTitle,
    metadata: {
      telegram_message_id: message.message_id,
      telegram_chat_id: chat?.id,
      telegram_from_id: from?.id,
      ...(topicName && { telegram_topic: topicName }),
    },
  }
}

// Dokploy uses ntfy protocol: plain text body + metadata in x-* headers
function normalizeDokploy(payload: Record<string, unknown>): NormalizedEvent | null {
  const message = ((payload.message as string) || '').trim()
  const title = ((payload.title as string) || '').trim()
  const priority = parseInt((payload.priority as string) || '3', 10)
  const tags = (payload.tags as string) || ''

  if (!message && !title) return null

  // Determine severity from title, message keywords, and ntfy priority
  const text = `${title} ${message} ${tags}`.toLowerCase()
  let severity: EventSeverity | null = null

  if (text.includes('fail') || text.includes('error') || text.includes('crash') || priority >= 5) {
    severity = 'error'
  } else if (text.includes('warn') || text.includes('timeout') || text.includes('slow') || priority === 4) {
    severity = 'warning'
  } else if (text.includes('success') || text.includes('running') || text.includes('deployed') || text.includes('completed')) {
    severity = 'success'
  }

  const description = title && message
    ? `🚀 ${title} — ${message.slice(0, 120)}`
    : `🚀 ${title || message.slice(0, 140)}`

  return {
    source: 'dokploy',
    event_type: severity ? `deploy.${severity}` : 'deploy.info',
    actor: 'Dokploy',
    action: title || 'notificación',
    description,
    severity,
    metadata: { priority, tags: tags || undefined },
  }
}

// Detect if payload comes from N8N Error Trigger (nested execution/workflow structure)
function isErrorTriggerPayload(payload: Record<string, unknown>): boolean {
  return !!(payload.execution && payload.workflow)
}

// Parse N8N Error Trigger payload into the flat format normalizeN8N expects
function parseErrorTrigger(payload: Record<string, unknown>): Record<string, unknown> {
  const execution = payload.execution as Record<string, unknown>
  const workflow = payload.workflow as Record<string, unknown>
  const error = execution.error as Record<string, unknown> | undefined
  const errorNode = error?.node as Record<string, unknown> | undefined

  return {
    instance_id: (payload.instance_id as string) || '',
    instance_name: (payload.instance_name as string) || '',
    workflow_id: workflow.id,
    workflow_name: workflow.name,
    execution_id: execution.id,
    execution_url: execution.url,
    status: 'error',
    event_type: 'workflow_error',
    error_message: (error?.message as string) || '',
    error_node: (errorNode?.name as string) || (execution.lastNodeExecuted as string) || '',
    error_type: (error?.name as string) || '',
    error_http_code: (error?.httpCode as string) || '',
    tokens_prompt: 0,
    tokens_completion: 0,
    cost_usd: 0,
  }
}

function normalizeN8N(payload: Record<string, unknown>): NormalizedEvent | null {
  // Auto-detect Error Trigger format vs regular execution payload
  const data = isErrorTriggerPayload(payload) ? parseErrorTrigger(payload) : payload

  const workflowName = (data.workflow_name as string) || 'Workflow'
  const workflowId = (data.workflow_id as string) || ''
  const executionId = (data.execution_id as string) || ''
  const instanceName = (data.instance_name as string) || (data.instance_id as string) || 'N8N'
  const instanceId = (data.instance_id as string) || ''
  const rawStatus = ((data.status as string) || 'success').toLowerCase()
  const eventType = (data.event_type as string) || ''
  const errorMessage = (data.error_message as string) || ''
  const errorNode = (data.error_node as string) || ''
  const errorHttpCode = (data.error_http_code as string) || ''

  // Map status to severity
  let severity: EventSeverity | null = null
  if (rawStatus === 'error' || rawStatus === 'failed') {
    severity = 'error'
  } else if (rawStatus === 'warning') {
    severity = 'warning'
  } else if (rawStatus === 'success') {
    severity = 'success'
  }

  // Map status to Spanish action verb
  const actionMap: Record<string, string> = {
    success: 'ejecutó correctamente',
    error: 'falló',
    failed: 'falló',
    warning: 'ejecutó con advertencias',
  }
  const action = actionMap[rawStatus] || 'ejecutó'

  // Build description
  // N8N (Metric Logger) envía los campos numéricos como strings ("2810", "0.001174").
  // Coercionar con Number() — un cast de TS no convierte en runtime y rompe .toFixed().
  const tokensPrompt = Number(data.tokens_prompt) || 0
  const tokensCompletion = Number(data.tokens_completion) || 0
  const costUsd = Number(data.cost_usd) || 0
  const totalTokens = tokensPrompt + tokensCompletion

  let description = `⚡ ${workflowName} ${action}`
  if (errorNode) {
    description += ` en ${errorNode}`
  }
  if (errorHttpCode) {
    description += ` (${errorHttpCode})`
  }
  if (severity === 'error') {
    // Use errorMessage only — errorDescription may contain leaked credentials
    if (errorMessage) {
      description += ` — ${errorMessage.slice(0, 120)}`
    }
  } else {
    if (eventType) {
      description += ` — ${eventType.replace(/_/g, ' ')}`
    }
    if (totalTokens > 0) {
      description += ` (${totalTokens.toLocaleString()} tokens, $${costUsd.toFixed(3)})`
    }
  }

  return {
    source: 'n8n',
    event_type: severity === 'error'
      ? 'workflow.error'
      : eventType
        ? `workflow.${eventType.toLowerCase()}`
        : 'workflow.execution',
    actor: workflowName,
    action,
    description,
    channel: instanceName,
    severity,
    metadata: {
      instance_id: instanceId || undefined,
      instance_name: instanceName,
      workflow_id: workflowId || undefined,
      workflow_name: workflowName,
      execution_id: executionId || undefined,
      execution_url: (data.execution_url as string) || undefined,
      status: rawStatus,
      event_type: eventType || undefined,
      error_node: errorNode || undefined,
      error_type: (data.error_type as string) || undefined,
      error_http_code: errorHttpCode || undefined,
      error_message: errorMessage || undefined,
      tokens_prompt: tokensPrompt || undefined,
      tokens_completion: tokensCompletion || undefined,
      cost_usd: costUsd || undefined,
      is_out_of_hours:
        data.is_out_of_hours === undefined || data.is_out_of_hours === null
          ? undefined
          : String(data.is_out_of_hours).toLowerCase() === 'true',
      chat_id: (data.chat_id as string) || undefined,
      duration_ms: Number(data.duration_ms) || undefined,
      custom: (data.custom as Record<string, unknown>) || undefined,
    },
  }
}

export async function normalizeEvent(
  source: string,
  payload: unknown
): Promise<NormalizedEvent | null> {
  const data = payload as Record<string, unknown>

  switch (source) {
    case 'telegram': {
      const event = normalizeTelegram(data)
      if (!event) return null

      // Try to resolve target user for notifications (only real replies, not topic root messages)
      const message = data.message as Record<string, unknown> | undefined
      const replyTo = message?.reply_to_message as Record<string, unknown> | undefined
      const isTopicRoot = !!(replyTo?.forum_topic_created)
      if (replyTo && !isTopicRoot) {
        const replyFrom = replyTo.from as Record<string, unknown> | undefined
        if (replyFrom?.id) {
          event.target_user_id = await resolveTelegramUser(replyFrom.id as number)
        }
      }

      return event
    }

    case 'dokploy':
      return normalizeDokploy(data)

    case 'n8n':
      return normalizeN8N(data)

    // Future sources — add normalizers here
    // case 'notion': return normalizeNotion(data)

    default:
      return null
  }
}
