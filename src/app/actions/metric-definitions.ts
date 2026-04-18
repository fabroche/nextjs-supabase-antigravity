"use server"

import { z } from 'zod'
import { updateMetricDefinition, reorderMetricDefinitions } from '@/lib/supabase/queries'

const updateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(120).optional(),
  is_active: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
})

export async function actionUpdateMetricDefinition(raw: z.infer<typeof updateSchema>) {
  const parsed = updateSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  try {
    const { id, ...updates } = parsed.data
    await updateMetricDefinition(id, updates)
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al actualizar' }
  }
}

const reorderSchema = z.array(z.object({ id: z.string().uuid(), display_order: z.number().int() }))

export async function actionReorderMetricDefinitions(raw: z.infer<typeof reorderSchema>) {
  const parsed = reorderSchema.safeParse(raw)
  if (!parsed.success) return { error: 'Orden inválido' }
  try {
    await reorderMetricDefinitions(parsed.data)
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al reordenar' }
  }
}
