import { useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { IonIcon } from '@ionic/react';
import {
  arrowBackOutline,
  timeOutline,
  flagOutline,
  checkmarkCircleOutline,
  squareOutline,
} from 'ionicons/icons';
import { getMatchById } from '../data/matches';
import { getMatchDetailById } from '../data/matchDetails';
import { getTeamById } from '../data/teams';
import { getLeagueById } from '../data/leagues';
import { MatchEvent } from '../data/types';
import './MatchDetailPage.css';

type DetailTab = 'overview' | 'events' | 'stats' | 'lineups';

const MatchDetailPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const history = useHistory();
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');

  const match = getMatchById(matchId);
  const detail = getMatchDetailById(matchId);

  if (!match) {
    return (
      <div className="match-detail-page">
        <p style={{ color: 'var(--text-muted)', padding: 40 }}>Match not found.</p>
      </div>
    );
  }

  const homeTeam = getTeamById(match.homeTeam.teamId);
  const awayTeam = getTeamById(match.awayTeam.teamId);
  const league = getLeagueById(match.leagueId);

  if (!homeTeam || !awayTeam || !league) return null;

  const isLive = match.status === 'live';

  /* ── Event icon helper ── */
  const eventIcon = (evt: MatchEvent) => {
    switch (evt.type) {
      case 'goal':
        return <IonIcon icon={checkmarkCircleOutline} className="event-icon event-icon--goal" />;
      case 'yellow-card':
        return <span className="event-card-icon event-card-icon--yellow" />;
      case 'red-card':
        return <span className="event-card-icon event-card-icon--red" />;
      case 'substitution':
        return <IonIcon icon={squareOutline} className="event-icon event-icon--sub" />;
      default:
        return null;
    }
  };

  /* ── Statistics rows (label + home/away values) ── */
  const statRows = detail
    ? [
        { label: 'Shots', home: detail.statistics.shots[0], away: detail.statistics.shots[1] },
        { label: 'Shots on Target', home: detail.statistics.shotsOnTarget[0], away: detail.statistics.shotsOnTarget[1] },
        { label: 'Corners', home: detail.statistics.corners[0], away: detail.statistics.corners[1] },
        { label: 'Fouls', home: detail.statistics.fouls[0], away: detail.statistics.fouls[1] },
      ]
    : [];

  const tabs: { key: DetailTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'events', label: 'Events' },
    { key: 'stats', label: 'Stats' },
    { key: 'lineups', label: 'Lineups' },
  ];

  return (
    <div className="match-detail-page">
      {/* Back button */}
      <button className="back-btn" onClick={() => history.push('/matches')}>
        <IonIcon icon={arrowBackOutline} />
        <span>Back to Matches</span>
      </button>

      {/* ── Match header ── */}
      <div className="detail-header">
        <span className="detail-league-name">
          <span className="detail-league-dot" />
          {league.name}
        </span>

        {isLive && (
          <span className="detail-live-badge">
            <span className="detail-live-dot" />
            LIVE - {match.minute}
          </span>
        )}
        {match.status === 'finished' && (
          <span className="detail-ft-badge">FT</span>
        )}
        {match.status === 'upcoming' && (
          <span className="detail-upcoming-badge">{match.kickoff}</span>
        )}

        {/* Teams + score */}
        <div className="detail-teams-row">
          <div className="detail-team">
            <span className="detail-team-abbr">{homeTeam.abbreviation}</span>
            <span className="detail-team-name">{homeTeam.name}</span>
          </div>

          <span className={`detail-score ${isLive ? 'live' : ''}`}>
            {match.homeTeam.score !== null ? match.homeTeam.score : '–'}
            {' : '}
            {match.awayTeam.score !== null ? match.awayTeam.score : '–'}
          </span>

          <div className="detail-team">
            <span className="detail-team-abbr">{awayTeam.abbreviation}</span>
            <span className="detail-team-name">{awayTeam.name}</span>
          </div>
        </div>

        <span className="detail-venue">{match.venue}</span>
      </div>

      {/* ── Tab bar ── */}
      <div className="detail-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`detail-tab ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="detail-content">
        {/* OVERVIEW tab — shows both statistics + events */}
        {activeTab === 'overview' && detail && (
          <>
            {/* Match Statistics card */}
            <div className="detail-card">
              <div className="detail-card-header">
                <IonIcon icon={timeOutline} className="detail-card-icon" />
                <span>Match Statistics</span>
              </div>

              {/* Possession bar */}
              <div className="possession-row">
                <span className="possession-value home">{detail.statistics.possession[0]}%</span>
                <span className="possession-label">Possession</span>
                <span className="possession-value away">{detail.statistics.possession[1]}%</span>
              </div>
              <div className="possession-bar">
                <div
                  className="possession-bar-fill home"
                  style={{ width: `${detail.statistics.possession[0]}%` }}
                />
                <div
                  className="possession-bar-fill away"
                  style={{ width: `${detail.statistics.possession[1]}%` }}
                />
              </div>

              {/* Stat rows */}
              {statRows.map((row) => (
                <div key={row.label} className="stat-row">
                  <span className="stat-row-value home">{row.home}</span>
                  <span className="stat-row-label">{row.label}</span>
                  <span className="stat-row-value away">{row.away}</span>
                </div>
              ))}
            </div>

            {/* Match Events card */}
            <div className="detail-card">
              <div className="detail-card-header">
                <IonIcon icon={flagOutline} className="detail-card-icon" />
                <span>Match Events</span>
              </div>

              <div className="events-timeline">
                {detail.events.map((evt) => (
                  <div
                    key={evt.id}
                    className={`event-item ${evt.side === 'home' ? 'home' : 'away'}`}
                  >
                    <div className="event-content">
                      {eventIcon(evt)}
                      <div className="event-text">
                        <span className="event-player">{evt.playerName}</span>
                        <span className="event-minute">{evt.minute}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* EVENTS tab */}
        {activeTab === 'events' && detail && (
          <div className="detail-card">
            <div className="detail-card-header">
              <IonIcon icon={flagOutline} className="detail-card-icon" />
              <span>Match Events</span>
            </div>
            <div className="events-timeline">
              {detail.events.map((evt) => (
                <div
                  key={evt.id}
                  className={`event-item ${evt.side === 'home' ? 'home' : 'away'}`}
                >
                  <div className="event-content">
                    {eventIcon(evt)}
                    <div className="event-text">
                      <span className="event-player">{evt.playerName}</span>
                      <span className="event-minute">{evt.minute}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STATS tab */}
        {activeTab === 'stats' && detail && (
          <div className="detail-card">
            <div className="detail-card-header">
              <IonIcon icon={timeOutline} className="detail-card-icon" />
              <span>Match Statistics</span>
            </div>

            <div className="possession-row">
              <span className="possession-value home">{detail.statistics.possession[0]}%</span>
              <span className="possession-label">Possession</span>
              <span className="possession-value away">{detail.statistics.possession[1]}%</span>
            </div>
            <div className="possession-bar">
              <div
                className="possession-bar-fill home"
                style={{ width: `${detail.statistics.possession[0]}%` }}
              />
              <div
                className="possession-bar-fill away"
                style={{ width: `${detail.statistics.possession[1]}%` }}
              />
            </div>

            {statRows.map((row) => (
              <div key={row.label} className="stat-row">
                <span className="stat-row-value home">{row.home}</span>
                <span className="stat-row-label">{row.label}</span>
                <span className="stat-row-value away">{row.away}</span>
              </div>
            ))}
          </div>
        )}

        {/* LINEUPS tab — placeholder */}
        {activeTab === 'lineups' && (
          <div className="detail-card">
            <div className="detail-card-header">
              <span>Lineups</span>
            </div>
            <p className="placeholder-text">Lineups will be available closer to kick-off.</p>
          </div>
        )}

        {/* No detail data fallback */}
        {!detail && (
          <div className="detail-card">
            <p className="placeholder-text">Match details are not available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchDetailPage;
