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
    // case 'n8n': return normalizeN8N(data)

    default:
      return null
  }
}
