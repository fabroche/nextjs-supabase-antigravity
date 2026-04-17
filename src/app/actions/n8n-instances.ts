"use server"

import { z } from 'zod'
import {
  createN8NInstance,
  updateN8NInstance,
  archiveN8NInstance,
} from '@/lib/supabase/queries'

export const createInstanceSchema = z.object({
  business_id: z.string().uuid(),
  instance_id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-_]+$/, 'Solo minúsculas, números, guiones y underscores'),
  name: z.string().min(1).max(120),
  environment: z.enum(['production', 'staging', 'development']),
  api_base_url: z.string().url('URL inválida').optional().or(z.literal('')),
  api_key: z.string().optional().or(z.literal('')),
})

export const updateInstanceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120).optional(),
  environment: z.enum(['production', 'staging', 'development']).optional(),
  api_base_url: z.string().url('URL inválida').optional().or(z.literal('')),
  api_key: z.string().optional(),
})

export type CreateInstanceInput = z.infer<typeof createInstanceSchema>
export type UpdateInstanceInput = z.infer<typeof updateInstanceSchema>

export async function actionCreateInstance(raw: CreateInstanceInput) {
  const parsed = createInstanceSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }
  try {
    const instance = await createN8NInstance(parsed.data)
    return { data: instance }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error al crear instancia'
    if (msg.includes('duplicate') || msg.includes('unique')) {
      return { error: 'El instance_id ya existe. Usa uno diferente.' }
    }
    return { error: msg }
  }
}

export async function actionUpdateInstance(raw: UpdateInstanceInput) {
  const parsed = updateInstanceSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos' }
  }
  try {
    await updateN8NInstance(parsed.data)
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al actualizar' }
  }
}

export async function actionArchiveInstance(id: string) {
  if (!z.string().uuid().safeParse(id).success) {
    return { error: 'ID inválido' }
  }
  try {
    await archiveN8NInstance(id)
    return { ok: true }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Error al eliminar' }
  }
}
