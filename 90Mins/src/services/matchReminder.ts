import footballApi from './footballApi';
import { getTeamById } from '../data/dataHelpers';
import { favouriteTeams } from '../data/favourites';
import Logger from './logger';

interface ReminderState {
  matchId: string;
  reminder15sent: boolean;
  timestamp: number;
}

type ReminderCallback = (match: any) => void;

class MatchReminderService {
  private isRunning = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private remindersMap = new Map<string, ReminderState>();
  private listeners: Set<ReminderCallback> = new Set();
  private lastCheckTime = 0;

  constructor() {
    this.loadRemindersFromStorage();
  }

  private logger = new Logger('MatchReminder');

  /**
   * Load reminder tracking from localStorage
   */
  private loadRemindersFromStorage(): void {
    try {
      const stored = localStorage.getItem('matchReminders');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.remindersMap = new Map(Object.entries(parsed));
      }
    } catch {
      this.logger.warn('[MatchReminder] Failed to load reminders from storage');
    }
  }

  /**
   * Save reminder tracking to localStorage
   */
  private saveRemindersToStorage(): void {
    try {
      const obj = Object.fromEntries(this.remindersMap);
      localStorage.setItem('matchReminders', JSON.stringify(obj));
    } catch {
      this.logger.warn('[MatchReminder] Failed to save reminders to storage');
    }
  }

  /**
   * Get favourite team IDs
   */
  private getFavouriteTeamIds(): string[] {
    return favouriteTeams.map(fav => fav.teamId);
  }

  /**
   * Extract all team IDs from API team object
   */
  private getApiTeamIds(apiTeam: any): number[] {
    return [apiTeam?.internalId, apiTeam?.apiId, apiTeam?.id].filter(
      (id): id is number => typeof id === 'number'
    );
  }

  /**
   * Check if a match involves a favourite team
   */
  private isFavouriteTeamMatch(apiMatch: any): boolean {
    const favouriteTeamIds = this.getFavouriteTeamIds();
    if (favouriteTeamIds.length === 0) return false;

    const homeIds = this.getApiTeamIds(apiMatch.homeTeam);
    const awayIds = this.getApiTeamIds(apiMatch.awayTeam);

    return favouriteTeamIds.some((teamId) => {
      const team = getTeamById(teamId);
      if (!team) return false;

      const localIds = [team.bsdTeamId, team.bsdApiId].filter(
        (id): id is number => typeof id === 'number'
      );
      return localIds.some(
        (id) => homeIds.includes(id) || awayIds.includes(id)
      );
    });
  }

  /**
   * Parse kickoff time string (e.g., "18:30") and get timestamp for today
   */
  private getKickoffTimestamp(timeStr: string): number {
    const [hours, mins] = timeStr.split(':').map(Number);
    const now = new Date();
    const kickoff = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, mins, 0);
    return kickoff.getTime();
  }

  /**
   * Check upcoming matches and send 15-minute reminders
   */
  private async checkUpcomingMatches(): Promise<void> {
    try {
      const favouriteTeamIds = this.getFavouriteTeamIds();
      if (favouriteTeamIds.length === 0) return;

      // Fetch today's matches
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(today.getDate()).padStart(2, '0')}`;

      const response = (await footballApi.getFixturesByDate(dateStr)) as any;
      if (!response?.matches) return;

      const now = Date.now();
      const reminderWindow = 15 * 60 * 1000; // 15 minutes in milliseconds

      for (const apiMatch of response.matches) {
        // Only check upcoming matches
        if (apiMatch.status !== 'NOT_STARTED') continue;

        // Only check favourite team matches
        if (!this.isFavouriteTeamMatch(apiMatch)) continue;

        // Only check matches with kickoff time
        if (!apiMatch.kickoff) continue;

        const matchId = `match-${apiMatch.id}`;
        const kickoffTimestamp = this.getKickoffTimestamp(apiMatch.kickoff);
        const timeUntilKickoff = kickoffTimestamp - now;

        // Initialize if not tracked
        if (!this.remindersMap.has(matchId)) {
          this.remindersMap.set(matchId, {
            matchId,
            reminder15sent: false,
            timestamp: Date.now(),
          });
        }

        const reminder = this.remindersMap.get(matchId)!;

        // Check if we should send 15-minute reminder
        if (
          !reminder.reminder15sent &&
          timeUntilKickoff > 0 &&
          timeUntilKickoff <= reminderWindow
        ) {
          reminder.reminder15sent = true;
          this.remindersMap.set(matchId, reminder);
          this.saveRemindersToStorage();

          this.logger.info(`[MatchReminder] Sending 15-min reminder for ${apiMatch.homeTeam.name} vs ${apiMatch.awayTeam.name}`);

          // Notify listeners
          this.notifyListeners({
            ...apiMatch,
            _matchId: matchId,
            _reminderType: '15min',
            _kickoffTime: apiMatch.kickoff,
          });
        }

        // Clean up old reminders (older than 24 hours)
        if (now - reminder.timestamp > 86400000) {
          this.remindersMap.delete(matchId);
        }
      }

      this.saveRemindersToStorage();
    } catch (err) {
      this.logger.error('[MatchReminder] Error checking upcoming matches:', err);
    }
  }

  /**
   * Notify all listeners of a reminder
   */
  private notifyListeners(matchData: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(matchData);
      } catch (err) {
        this.logger.error('[MatchReminder] Listener error:', err);
      }
    });
  }

  /**
   * Start checking for reminders
   */
  public startReminders(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.logger.info('[MatchReminder] Started reminder service');

    // Check immediately
    this.checkUpcomingMatches();

    // Then check every 60 seconds
    this.checkInterval = setInterval(() => {
      const now = Date.now();
      // Only check if at least 30 seconds have passed since last check
      if (now - this.lastCheckTime >= 30000) {
        this.lastCheckTime = now;
        this.checkUpcomingMatches();
      }
    }, 10000); // Check every 10 seconds but respect 30-second debounce
  }

  /**
   * Stop checking for reminders
   */
  public stopReminders(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.logger.info('[MatchReminder] Stopped reminder service');
  }

  /**
   * Subscribe to reminder notifications
   */
  public onReminder(callback: ReminderCallback): () => void {
    this.listeners.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Get service status
   */
  public isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Reset all reminders (for testing or manual reset)
   */
  public resetReminders(): void {
    this.remindersMap.clear();
    this.saveRemindersToStorage();
    this.logger.info('[MatchReminder] Reminders reset');
  }
}

export default new MatchReminderService();
