import type { Match, MatchReport } from '../api/api-client'
import { getMatchPlayersWithSide, getMatchReportPlayerLine } from '../utils/match-report-stats'
import { translate } from '../utils/translations'

interface FinalMatchStatsProps {
  match: Match
  report: MatchReport
  groupName: string
  courtName: string
  getPlayerLabel: (registrationId: string) => string
}

export function FinalMatchStats({ match, report, groupName, courtName, getPlayerLabel }: FinalMatchStatsProps) {
  const mvpRegistrationId = report.awards?.mvpRegistrationId ?? null
  const fairPlayRegistrationId = report.awards?.fairPlayRegistrationId ?? null
  const players = getMatchPlayersWithSide(match)

  return (
    <article className="final-stats-card">
      <header className="final-stats-heading">
        <div>
          <p className="eyebrow">{groupName}</p>
          <h3>{translate('tournamentDetail.teamA')} {report.scoreA} - {report.scoreB} {translate('tournamentDetail.teamB')}</h3>
          <p>{courtName}</p>
        </div>
        <div className="final-stats-awards">
          <p>
            <span>{translate('tournamentDetail.mvpAward')}</span>
            <strong>{mvpRegistrationId ? getPlayerLabel(mvpRegistrationId) : translate('common.notAvailable')}</strong>
          </p>
          <p>
            <span>{translate('tournamentDetail.fairPlayAward')}</span>
            <strong>{fairPlayRegistrationId ? getPlayerLabel(fairPlayRegistrationId) : translate('common.notAvailable')}</strong>
          </p>
        </div>
      </header>

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
    </article>
  )
}
