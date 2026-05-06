import "server-only";

import {
  FirebaseAdminConfigError,
  getAdminDb,
  getAdminStorageBucket,
  getFirebaseAdminConfigStatus,
} from "@/lib/firebase/admin";
import type {
  PublicVillageCard,
  VillageGalleryData,
  VillageGalleryStatus,
} from "@/types/village";

const PUBLIC_VILLAGES_COLLECTION = "publicVillages";
const SWARM_VILLAGE_MAPS_COLLECTION = "SwarmVillageMaps";
const USERS_COLLECTION = "Users";
const PLAYER_VILLAGE_STORAGE_PREFIX = "maps/player_villages";
const DEFAULT_VILLAGE_LIMIT = 18;
const STORAGE_DISCOVERY_FILE_LIMIT = 500;

type PublicVillageRecord = PublicVillageCard & {
  screenshotPath: string;
  sortOrder: number;
};

type VillageScreenshot = {
  bytes: Buffer;
  contentType: string;
  cacheControl: string;
};

type StorageCandidate = {
  uid: string;
  screenshotPath: string;
  score: number;
};

export async function getVillageGalleryData(
  limit = DEFAULT_VILLAGE_LIMIT,
): Promise<VillageGalleryData> {
  const configStatus = getFirebaseAdminConfigStatus();

  if (!configStatus.ready) {
    return {
      villages: [],
      status: {
        firebaseReady: false,
        source: "notConfigured",
        message: "Firebase Admin is not configured yet.",
        missingKeys: configStatus.missingKeys,
      },
    };
  }

  try {
    const publicRecords = await getPublicVillageRecords(limit);

    if (publicRecords.length > 0) {
      return {
        villages: publicRecords.map(toPublicVillageCard),
        status: connectedStatus(
          "publicVillages",
          `Loaded ${publicRecords.length} published village record${
            publicRecords.length === 1 ? "" : "s"
          } from publicVillages.`,
        ),
      };
    }

    const swarmRecords = await getSwarmVillageMapRecords(limit);

    if (swarmRecords.length > 0) {
      return {
        villages: swarmRecords.map(toPublicVillageCard),
        status: connectedStatus(
          "swarmVillageMaps",
          `Loaded ${swarmRecords.length} village map${
            swarmRecords.length === 1 ? "" : "s"
          } from SwarmVillageMaps, screenshots from Storage, and player info from /Users.`,
        ),
      };
    }

    const storageRecords = await getStorageBackedVillageRecords(limit);

    if (storageRecords.length > 0) {
      return {
        villages: storageRecords.map(toPublicVillageCard),
        status: connectedStatus(
          "storageAndUsers",
          `Loaded ${storageRecords.length} village screenshot${
            storageRecords.length === 1 ? "" : "s"
          } from Storage and player info from /Users.`,
        ),
      };
    }

    return {
      villages: [],
      status: connectedStatus(
        "empty",
        "Connected to Firebase, but no public boardID-backed villages were found.",
      ),
    };
  } catch (error) {
    return {
      villages: [],
      status: {
        firebaseReady: true,
        source: "error",
        message: getSafeErrorMessage(error),
        missingKeys: [],
      },
    };
  }
}

export async function getPublicVillageCards(
  limit = DEFAULT_VILLAGE_LIMIT,
): Promise<PublicVillageCard[]> {
  const gallery = await getVillageGalleryData(limit);

  return gallery.villages;
}

export async function getVillageById(
  id: string,
): Promise<PublicVillageCard | null> {
  const record = await getVillageRecordById(id);

  return record ? toPublicVillageCard(record) : null;
}

export async function getPublishedVillageScreenshot(
  boardId: string,
): Promise<VillageScreenshot | null> {
  const record = await getVillageRecordById(boardId);

  if (!record) {
    return null;
  }

  try {
    const file = getAdminStorageBucket().file(record.screenshotPath);
    const [[bytes], [metadata]] = await Promise.all([
      file.download(),
      file.getMetadata(),
    ]);

    return {
      bytes,
      contentType:
        typeof metadata.contentType === "string"
          ? metadata.contentType
          : "image/png",
      cacheControl:
        typeof metadata.cacheControl === "string"
          ? metadata.cacheControl
          : "public, max-age=300, s-maxage=3600",
    };
  } catch (error) {
    if (isNotFoundStorageError(error)) {
      return null;
    }

    throw error;
  }
}

