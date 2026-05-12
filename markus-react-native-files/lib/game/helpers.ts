/**
 * Face / smiley-style emojis only (no animals, objects, or activities).
 * Used when a user has no photo / Fitmoji URL — deterministic per seed.
 */
const AVATAR_FALLBACK_EMOJIS = [
  '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
  '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜',
  '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶',
  '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒',
  '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸',
  '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺',
  '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😤', '😠', '😡', '🤬', '😈',
  '👿', '🤡', '🥱',
] as const;

/**
 * Returns a stable emoji for a player when they have no profile image URL.
 * Same seed (typically display name, else uid) always maps to the same emoji on every session/device.
 */
export function emojiAvatarForSeed(seed: string): string {
  const normalized = seed.trim().toLowerCase() || 'player';
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (Math.imul(31, hash) + normalized.charCodeAt(i)) >>> 0;
  }
  return AVATAR_FALLBACK_EMOJIS[hash % AVATAR_FALLBACK_EMOJIS.length]!;
}

export function getShipCoordinates(progress: number, screenWidth: number) {
    const startX = 80;
    const endX = screenWidth - 80;
    const startY = 55;
    const dipDepth = 85;
    const notchWidth = 140;
    const center = screenWidth / 2;
    const dipLeft = center - notchWidth / 2;
    const dipRight = center + notchWidth / 2;
    const cornerRadius = 30;
  
    const currentX = startX + progress * (endX - startX);
    let currentY = startY;
  
    if (currentX > dipLeft - cornerRadius && currentX <= dipLeft + cornerRadius) {
      const ratio = (currentX - (dipLeft - cornerRadius)) / (cornerRadius * 2);
      currentY = startY + (dipDepth - startY) * (0.5 - 0.5 * Math.cos(ratio * Math.PI));
    } else if (currentX > dipLeft + cornerRadius && currentX < dipRight - cornerRadius) {
      currentY = dipDepth;
    } else if (currentX >= dipRight - cornerRadius && currentX < dipRight + cornerRadius) {
      const ratio = (currentX - (dipRight - cornerRadius)) / (cornerRadius * 2);
      currentY = dipDepth - (dipDepth - startY) * (0.5 - 0.5 * Math.cos(ratio * Math.PI));
    }
  
    return { x: currentX, y: currentY };
  }