import Logger from './logger';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const logger = new Logger('userFavourites');
const TABLE_NAME = 'user_favourites';

const getLocalStorageKey = (userId: string) => `favourites_${userId}`;

const readLocalFavourites = (userId: string): string[] => {
  try {
    const raw = localStorage.getItem(getLocalStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
};

const writeLocalFavourites = (userId: string, teamIds: string[]): void => {
  try {
    localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(teamIds));
  } catch {
    logger.warn('Failed to cache favourites in localStorage');
  }
};

const emitFavouritesUpdated = (userId: string): void => {
  window.dispatchEvent(
    new CustomEvent('user-favourites-updated', {
      detail: { userId },
    })
  );
};

export function getCachedUserFavouriteTeamIds(userId: string): string[] {
  if (!userId) return [];
  return readLocalFavourites(userId);
}

export async function fetchUserFavouriteTeamIds(userId: string): Promise<string[]> {
  if (!userId) return [];

  const localIds = readLocalFavourites(userId);
  if (!isSupabaseConfigured) return localIds;

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('team_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.warn(`Failed to load cloud favourites: ${error.message}`);
    return localIds;
  }

  const teamIds = (data || [])
    .map((row) => row.team_id)
    .filter((id): id is string => typeof id === 'string');

  writeLocalFavourites(userId, teamIds);
  emitFavouritesUpdated(userId);
  return teamIds;
}

export async function addUserFavouriteTeam(userId: string, teamId: string): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !teamId) return { ok: false, error: 'Missing user or team id' };

  const localIds = readLocalFavourites(userId);
  if (!localIds.includes(teamId)) {
    writeLocalFavourites(userId, [...localIds, teamId]);
  }
  emitFavouritesUpdated(userId);

  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Supabase not configured. Saved locally only.' };
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .upsert(
      { user_id: userId, team_id: teamId },
      { onConflict: 'user_id,team_id', ignoreDuplicates: true }
    );

  if (error) {
    logger.warn(`Failed to save cloud favourite: ${error.message}`);
    return { ok: false, error: error.message };
  }

  emitFavouritesUpdated(userId);

  return { ok: true };
}

export async function removeUserFavouriteTeam(userId: string, teamId: string): Promise<{ ok: boolean; error?: string }> {
  if (!userId || !teamId) return { ok: false, error: 'Missing user or team id' };

  const localIds = readLocalFavourites(userId).filter((id) => id !== teamId);
  writeLocalFavourites(userId, localIds);
  emitFavouritesUpdated(userId);

  if (!isSupabaseConfigured) {
    return { ok: false, error: 'Supabase not configured. Removed locally only.' };
  }

  const { error } = await supabase
    .from(TABLE_NAME)
    .delete()
    .eq('user_id', userId)
    .eq('team_id', teamId);

  if (error) {
    logger.warn(`Failed to remove cloud favourite: ${error.message}`);
    return { ok: false, error: error.message };
  }

  emitFavouritesUpdated(userId);

  return { ok: true };
}