async function getVillageRecordById(
  id: string,
): Promise<PublicVillageRecord | null> {
  if (!isSafeBoardId(id) || !getFirebaseAdminConfigStatus().ready) {
    return null;
  }

  const publicRecord = await getPublicVillageRecordByBoardId(id);

  if (publicRecord) {
    return publicRecord;
  }

  const swarmRecord = await getSwarmVillageMapRecordById(id);

  if (swarmRecord) {
    return swarmRecord;
  }

  return null;
}

async function getPublicVillageRecords(
  limit: number,
): Promise<PublicVillageRecord[]> {
  try {
    const snapshot = await getAdminDb()
      .collection(PUBLIC_VILLAGES_COLLECTION)
      .where("published", "==", true)
      .limit(limit)
      .get();

    return snapshot.docs
      .map((doc) => mapPublicVillageDoc(doc.id, doc.data()))
      .filter((record): record is PublicVillageRecord => record !== null)
      .sort(sortPublicVillages)
      .slice(0, limit);
  } catch (error) {
    if (error instanceof FirebaseAdminConfigError) {
      return [];
    }

    throw error;
  }
}

async function getPublicVillageRecordByBoardId(
  boardId: string,
): Promise<PublicVillageRecord | null> {
  try {
    const snapshot = await getAdminDb()
      .collection(PUBLIC_VILLAGES_COLLECTION)
      .where("boardID", "==", boardId)
      .limit(1)
      .get();

    const doc = snapshot.docs[0];

    if (!doc) {
      return null;
    }

    return mapPublicVillageDoc(doc.id, doc.data() ?? {});
  } catch (error) {
    if (error instanceof FirebaseAdminConfigError) {
      return null;
    }

    throw error;
  }
}

async function getStorageBackedVillageRecords(
  limit: number,
): Promise<PublicVillageRecord[]> {
  const candidates = await discoverStorageVillageCandidates(limit);
  const records = await Promise.all(
    candidates.map(async (candidate, index) => {
      const userData = await getUserData(candidate.uid);

      return mapStorageVillageRecord(
        candidate.uid,
        candidate.screenshotPath,
        userData,
        index,
      );
    }),
  );

  return records.filter((record): record is PublicVillageRecord => record !== null);
}

async function getSwarmVillageMapRecords(
  limit: number,
): Promise<PublicVillageRecord[]> {
  const [snapshot, storageCandidates] = await Promise.all([
    getAdminDb()
      .collection(SWARM_VILLAGE_MAPS_COLLECTION)
      .where("boardID", ">=", "")
      .limit(Math.max(limit * 4, 50))
      .get(),
    discoverStorageVillageCandidates(limit * 4),
  ]);
  const storageByUid = new Map(
    storageCandidates.map((candidate) => [candidate.uid, candidate]),
  );

  const records = await Promise.all(
    snapshot.docs.map(async (doc, index) => {
      const mapData = doc.data();
      const boardId = readString(mapData.boardID);

      if (!boardId || !isSafeBoardId(boardId)) {
        return null;
      }

      const uid = inferVillageOwnerUid(doc.id, mapData, storageByUid);

      if (!uid) {
        return null;
      }

      const screenshotPath =
        getSafeBoardScreenshotPath(boardId, readString(mapData.previewImageStoragePath)) ??
        getSafeBoardScreenshotPath(boardId, readString(mapData.coverImagePath)) ??
        getSafeBoardScreenshotPath(boardId, readString(mapData.screenshotPath)) ??
        storageByUid.get(boardId)?.screenshotPath ??
        storageByUid.get(uid)?.screenshotPath ??
        (await findStorageScreenshotPathForUid(uid));

      if (!screenshotPath) {
        return null;
      }

      const userData = await getUserData(uid);

      return mapVillageRecordFromData(
        uid,
        screenshotPath,
        { ...mapData, ...userData },
        index,
        boardId,
      );
    }),
  );

  return records
    .filter((record): record is PublicVillageRecord => record !== null)
    .slice(0, limit);
}

async function getSwarmVillageMapRecordById(
  boardId: string,
): Promise<PublicVillageRecord | null> {
  try {
    const snapshot = await getAdminDb()
      .collection(SWARM_VILLAGE_MAPS_COLLECTION)
      .where("boardID", "==", boardId)
      .limit(1)
      .get();
    const doc = snapshot.docs[0];

    if (!doc) {
      return null;
    }

    const mapData = doc.data() ?? {};
    const uid =
      inferVillageOwnerUid(doc.id, mapData, new Map()) ??
      (isSafeUid(doc.id) ? doc.id : null);

    if (!uid) {
      return null;
    }

    const screenshotPath =
      getSafeBoardScreenshotPath(boardId, readString(mapData.previewImageStoragePath)) ??
      getSafeBoardScreenshotPath(boardId, readString(mapData.coverImagePath)) ??
      getSafeBoardScreenshotPath(boardId, readString(mapData.screenshotPath)) ??
      (await findStorageScreenshotPathForUid(boardId)) ??
      (await findStorageScreenshotPathForUid(uid));

    if (!screenshotPath) {
      return null;
    }

    const userData = await getUserData(uid);

    return mapVillageRecordFromData(
      uid,
      screenshotPath,
      { ...mapData, ...userData },
      0,
      boardId,
    );
  } catch {
    return null;
  }
}

