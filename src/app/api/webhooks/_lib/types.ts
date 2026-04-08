export interface NormalizedEvent {
  source: string
  event_type: string
  actor: string
  action: string
  description: string
  channel?: string
  target_user_id?: string | null
  metadata?: Record<string, unknown>
}
