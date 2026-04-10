export type EventSeverity = 'success' | 'warning' | 'error'

export interface NormalizedEvent {
  source: string
  event_type: string
  actor: string
  action: string
  description: string
  channel?: string
  severity?: EventSeverity | null
  target_user_id?: string | null
  metadata?: Record<string, unknown>
}