async function discoverStorageVillageCandidates(
  limit: number,
): Promise<StorageCandidate[]> {
  const [files] = await getAdminStorageBucket().getFiles({
    prefix: `${PLAYER_VILLAGE_STORAGE_PREFIX}/`,
    maxResults: STORAGE_DISCOVERY_FILE_LIMIT,
  });

  const bestByUid = new Map<string, StorageCandidate>();

  for (const file of files) {
    const candidate = toStorageCandidate(file.name);

    if (!candidate) {
      continue;
    }

    const existing = bestByUid.get(candidate.uid);

    if (!existing || candidate.score > existing.score) {
      bestByUid.set(candidate.uid, candidate);
    }
  }

  return [...bestByUid.values()]
    .sort((first, second) => second.score - first.score)
    .slice(0, limit);
}

async function findStorageScreenshotPathForUid(uid: string) {
  const [files] = await getAdminStorageBucket().getFiles({
    prefix: `${PLAYER_VILLAGE_STORAGE_PREFIX}/${uid}/`,
    maxResults: 60,
  });

  return files
    .map((file) => toStorageCandidate(file.name))
    .filter((candidate): candidate is StorageCandidate => candidate !== null)
    .sort((first, second) => second.score - first.score)[0]?.screenshotPath;
}

async function getUserData(uid: string) {
  try {
    const doc = await getAdminDb().collection(USERS_COLLECTION).doc(uid).get();

    return doc.exists ? (doc.data() ?? {}) : {};
  } catch {
    return {};
  }
}

function mapPublicVillageDoc(
  uid: string,
  data: FirebaseFirestore.DocumentData,
): PublicVillageRecord | null {
  if (data.published !== true || !isSafeUid(uid)) {
    return null;
  }

  const boardId = readString(data.boardID);

  if (!boardId || !isSafeBoardId(boardId)) {
    return null;
  }

  const screenshotPath = getSafeVillageScreenshotPath(
    uid,
    readString(data.coverImagePath) ??
      readString(data.screenshotPath) ??
      readString(data.imagePath),
  );

  if (!screenshotPath) {
    return null;
  }

  return mapVillageRecordFromData(
    uid,
    screenshotPath,
    data,
    readNumber(data.featuredOrder) ?? Number.MAX_SAFE_INTEGER,
    boardId,
  );
}

function mapStorageVillageRecord(
  uid: string,
  screenshotPath: string,
  userData: FirebaseFirestore.DocumentData,
  sortOrder: number,
): PublicVillageRecord | null {
  const boardId = readString(userData.boardID);

  if (!boardId || !isSafeBoardId(boardId)) {
    return null;
  }

  if (!getSafeVillageScreenshotPath(uid, screenshotPath)) {
    return null;
  }

  return mapVillageRecordFromData(
    uid,
    screenshotPath,
    userData,
    sortOrder,
    boardId,
  );
}

function mapVillageRecordFromData(
  uid: string,
  screenshotPath: string,
  data: FirebaseFirestore.DocumentData,
  sortOrder: number,
  boardId = readString(data.boardID) ?? uid,
): PublicVillageRecord {
  const playerName =
    readString(data.displayName) ??
    readString(data.playerName) ??
    readString(data.username) ??
    readString(data.name) ??
    "Fitmoji player";
  const villageName =
    readString(data.villageName) ??
    readString(data.title) ??
    readString(data.village?.name) ??
    `${playerName}'s Village`;

  return {
    uid,
    mapId: boardId,
    boardId,
    href: `/village/${encodeURIComponent(boardId)}`,
    imageUrl: `/api/villages/${encodeURIComponent(boardId)}/screenshot`,
    playerName,
    villageName,
    tagline: readString(data.tagline) ?? readString(data.bio),
    avatarUrl:
      readString(data.gameplayAvatarUrl) ??
      readString(data.gamePlayAvatarUrl) ??
      readString(data.avatarUrl) ??
      readString(data.photoURL_128) ??
      readString(data.photoURL_256) ??
      readString(data.photoURL),
    biome: readString(data.biome) ?? readString(data.village?.biome),
    updatedAt: readDate(data.updatedAt) ?? readDate(data.lastActiveAt),
    screenshotPath,
    sortOrder,
  };
}

