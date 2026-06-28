import { NextRequest, NextResponse } from 'next/server'
import { validateWebhook } from '../_lib/validators'
import { normalizeEvent } from '../_lib/normalizers'
import type { NormalizedEvent } from '../_lib/types'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { fetchN8NExecutionDetail } from '@/lib/n8n/enrichment'
import { calculateCost } from '@/lib/n8n/cost-calculator'

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

    // N8N has its own dedicated pipeline — process execution data first
    if (source === 'n8n') {
      await processN8NExecution(event, payload as Record<string, unknown>)
    }

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
        business_id: event.business_id ?? null,
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

// ============================================================
// N8N Execution Pipeline
// Looks up instance/workflow, inserts execution, enriches async
// ============================================================

async function processN8NExecution(
  event: NormalizedEvent,
  payload: Record<string, unknown>
) {
  const supabase = getSupabaseAdmin()

  // 1. Extract instance_id from the normalized metadata
  const rawInstanceId = (event.metadata?.instance_id as string) || ''
  if (!rawInstanceId) {
    console.warn('[n8n-pipeline] No instance_id in payload — skipping execution tracking')
    return
  }

  // 2. Lookup n8n_instances by external instance_id
  const { data: instance } = await supabase
    .from('n8n_instances')
    .select('id, business_id, api_base_url, api_key')
    .eq('instance_id', rawInstanceId)
    .single()

  if (!instance) {
    console.warn(`[n8n-pipeline] Instance "${rawInstanceId}" not registered — skipping execution tracking. Register it in n8n_instances first.`)
    return
  }

  // 3. Set business_id on the event for activity_feed insertion
  event.business_id = instance.business_id

  // 4. Upsert workflow (auto-create on first webhook)
  const rawWorkflowId = (event.metadata?.workflow_id as string) || ''
  const workflowName = (event.metadata?.workflow_name as string) || 'Workflow'

  if (!rawWorkflowId) {
    console.warn('[n8n-pipeline] No workflow_id in payload — skipping execution tracking')
    return
  }

  const { data: workflow } = await supabase
    .from('n8n_workflows')
    .upsert(
      {
        instance_id: instance.id,
        workflow_id: rawWorkflowId,
        name: workflowName,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'instance_id,workflow_id' }
    )
    .select('id')
    .single()

  if (!workflow) {
    console.warn('[n8n-pipeline] Failed to upsert workflow')
    return
  }

  // 5. Extract execution data from payload/metadata
  const rawExecutionId = (event.metadata?.execution_id as string) || ''
  const rawStatus = (event.metadata?.status as string) || 'success'
  const eventType = (event.metadata?.event_type as string) || null
  // Defensa extra: aunque normalizeN8N ya coerciona, garantizamos números aquí también
  const tokensPrompt = Number(event.metadata?.tokens_prompt) || 0
  const tokensCompletion = Number(event.metadata?.tokens_completion) || 0
  const costUsd = Number(event.metadata?.cost_usd) || 0
  const durationMs = Number(event.metadata?.duration_ms) || null
  const errorMessage = (event.metadata?.error_message as string) || null
  const errorNode = (event.metadata?.error_node as string) || null
  const modelName = (payload.model_name as string) || null

  // Map status
  const statusMap: Record<string, string> = {
    success: 'success',
    error: 'error',
    failed: 'error',
    warning: 'warning',
    running: 'running',
  }
  const status = statusMap[rawStatus] || 'success'

  // 6. Insert execution (ON CONFLICT = skip duplicate)
  const { data: execution, error: execError } = await supabase
    .from('n8n_executions')
    .insert({
      instance_id: instance.id,
      workflow_id: workflow.id,
      execution_id: rawExecutionId || `gen-${Date.now()}`,
      status,
      event_type: eventType,
      tokens_prompt: tokensPrompt,
      tokens_completion: tokensCompletion,
      model_name: modelName,
      cost_usd: costUsd || await calculateCost(modelName, tokensPrompt, tokensCompletion),
      duration_ms: durationMs,
      error_message: errorMessage,
      error_node: errorNode,
      is_enriched: false,
      metadata: (payload.custom as Record<string, unknown>) || {},
    })
    .select('id, cost_usd')
    .single()

  if (execError) {
    // UNIQUE constraint violation = duplicate execution, skip silently
    if (execError.code === '23505') return
    console.warn('[n8n-pipeline] Failed to insert execution:', execError.message)
    return
  }

  // 6b. Update event description with calculated cost (so activity_feed shows real cost)
  if (execution?.cost_usd && Number(execution.cost_usd) > 0) {
    const totalTokens = tokensPrompt + tokensCompletion
    const realCost = Number(execution.cost_usd)
    // Replace the token/cost portion in description
    event.description = event.description.replace(
      /\(\d[\d,]* tokens, \$[\d.]+\)/,
      `(${totalTokens.toLocaleString()} tokens, $${realCost.toFixed(4)})`
    )
  }

  // 7. Async enrichment (non-blocking) — only if instance has API credentials
  // AND this is a success execution (errors have no tokens to fetch).
  // Marks the event as pending so the dashboard renders a skeleton until
  // enrichment finishes; the flag is cleared in enrichExecution's finally.
  if (instance.api_base_url && instance.api_key && rawExecutionId && execution && status === 'success') {
    event.metadata = { ...(event.metadata ?? {}), enrichment_pending: true }
    enrichExecution(
      instance.api_base_url,
      instance.api_key,
      rawExecutionId,
      execution.id
    ).catch((err) => console.warn('[n8n-enrichment] Background error:', err))
  }
}

