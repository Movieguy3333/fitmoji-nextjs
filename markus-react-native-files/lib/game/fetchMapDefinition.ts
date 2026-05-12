import { getApp } from '@react-native-firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  query,
} from '@react-native-firebase/firestore';

type UnknownRecord = Record<string, unknown>;

export type FetchedMapDefinition = {
  imageWidth: number;
  imageHeight: number;
  mapTopMargin: number;
  mapBottomMargin: number;
  waterTopEnabled: boolean;
  waterBottomEnabled: boolean;
  waterTopColor: string;
  waterBottomColor: string;
  mapImageUrl: string;
  weather: string;
  mission: {
    title: string;
    description: string;
    item: string;
    target: number;
    current: number;
    completed: boolean;
  };
  missionCurrencies: Array<{
    id: string;
    label: string;
    requiredAmount: number;
  }>;
  nodes: Array<{
    id: number;
    category: string;
    label: string;
    minSteps: number;
    x: number;
    y: number;
    missionRewardRanges: Array<{
      currencyId: string;
      min: number;
      max: number;
      oneStarAmount: number;
      twoStarAmount: number;
      threeStarAmount: number;
    }>;
    completionCriteria: Array<{
      metric: string;
      oneStarAmount: number;
      twoStarAmount: number;
      threeStarAmount: number;
    }>;
    modal: Array<{
      title: string;
      description: string;
      image: string | null;
      rewards: Array<{
        type: string;
        amount: number;
      }>;
    }>;
    missionImageUrl: string;
    stickerEnabled: boolean;
    stickerX: number;
    stickerY: number;
    stickerWidth?: number;
    stickerHeight?: number;
    multiplayerBonusEnabled: boolean;
    multiplayerBonusStars: number;
    multiplayerBonusXp: number;
  }>;
  paths: Array<{
    from: number;
    to: number;
    bend: string;
    bendIntensity: number;
    joints: Array<{
      x: number;
      y: number;
    }>;
    shape: string;
  }>;
  decorations: Array<{
    type: string;
    x: number;
    y: number;
    scale: number;
    animated: boolean;
    layer: string;
    dynamic: boolean;
    dynamicConditions: Array<{
      metric: string;
      quantity: number;
      decoratorType: string;
    }>;
  }>;
  decorationLibrary: string[];
  animationConfig: {
    dotColor: string;
    dotSize: number;
    easing: string;
    speed: number;
  };
};

const db = getFirestore(getApp());

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === 'object' ? (value as UnknownRecord) : {};

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const normalizeMission = (raw: unknown): FetchedMapDefinition['mission'] => {
  const mission = asRecord(raw);
  const target = asNumber(mission.target, 0);
  const current = asNumber(mission.current, 0);
  const completedFromDoc = mission.completed;
  return {
    title: asString(mission.title),
    description: asString(mission.description),
    item: asString(mission.item),
    target,
    current,
    completed:
      typeof completedFromDoc === 'boolean'
        ? completedFromDoc
        : target > 0
          ? current >= target
          : false,
  };
};

const normalizeMissionCurrencies = (raw: unknown): FetchedMapDefinition['missionCurrencies'] =>
  asArray(raw).map((entry) => {
    const row = asRecord(entry);
    return {
      id: asString(row.id),
      label: asString(row.label),
      requiredAmount: asNumber(row.requiredAmount, 0),
    };
  });

