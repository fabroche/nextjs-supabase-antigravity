import crypto from 'crypto'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function validateWebhook(
  source: string,
  rawBody: string,
  headers: Record<string, string>
): Promise<boolean> {
  const { data } = await getSupabaseAdmin()
    .from('webhook_sources')
    .select('secret')
    .eq('source', source)
    .eq('is_active', true)
    .single()

  if (!data?.secret) return false

  switch (source) {
    case 'telegram':
      return headers['x-telegram-bot-api-secret-token'] === data.secret

    case 'dokploy': {
      // Dokploy uses ntfy protocol — auth via Bearer token
      const authHeader = headers['authorization'] || ''
      const token = authHeader.replace('Bearer ', '')
      return token === data.secret
    }

    case 'notion': {
      const sig = headers['x-notion-signature']
      const expected = crypto.createHmac('sha256', data.secret).update(rawBody).digest('hex')
      try {
        return crypto.timingSafeEqual(Buffer.from(sig || ''), Buffer.from(expected))
      } catch {
        return false
      }
    }

    case 'n8n':
      return headers['x-n8n-webhook-secret'] === data.secret

    default:
      return false
  }
}
