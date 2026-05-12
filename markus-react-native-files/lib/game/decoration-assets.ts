import { getApp } from '@react-native-firebase/app';
import { getDownloadURL, getStorage, ref } from '@react-native-firebase/storage';
import * as FileSystem from 'expo-file-system/legacy';
import type { ImageSourcePropType } from 'react-native';

const CACHE_DIR = `${FileSystem.cacheDirectory ?? ''}decorations/`;
const CACHE_MAX_AGE_MS = 4 * 60 * 60 * 1000;

const FALLBACK_DECORATION_SPRITES: Record<string, ImageSourcePropType> = {
  tree: require('@/assets/images/quest/tree.png'),
  'tree-snow': require('@/assets/images/quest/tree-snow.png'),
  bush: require('@/assets/images/quest/bush.png'),
  'bush-snow': require('@/assets/images/quest/bush-snow.png'),
  chest: require('@/assets/images/quest/chest.png'),
  rocks: require('@/assets/images/quest/rocks.png'),
  'rocks-snow': require('@/assets/images/quest/rocks-snow.png'),
  ijom: require('@/assets/images/quest/ijom.png'),
  'ijom-snow': require('@/assets/images/quest/ijom-snow.png'),
};

const memorySourceCache = new Map<string, ImageSourcePropType | null>();
const inFlightLoads = new Map<string, Promise<ImageSourcePropType | null>>();
const storageInstance = getStorage(getApp());

const IMAGE_EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg'];

function sanitizeType(rawType: string): string {
  return rawType.trim().replace(/^\/+|\/+$/g, '');
}

function hasFileExtension(value: string): boolean {
  return /\.[a-z0-9]+$/i.test(value);
}

function toCacheFilePath(fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return `${CACHE_DIR}${safeName}`;
}

async function ensureCacheDir(): Promise<void> {
  if (!CACHE_DIR) return;
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

function buildFileNameCandidates(type: string): string[] {
  const candidates: string[] = [];

  if (hasFileExtension(type)) {
    candidates.push(type);
  } else {
    for (const ext of IMAGE_EXTENSIONS) {
      candidates.push(`${type}.${ext}`);
    }
  }

  // Storage naming can vary slightly across map versions.
  if (type === 'rocks-snow') {
    candidates.push('rocky-snow.png');
    candidates.push('rocky-snow.webp');
  }
  if (type === 'rocky-snow') {
    candidates.push('rocks-snow.png');
    candidates.push('rocks-snow.webp');
  }

  return [...new Set(candidates)];
}

async function getCachedOrDownload(fileName: string, downloadUrl: string): Promise<ImageSourcePropType> {
  await ensureCacheDir();
  const localUri = toCacheFilePath(fileName);
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  const modifiedAtMs =
    typeof (fileInfo as { modificationTime?: number }).modificationTime === 'number'
      ? ((fileInfo as { modificationTime?: number }).modificationTime as number) * 1000
      : 0;
  const isStale = modifiedAtMs > 0 && Date.now() - modifiedAtMs > CACHE_MAX_AGE_MS;
  if (!fileInfo.exists || isStale) {
    if (fileInfo.exists && isStale) {
      try {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
      } catch {
        // Best effort.
      }
    }
    await FileSystem.downloadAsync(downloadUrl, localUri);
  }
  return { uri: localUri };
}

async function loadDecorationFromStorage(type: string): Promise<ImageSourcePropType | null> {
  const candidates = buildFileNameCandidates(type);

  for (const fileName of candidates) {
    try {
      const storagePath = `decorations/${fileName}`;
      const downloadUrl = await getDownloadURL(ref(storageInstance, storagePath));
      return await getCachedOrDownload(fileName, downloadUrl);
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

export function getFallbackDecorationSprite(type: string): ImageSourcePropType | undefined {
  return FALLBACK_DECORATION_SPRITES[type];
}

export async function resolveDecorationSprite(type: string): Promise<ImageSourcePropType | null> {
  const normalizedType = sanitizeType(type);
  if (!normalizedType) return null;

  if (memorySourceCache.has(normalizedType)) {
    return memorySourceCache.get(normalizedType) ?? null;
  }

  const existingTask = inFlightLoads.get(normalizedType);
  if (existingTask) {
    return existingTask;
  }

  const task = (async () => {
    const remoteSource = await loadDecorationFromStorage(normalizedType);
    if (remoteSource) {
      memorySourceCache.set(normalizedType, remoteSource);
      return remoteSource;
    }

    const fallback = getFallbackDecorationSprite(normalizedType) ?? null;
    memorySourceCache.set(normalizedType, fallback);
    return fallback;
  })();

  inFlightLoads.set(normalizedType, task);
  try {
    return await task;
  } finally {
    inFlightLoads.delete(normalizedType);
  }
}
