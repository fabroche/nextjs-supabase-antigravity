"use server"

import { z } from 'zod'
import {
  createN8NInstance,
  updateN8NInstance,
  archiveN8NInstance,
} from '@/lib/supabase/queries'
import {
  createInstanceSchema,
  updateInstanceSchema,
  type CreateInstanceInput,
  type UpdateInstanceInput,
} from './n8n-instances.schemas'

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
