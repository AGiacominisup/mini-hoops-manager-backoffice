import type { Match, MatchReport } from '../api/api-client'
import { MatchReportBoxScore } from './match-report-box-score'
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

      <MatchReportBoxScore match={match} report={report} getPlayerLabel={getPlayerLabel} />
    </article>
  )
}
