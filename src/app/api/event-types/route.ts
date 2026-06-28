import { NextRequest, NextResponse } from 'next/server'
import { validateWebhook } from '../webhooks/_lib/validators'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

// GET /api/event-types?instance_id=<n8n-instance>&workflow_id=<n8n-workflow-id>
//
// Catálogo gobernado de event_type para el flujo Metric Logger de N8N (Opción B).
// Devuelve los tipos válidos + el mapeo tool→event_type + el tipo por defecto, para que
// el Code node deje de hardcodear el mapeo y solo use tipos existentes.
//
// Auth: header x-n8n-webhook-secret (mismo secret que el webhook n8n).
// N8N debe CACHEAR la respuesta (no llamar en cada ejecución).
export async function GET(req: NextRequest) {
  const headers = Object.fromEntries(req.headers)
  const isValid = await validateWebhook('n8n', '', headers)
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const instanceId = searchParams.get('instance_id') || ''
  const workflowId = searchParams.get('workflow_id') || ''
  if (!instanceId || !workflowId) {
    return NextResponse.json(
      { error: 'instance_id and workflow_id are required' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdmin()

  // Resolver UUIDs: instance_id (string) → n8n_instances.id → n8n_workflows.id
  // (workflow_id de n8n no es único entre instancias, por eso se necesita el par)
  const { data: instance } = await supabase
    .from('n8n_instances')
    .select('id')
    .eq('instance_id', instanceId)
    .single()
  if (!instance) {
    return NextResponse.json({ error: 'instance not found' }, { status: 404 })
  }

  const { data: workflow } = await supabase
    .from('n8n_workflows')
    .select('id')
    .eq('instance_id', instance.id)
    .eq('workflow_id', workflowId)
    .single()
  if (!workflow) {
    return NextResponse.json({ error: 'workflow not found' }, { status: 404 })
  }

  const [{ data: types }, { data: rules }] = await Promise.all([
    supabase
      .from('event_types')
      .select('key, category, is_default')
      .eq('workflow_id', workflow.id)
      .eq('status', 'active'),
    supabase
      .from('event_type_rules')
      .select('tool_pattern, event_type_key, priority')
      .eq('workflow_id', workflow.id)
      .order('priority', { ascending: true }),
  ])

  const defaultType =
    (types || []).find((t) => t.is_default)?.key || 'Mensaje_Respondido'

  return NextResponse.json({
    types: (types || []).map((t) => ({
      key: t.key,
      category: t.category,
      active: true,
    })),
    rules: (rules || []).map((r) => ({
      tool_pattern: r.tool_pattern,
      event_type: r.event_type_key,
    })),
    default: defaultType,
  })
}