const normalizeNodes = (raw: unknown): FetchedMapDefinition['nodes'] =>
  asArray(raw).map((entry) => {
    const node = asRecord(entry);
    return {
      id: asNumber(node.id, 0),
      category: asString(node.category),
      label: asString(node.label),
      minSteps: asNumber(node.minSteps, 0),
      x: asNumber(node.x, 0),
      y: asNumber(node.y, 0),
      missionRewardRanges: asArray(node.missionRewardRanges).map((rewardEntry) => {
        const reward = asRecord(rewardEntry);
        return {
          currencyId: asString(reward.currencyId),
          min: asNumber(reward.min, 0),
          max: asNumber(reward.max, 0),
          oneStarAmount: asNumber(reward.oneStarAmount, 0),
          twoStarAmount: asNumber(reward.twoStarAmount, 0),
          threeStarAmount: asNumber(reward.threeStarAmount, 0),
        };
      }),
      completionCriteria: asArray(node.completionCriteria).map((criteriaEntry) => {
        const criteria = asRecord(criteriaEntry);
        return {
          metric: asString(criteria.metric),
          oneStarAmount: asNumber(criteria.oneStarAmount, 0),
          twoStarAmount: asNumber(criteria.twoStarAmount, 0),
          threeStarAmount: asNumber(criteria.threeStarAmount, 0),
        };
      }),
      modal: asArray(node.modal).map((modalEntry) => {
        const modal = asRecord(modalEntry);
        return {
          title: asString(modal.title),
          description: asString(modal.description),
          image: modal.image === null ? null : asString(modal.image),
          rewards: asArray(modal.rewards).map((rewardEntry) => {
            const reward = asRecord(rewardEntry);
            return {
              type: asString(reward.type),
              amount: asNumber(reward.amount, 0),
            };
          }),
        };
      }),
      missionImageUrl: asString(node.missionImageUrl),
      stickerEnabled: asBoolean(node.stickerEnabled, false),
      stickerX: asNumber(node.stickerX, 0),
      stickerY: asNumber(node.stickerY, 0),
      stickerWidth: asNumber(node.stickerWidth, 0),
      stickerHeight: asNumber(node.stickerHeight, 0),
      multiplayerBonusEnabled: asBoolean(node.multiplayerBonusEnabled, false),
      multiplayerBonusStars: asNumber(node.multiplayerBonusStars, 0),
      multiplayerBonusXp: asNumber(node.multiplayerBonusXp, 0),
    };
  });

const normalizePaths = (raw: unknown): FetchedMapDefinition['paths'] =>
  asArray(raw).map((entry) => {
    const path = asRecord(entry);
    return {
      from: asNumber(path.from, 0),
      to: asNumber(path.to, 0),
      bend: asString(path.bend, 'right'),
      bendIntensity: asNumber(path.bendIntensity, 0),
      joints: asArray(path.joints).map((jointEntry) => {
        const joint = asRecord(jointEntry);
        return {
          x: asNumber(joint.x, 0),
          y: asNumber(joint.y, 0),
        };
      }),
      shape: asString(path.shape),
    };
  });

const normalizeDecorations = (raw: unknown): FetchedMapDefinition['decorations'] =>
  asArray(raw).map((entry) => {
    const deco = asRecord(entry);
    return {
      type: asString(deco.type),
      x: asNumber(deco.x, 0),
      y: asNumber(deco.y, 0),
      scale: asNumber(deco.scale, 1),
      animated: asBoolean(deco.animated, false),
      layer: asString(deco.layer, 'background'),
      dynamic: asBoolean(deco.dynamic, false),
      dynamicConditions: asArray(deco.dynamicConditions).map((condEntry) => {
        const cond = asRecord(condEntry);
        return {
          metric: asString(cond.metric),
          quantity: asNumber(cond.quantity, 0),
          decoratorType: asString(cond.decoratorType),
        };
      }),
    };
  });

const normalizeDecorationLibrary = (raw: unknown): string[] =>
  asArray(raw).map((entry) => asString(entry)).filter((value) => value.length > 0);

const normalizeAnimationConfig = (raw: unknown): FetchedMapDefinition['animationConfig'] => {
  const cfg = asRecord(raw);
  return {
    dotColor: asString(cfg.dotColor, '#FFFFFF'),
    dotSize: asNumber(cfg.dotSize, 3),
    easing: asString(cfg.easing, 'linear'),
    speed: asNumber(cfg.speed, 1),
  };
};

