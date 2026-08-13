import type { Player } from '../api/api-client'
import { translate } from './translations'

type NamedPlayer = Pick<Player, 'firstName' | 'lastName'>

function joinPlayerName(player?: NamedPlayer) {
  return [player?.firstName, player?.lastName].filter(Boolean).join(' ')
}

export function formatPlayerName(player: NamedPlayer) {
  return joinPlayerName(player) || translate('common.notAvailable')
}

export function formatPlayerLabel(player?: Player, jerseyNumber?: number) {
  const name = joinPlayerName(player)
  if (name) return name

  const shirtNumber = jerseyNumber ?? player?.jerseyNumber
  return shirtNumber === undefined ? translate('common.notAvailable') : `#${shirtNumber}`
}
