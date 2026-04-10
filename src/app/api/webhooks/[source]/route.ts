import { NextRequest, NextResponse } from 'next/server'
import { validateWebhook } from '../_lib/validators'
import { normalizeEvent } from '../_lib/normalizers'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params
  const body = await req.text()
  const headers = Object.fromEntries(req.headers)

  const isValid = await validateWebhook(source, body, headers)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Parse body: JSON if possible, otherwise ntfy-style (plain text + headers)
  let payload: unknown
  try {
    payload = JSON.parse(body)
  } catch {
    payload = {
      message: body,
      title: headers['x-title'] || '',
      priority: headers['x-priority'] || '3',
      tags: headers['x-tags'] || '',
    }
  }

  // Fire-and-forget: respond 200 before processing
  processWebhook(source, payload, headers).catch(console.error)

  return NextResponse.json({ ok: true })
}

async function processWebhook(
  source: string,
  payload: unknown,
  headers: Record<string, string>
) {
  try {
    const event = await normalizeEvent(source, payload)
    if (!event) return

    const { error: feedError } = await getSupabaseAdmin()
      .from('activity_feed')
      .insert({
        source: event.source,
        event_type: event.event_type,
        actor: event.actor,
        action: event.action,
        description: event.description,
        channel: event.channel ?? null,
        severity: event.severity ?? null,
        metadata: event.metadata ?? {},
      })
    if (feedError) throw feedError

    if (event.target_user_id) {
      const { error: notifError } = await getSupabaseAdmin()
        .from('notifications')
        .insert({
          user_id: event.target_user_id,
          source: event.source,
          event_type: event.event_type,
          actor: event.actor,
          action: event.action,
          description: event.description,
          channel: event.channel ?? null,
          metadata: event.metadata ?? {},
        })
      if (notifError) throw notifError
    }
  } catch (error) {
    await getSupabaseAdmin().from('webhook_dead_letters').insert({
      source,
      payload,
      error: (error as Error).message,
      headers,
    })
  }
}
