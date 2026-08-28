import type { Match, MatchPlayer, MatchReport, MatchReportPlayerLine } from '../api/api-client'

function countPlayerEvents(report: MatchReport, registrationId: string): MatchReportPlayerLine {
  const baskets = report.baskets ?? []
  const fouls = report.fouls ?? []
  const scoredBaskets = baskets.filter((basket) => basket.registrationId === registrationId)

  return {
    registrationId,
    side: 'A',
    points: scoredBaskets.reduce((total, basket) => total + basket.points, 0),
    onePointers: scoredBaskets.filter((basket) => basket.points === 1).length,
    twoPointers: scoredBaskets.filter((basket) => basket.points === 2).length,
    assists: baskets.filter((basket) => basket.assistRegistrationId === registrationId).length,
    fouls: fouls.filter((foul) => foul.registrationId === registrationId).length,
  }
}

export function getMatchReportPlayerLine(
  report: MatchReport,
  matchPlayer: MatchPlayer,
  side: 'A' | 'B',
): MatchReportPlayerLine {
  const fromBoxScore = report.boxScore?.find((line) => line.registrationId === matchPlayer.registrationId)
  if (fromBoxScore) return fromBoxScore

  return {
    ...countPlayerEvents(report, matchPlayer.registrationId),
    side,
  }
}

export function getMatchPlayersWithSide(match: Match) {
  return (['A', 'B'] as const).flatMap((side) =>
    (match.teams.find((team) => team.side === side)?.players ?? []).map((player) => ({ player, side })),
  )
}
