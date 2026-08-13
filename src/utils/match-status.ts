import type { MatchPhase, MatchStatus } from '../api/api-client'
import type { TranslationKey } from './translations'

export const matchStatusKeys: Record<MatchStatus, TranslationKey> = {
  scheduled: 'matchStatus.scheduled',
  queued: 'matchStatus.queued',
  ready: 'matchStatus.ready',
  in_progress: 'matchStatus.inProgress',
  completed: 'matchStatus.completed',
}

export const matchPhaseKeys: Record<MatchPhase, TranslationKey> = {
  qualification: 'matchPhase.qualification',
  final: 'matchPhase.final',
}
