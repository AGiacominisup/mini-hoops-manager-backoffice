import type { RefereeAvailability, RefereeUser } from '../api/api-client'
import { translate } from './translations'

type NamedReferee = Pick<RefereeAvailability, 'name' | 'firstName' | 'lastName' | 'email'>
  | Pick<RefereeUser, 'name' | 'firstName' | 'lastName' | 'email'>

export function formatRefereeName(referee?: NamedReferee | null) {
  if (!referee) return translate('common.notAvailable')

  const fullName = referee.name?.trim()
    || [referee.firstName, referee.lastName].filter(Boolean).join(' ').trim()

  return fullName || referee.email?.trim() || translate('common.notAvailable')
}
