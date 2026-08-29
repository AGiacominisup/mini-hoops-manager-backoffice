import type { Match, MatchReport } from '../api/api-client'
import { getMatchPlayersWithSide, getMatchReportPlayerLine } from '../utils/match-report-stats'
import { translate } from '../utils/translations'

interface MatchReportBoxScoreProps {
  match: Match
  report: MatchReport
  getPlayerLabel: (registrationId: string) => string
}

export function MatchReportBoxScore({ match, report, getPlayerLabel }: MatchReportBoxScoreProps) {
  const mvpRegistrationId = report.awards?.mvpRegistrationId ?? null
  const fairPlayRegistrationId = report.awards?.fairPlayRegistrationId ?? null
  const players = getMatchPlayersWithSide(match)

  return (
    <div className="data-table-wrap data-table-wrap--embedded">
      <table className="data-table">
        <thead>
          <tr>
            <th>{translate('tournamentDetail.player')}</th>
            <th>{translate('tournamentDetail.team')}</th>
            <th>{translate('tournamentDetail.pointsMade')}</th>
            <th>{translate('tournamentDetail.onePointers')}</th>
            <th>{translate('tournamentDetail.twoPointers')}</th>
            <th>{translate('tournamentDetail.assists')}</th>
            <th>{translate('tournamentDetail.fouls')}</th>
            <th>{translate('tournamentDetail.awards')}</th>
          </tr>
        </thead>
        <tbody>
          {players.map(({ player, side }) => {
            const line = getMatchReportPlayerLine(report, player, side)
            const isMvp = player.registrationId === mvpRegistrationId
            const isFairPlay = player.registrationId === fairPlayRegistrationId
            return (
              <tr key={player.registrationId} className={isMvp ? 'final-stats-row--mvp' : undefined}>
                <td><strong>{getPlayerLabel(player.registrationId)}</strong></td>
                <td>{translate(side === 'A' ? 'tournamentDetail.teamA' : 'tournamentDetail.teamB')}</td>
                <td>{line.points}</td>
                <td>{line.onePointers}</td>
                <td>{line.twoPointers}</td>
                <td>{line.assists}</td>
                <td>{line.fouls}</td>
                <td>
                  <div className="roster-cell">
                    {isMvp && <span className="status-badge status-badge--checked_in">{translate('tournamentDetail.mvpAward')}</span>}
                    {isFairPlay && <span className="status-badge status-badge--ready">{translate('tournamentDetail.fairPlayAward')}</span>}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