/**
 * Background enrichment: fetch full execution data from N8N API,
 * update the execution row with tokens/model/cost, and clear the
 * enrichment_pending flag on the corresponding activity_feed row
 * (always — even on failure — so the frontend skeleton disappears).
 */
async function enrichExecution(
  apiBaseUrl: string,
  apiKey: string,
  n8nExecutionId: string,
  dbExecutionId: string
) {
  let totalTokens = 0
  let finalCost = 0

  try {
    const detail = await fetchN8NExecutionDetail(apiBaseUrl, apiKey, n8nExecutionId)
    if (detail && (detail.tokens_prompt > 0 || detail.tokens_completion > 0 || detail.model_name)) {
      finalCost = await calculateCost(detail.model_name, detail.tokens_prompt, detail.tokens_completion)
      totalTokens = detail.tokens_prompt + detail.tokens_completion

      await getSupabaseAdmin()
        .from('n8n_executions')
        .update({
          tokens_prompt: detail.tokens_prompt,
          tokens_completion: detail.tokens_completion,
          model_name: detail.model_name,
          cost_usd: finalCost,
          duration_ms: detail.duration_ms,
          is_enriched: true,
        })
        .eq('id', dbExecutionId)
    }
  } catch (err) {
    console.warn('[n8n-enrichment] fetch/update failed:', err)
  } finally {
    // Always clear the pending flag — even on failure — so the frontend
    // skeleton goes away. The UPDATE propagates via Realtime (requires
    // REPLICA IDENTITY FULL on activity_feed, see migration 009).
    await clearActivityFeedPending(n8nExecutionId, totalTokens, finalCost).catch((err) =>
      console.warn('[n8n-enrichment] failed to clear pending flag:', err)
    )
  }
}

/**
 * Locate the activity_feed row matching the n8n execution and:
 *   - append the cost suffix to the description (if we have tokens/cost)
 *   - set metadata.enrichment_pending = false
 * Both updates happen in a single UPDATE to minimise Realtime churn.
 */
async function clearActivityFeedPending(
  n8nExecutionId: string,
  totalTokens: number,
  cost: number
) {
  const supabase = getSupabaseAdmin()
  const { data: feedRow } = await supabase
    .from('activity_feed')
    .select('id, description, metadata')
    .eq('source', 'n8n')
    .eq('metadata->>execution_id', n8nExecutionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!feedRow) return

  let newDescription = feedRow.description
  if (totalTokens > 0 && cost > 0) {
    const costSuffix = ` (${totalTokens.toLocaleString()} tokens, $${cost.toFixed(4)})`
    const hasSuffix = /\(\d[\d,]* tokens, \$[\d.]+\)/.test(feedRow.description)
    newDescription = hasSuffix
      ? feedRow.description.replace(/\(\d[\d,]* tokens, \$[\d.]+\)/, costSuffix.trim())
      : feedRow.description + costSuffix
  }

  const newMetadata = {
    ...(feedRow.metadata as Record<string, unknown> | null ?? {}),
    enrichment_pending: false,
  }

  await supabase
    .from('activity_feed')
    .update({ description: newDescription, metadata: newMetadata })
    .eq('id', feedRow.id)
}
