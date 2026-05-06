import "server-only";

import { getAdminDb, getFirebaseAdminConfigStatus } from "@/lib/firebase/admin";
import {
  inferSwarmVillageGridCols,
  normalizeSwarmVillageBoard,
  normalizeSwarmVillageGridCols,
} from "@/lib/swarm-village/render";
import type { SwarmVillageMapSnapshot } from "@/types/swarm-village";

const SWARM_VILLAGE_MAPS_COLLECTION = "SwarmVillageMaps";

export async function getSwarmVillageMapById(
  boardId: string,
): Promise<SwarmVillageMapSnapshot | null> {
  if (!isSafeBoardId(boardId) || !getFirebaseAdminConfigStatus().ready) {
    return null;
  }

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

    const data = doc.data() ?? {};

    if (!Array.isArray(data.board)) {
      return null;
    }

    const gridCols = normalizeSwarmVillageGridCols(
      readNumber(data.gridCols) ?? inferSwarmVillageGridCols(data.board),
    );

    return {
      id: boardId,
      uid:
        readString(data.uid) ??
        readString(data.userId) ??
        readString(data.ownerUid) ??
        null,
      displayName:
        readString(data.displayName) ??
        readString(data.playerName) ??
        readString(data.username) ??
        readString(data.name),
      board: normalizeSwarmVillageBoard(data.board, gridCols),
      gridCols,
      swarmCompletionCount: readNumber(data.swarmCompletionCount) ?? 0,
      status: readString(data.status),
      waveSize: readNumber(data.waveSize),
      waveDefeated: readNumber(data.waveDefeated),
      updatedAt: readDate(data.updatedAt),
    };
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readDate(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    const date = value.toDate();

    return date instanceof Date ? date.toISOString() : null;
  }

  if (typeof value === "string") {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  return null;
}

function isSafeBoardId(value: string) {
  return /^[A-Za-z0-9_-]{3,160}$/.test(value);
}
