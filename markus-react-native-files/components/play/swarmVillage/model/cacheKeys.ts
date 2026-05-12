export const VILLAGE_BOARD_CACHE_KEY = 'fitmoji:village-board:v1';
export const VILLAGE_BOARD_ID_CACHE_KEY = 'fitmoji:village-board-id:v1';
export const SPENT_ENERGY_CACHE_KEY = 'fitmoji:village-spent-energy:v1';
export const ENERGY_GRANT_EXPLAINER_CACHE_KEY = 'fitmoji:energy-grant-explainer:v1';
export const NEW_PLAYER_ENERGY_OFFSET_CACHE_KEY_PREFIX = 'fitmoji:village-new-player-energy-offset:v1';
export const SWARM_PROGRESS_CACHE_KEY = 'fitmoji:village-swarm-progress:v1';
export const FOREST_SPIRIT_PROGRESS_CACHE_KEY = 'fitmoji:village-forest-spirit-progress:v1';
export const PLAY_TEST_OVERRIDES_STORAGE_KEY = 'fitmoji:play:test-overrides:v1';
export const GAME_STATE_CACHE_KEY_PREFIX = 'fitmoji:game-state:';

export const getGameStateCacheKey = (uid: string) => `${GAME_STATE_CACHE_KEY_PREFIX}${uid}`;

