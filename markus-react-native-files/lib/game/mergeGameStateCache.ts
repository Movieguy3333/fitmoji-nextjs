import AsyncStorage from '@react-native-async-storage/async-storage';

const gameStateCacheKey = (uid: string) => `fitmoji:game-state:${uid}`;

/** Merges partial updates into the same local cache Play uses for `PlayerStats`. */
export async function mergeGameStateCache(uid: string, updates: Record<string, unknown>): Promise<void> {
  try {
    const cached = await AsyncStorage.getItem(gameStateCacheKey(uid));
    const parsed = cached ? JSON.parse(cached) : {};
    await AsyncStorage.setItem(gameStateCacheKey(uid), JSON.stringify({ ...parsed, ...updates }));
  } catch {
    /* ignore */
  }
}