function normalizeVersionPayload(raw: unknown): FetchedMapDefinition {
  const data = asRecord(raw);
  return {
    imageWidth: asNumber(data.imageWidth, 0),
    imageHeight: asNumber(data.imageHeight, 0),
    mapTopMargin: asNumber(data.mapTopMargin, 130),
    mapBottomMargin: asNumber(data.mapBottomMargin, 20),
    waterTopEnabled: asBoolean(data.waterTopEnabled, true),
    waterBottomEnabled: asBoolean(data.waterBottomEnabled, true),
    waterTopColor: asString(data.waterTopColor, '#0f172a'),
    waterBottomColor: asString(data.waterBottomColor, '#0f172a'),
    mapImageUrl: asString(data.mapImageUrl),
    weather: asString(data.weather, 'sunny'),
    mission: normalizeMission(data.mission),
    missionCurrencies: normalizeMissionCurrencies(data.missionCurrencies),
    nodes: normalizeNodes(data.nodes),
    paths: normalizePaths(data.paths),
    decorations: normalizeDecorations(data.decorations),
    decorationLibrary: normalizeDecorationLibrary(data.decorationLibrary),
    animationConfig: normalizeAnimationConfig(data.animationConfig),
  };
}

export async function fetchMapDefinition(
  worldId: string,
  mapId?: string,
): Promise<FetchedMapDefinition> {
  const normalizedWorldId = worldId.trim();
  if (!normalizedWorldId) {
    throw new Error('fetchMapDefinition: worldId is required.');
  }

  const worldRef = doc(db, 'MapDefs', normalizedWorldId);
  const worldSnap = await getDoc(worldRef);
  if (!worldSnap.exists()) {
    throw new Error(`fetchMapDefinition: MapDefs/${normalizedWorldId} does not exist.`);
  }

  const worldData = asRecord(worldSnap.data());
  const resolvedMapId = mapId?.trim() || asString(worldData.activeMapId, 'map_01');

  const mapsRef = collection(db, 'MapDefs', normalizedWorldId, 'Maps');
  const mapsProbe = await getDocs(query(mapsRef, limit(1)));
  const mapsSubcollectionExists = !mapsProbe.empty;

  let activeVersionId = '';
  let versionRef;

  if (mapsSubcollectionExists) {
    const mapRef = doc(db, 'MapDefs', normalizedWorldId, 'Maps', resolvedMapId);
    const mapSnap = await getDoc(mapRef);
    if (!mapSnap.exists()) {
      throw new Error(
        `fetchMapDefinition: MapDefs/${normalizedWorldId}/Maps/${resolvedMapId} does not exist.`,
      );
    }
    const mapData = asRecord(mapSnap.data());
    activeVersionId = asString(mapData.activeVersionId);
    if (!activeVersionId) {
      throw new Error(
        `fetchMapDefinition: activeVersionId missing in MapDefs/${normalizedWorldId}/Maps/${resolvedMapId}.`,
      );
    }
    versionRef = doc(
      db,
      'MapDefs',
      normalizedWorldId,
      'Maps',
      resolvedMapId,
      'Versions',
      activeVersionId,
    );
  } else {
    activeVersionId = asString(worldData.activeVersionId);
    if (!activeVersionId) {
      throw new Error(
        `fetchMapDefinition: activeVersionId missing in MapDefs/${normalizedWorldId} (legacy world-scoped path).`,
      );
    }
    versionRef = doc(db, 'MapDefs', normalizedWorldId, 'Versions', activeVersionId);
  }

  const versionSnap = await getDoc(versionRef);
  if (!versionSnap.exists()) {
    throw new Error(
      `fetchMapDefinition: version document not found for worldId="${normalizedWorldId}", mapId="${resolvedMapId}", versionId="${activeVersionId}".`,
    );
  }

  return normalizeVersionPayload(versionSnap.data());
}

