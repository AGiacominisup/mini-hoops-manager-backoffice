import type { TournamentStatus } from '../api/api-client'
import type { TranslationKey } from './translations'

export const tournamentStatusKeys: Record<TournamentStatus, TranslationKey> = {
  draft: 'tournaments.draft',
  qualification: 'tournaments.qualification',
  finals: 'tournaments.finals',
  completed: 'tournaments.completed',
}