function toPublicVillageCard(record: PublicVillageRecord): PublicVillageCard {
  return {
    uid: record.uid,
    mapId: record.mapId,
    boardId: record.boardId,
    href: record.href,
    imageUrl: record.imageUrl,
    playerName: record.playerName,
    villageName: record.villageName,
    tagline: record.tagline,
    avatarUrl: record.avatarUrl,
    biome: record.biome,
    updatedAt: record.updatedAt,
  };
}

function inferVillageOwnerUid(
  mapId: string,
  data: FirebaseFirestore.DocumentData,
  storageByUid: Map<string, StorageCandidate>,
) {
  const candidates = [
    readString(data.uid),
    readString(data.userId),
    readString(data.userID),
    readString(data.ownerUid),
    readString(data.ownerUID),
    readString(data.playerUid),
    readString(data.playerUID),
    readString(data.createdBy),
    readString(data.owner?.uid),
    readString(data.player?.uid),
    mapId,
  ].filter((value): value is string => value !== null && isSafeUid(value));

  return (
    candidates.find((candidate) => storageByUid.has(candidate)) ??
    candidates[0] ??
    null
  );
}

function toStorageCandidate(path: string): StorageCandidate | null {
  const normalizedPath = normalizeStorageObjectPath(path);

  if (!normalizedPath || !isImagePath(normalizedPath)) {
    return null;
  }

  const parts = normalizedPath.split("/");
  const uid = parts[2];

  if (
    parts[0] !== "maps" ||
    parts[1] !== "player_villages" ||
    !isSafeUid(uid)
  ) {
    return null;
  }

  return {
    uid,
    screenshotPath: normalizedPath,
    score: scoreScreenshotPath(normalizedPath),
  };
}

function getSafeVillageScreenshotPath(uid: string, rawPath?: string | null) {
  const fallbackPath = `${PLAYER_VILLAGE_STORAGE_PREFIX}/${uid}/cover.png`;
  const path = normalizeStorageObjectPath(rawPath) ?? fallbackPath;
  const requiredPrefix = `${PLAYER_VILLAGE_STORAGE_PREFIX}/${uid}/`;

  return path.startsWith(requiredPrefix) ? path : null;
}

function getSafeBoardScreenshotPath(boardId: string, rawPath?: string | null) {
  if (!isSafeBoardId(boardId)) {
    return null;
  }

  const path = normalizeStorageObjectPath(rawPath);
  const requiredPrefix = `${PLAYER_VILLAGE_STORAGE_PREFIX}/${boardId}/`;

  return path?.startsWith(requiredPrefix) && isImagePath(path) ? path : null;
}

function normalizeStorageObjectPath(rawPath?: string | null) {
  if (!rawPath) {
    return null;
  }

  return rawPath
    .trim()
    .replace(/^gs:\/\/[^/]+\//, "")
    .replace(/^\/+/, "");
}

function isImagePath(path: string) {
  return /\.(avif|gif|jpe?g|png|webp)$/i.test(path);
}

function scoreScreenshotPath(path: string) {
  const fileName = path.split("/").at(-1)?.toLowerCase() ?? "";
  let score = 1;

  if (fileName.includes("cover")) score += 50;
  if (fileName.includes("screenshot")) score += 45;
  if (fileName.includes("preview")) score += 40;
  if (fileName.includes("village")) score += 35;
  if (fileName.includes("map")) score += 30;
  if (fileName.endsWith(".png")) score += 5;
  if (fileName.endsWith(".webp")) score += 4;
  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) score += 3;

  return score;
}

function sortPublicVillages(
  first: PublicVillageRecord,
  second: PublicVillageRecord,
) {
  if (first.sortOrder !== second.sortOrder) {
    return first.sortOrder - second.sortOrder;
  }

  return (second.updatedAt ?? "").localeCompare(first.updatedAt ?? "");
}

function connectedStatus(
  source: VillageGalleryStatus["source"],
  message: string,
): VillageGalleryStatus {
  return {
    firebaseReady: true,
    source,
    message,
    missingKeys: [],
  };
}

function isSafeUid(uid: string) {
  return typeof uid === "string" && uid.length >= 3 && uid.length <= 128 && !uid.includes("/");
}

function isSafeBoardId(id: string) {
  return /^[A-Za-z0-9_-]{3,160}$/.test(id);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readDate(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate().toISOString();
  }

  return null;
}

function getSafeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Firebase could not be queried.";
}

function isNotFoundStorageError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === 404 || error.code === "404")
  );
}
