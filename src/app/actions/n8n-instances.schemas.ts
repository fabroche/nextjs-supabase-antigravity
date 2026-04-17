import { z } from 'zod'

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
