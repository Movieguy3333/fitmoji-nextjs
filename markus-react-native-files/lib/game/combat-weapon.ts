/**
 * Maps saved 2D avatar config (Firestore `Users.avatar2DConfig`) to combat weapon + bonuses.
 * Keep in sync with `app/(tabs)/profile/2dmodel.tsx` WeaponId.
 */
export type CombatWeaponId = 'none' | 'wood_sword' | 'metal_sword' | 'boxing_gloves';

export function weaponFromAvatar2DConfig(config: unknown): CombatWeaponId {
  if (!config || typeof config !== 'object') return 'none';
  const w = (config as { weapon?: unknown }).weapon;
  if (w === 'wood_sword') return 'wood_sword';
  if (w === 'metal_sword') return 'metal_sword';
  if (w === 'boxing_gloves') return 'boxing_gloves';
  return 'none';
}

/** Flat ATK bonus from equipped weapon (base ATK still comes from combat params / level). */
export function combatWeaponAttackBonus(weapon: CombatWeaponId): number {
  switch (weapon) {
    case 'metal_sword':
      return 10;
    case 'wood_sword':
      return 5;
    case 'boxing_gloves':
      return 4;
    default:
      return 0;
  }
}

export function isSwordWeapon(weapon: CombatWeaponId): boolean {
  return weapon === 'wood_sword' || weapon === 'metal_sword';
}
