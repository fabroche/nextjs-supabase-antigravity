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

function getMediaLabel(message: Record<string, unknown>): string | null {
  if (message.photo) return '📷 Foto'
  if (message.video) return '🎬 Video'
  if (message.animation) return '🎞️ GIF'
  if (message.document) return '📄 Documento'
  if (message.audio) return '🎵 Audio'
  if (message.voice) return '🎤 Nota de voz'
  if (message.video_note) return '🎥 Video nota'
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

    // Future sources — add normalizers here
    // case 'dokploy': return normalizeDokploy(data)
    // case 'notion': return normalizeNotion(data)
    // case 'n8n': return normalizeN8N(data)

    default:
      return null
  }
}
