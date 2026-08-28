import type { Player } from '../api/api-client'

export type PlayerIdentityKind = 'jersey' | 'name'

export interface PlayerIdentity {
  kind: PlayerIdentityKind
  key: string
  label: string
}

type IdentifiablePlayer = Pick<Player, 'firstName' | 'lastName' | 'jerseyNumber'>

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('it')
}

/**
 * A player is identified inside a tournament by the jersey number when available,
 * otherwise by the name. Players without either one cannot be registered.
 */
export function getPlayerIdentity(player?: IdentifiablePlayer, fallbackJerseyNumber?: string): PlayerIdentity | null {
  const jerseyNumber = player?.jerseyNumber || fallbackJerseyNumber
  if (jerseyNumber) return { kind: 'jersey', key: `jersey:${jerseyNumber}`, label: `#${jerseyNumber}` }

  const name = [player?.firstName, player?.lastName].filter(Boolean).join(' ')
  return name ? { kind: 'name', key: `name:${normalizeName(name)}`, label: name } : null
}

export function findDuplicateIdentityKeys(identities: Array<PlayerIdentity | null>) {
  const occurrences = new Map<string, number>()
  for (const identity of identities) {
    if (identity) occurrences.set(identity.key, (occurrences.get(identity.key) ?? 0) + 1)
  }

  return new Set([...occurrences].filter(([, count]) => count > 1).map(([key]) => key))
}
