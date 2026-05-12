import { sceneStyles } from '@/components/play/swarmVillage/styles/scene';
import type { PlacedSprite } from '@/components/play/swarmVillage/domain/placedSprites';
import {
  getFootballLaceFlipScaleY,
  getFootballScreenAngle,
} from '@/components/play/swarmVillage/domain/football';
import {
  BOXER_FRAMES,
  CAPYBARA_STATUE_IMAGE,
  CHEST_IMAGE,
  FOOTBALL_IMAGE,
  GRASS_TILE_IMAGE,
  GRASS_TILE_PATH_A_IMAGE,
  GRASS_TILE_PATH_B_IMAGE,
  GRASS_TILE_PATH_C_IMAGE,
  GRASS_TILE_PATH_D_IMAGE,
  GRASS_TILE_PATH_E_IMAGE,
  GRASS_TILE_PATH_F_IMAGE,
  GRASS_TILE_PATH_G_IMAGE,
  GRASS_TILE_PATH_H_IMAGE,
  GRASS_TILE_PATH_I_IMAGE,
  GRASS_TILE_PATH_J_IMAGE,
  IJOM_IMAGE as IJOM_GIF_IMAGE,
  IJOM_SNOW_IMAGE as IJOM_SNOW_GIF_IMAGE,
  QUARTERBACK_IMAGE,
  SOIL_TILE_IMAGE,
  TENNIS_FRAMES,
  TINY_HOUSE_IMAGE,
  WALL_TILE_IMAGE,
  WHEAT_IMAGE,
  WINDMILL_IMAGE,
  WOOD_FENCE_IMAGE,
} from '@/components/play/swarmVillage/model/assets';
import {
  ENEMY_SPRITE_SIZE,
  QUARTERBACK_RANGE,
  SNOW_IJOM_SPRITE_SCALE,
  TILE_WIDTH,
} from '@/components/play/swarmVillage/model/constants';
import { STONE_WALL_MAX_HP, WOOD_FENCE_MAX_HP } from '@/components/play/swarmVillage/model/costs';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Paint,
  Rect,
  RoundedRect,
  Image as SkiaImage,
  useImage,
} from '@shopify/react-native-skia';
import React, { type ReactNode, useMemo } from 'react';
import { Image as RNImage, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
} from 'react-native-reanimated';

const ENEMY_HP_TRACK_WIDTH = 34;
const ENEMY_HP_TRACK_HEIGHT = 5;
const ENEMY_SPRITE_LEFT_OFFSET = 16;
const ENEMY_SPRITE_TOP_OFFSET = -19;
const PAN_KEEP_MARGIN = 60;
const DECAY_RATE = 0.993;

type EnemySprite = {
  id: string;
  variant: 'normal' | 'snow';
  row: number;
  col: number;
  hp: number;
  maxHp: number;
  damage: number;
  speedPerTick: number;
  spawnedAt: number;
  lastAttackAt: number;
};

type ProjectileSprite = {
  id: string;
  row: number;
  col: number;
  velRow: number;
  velCol: number;
  damage: number;
  speedPerTick: number;
  remainingRange: number;
  kind?: 'tennis' | 'football';
  totalRange?: number;
  traveledRange?: number;
  arcHeight?: number;
  launchedAtMs?: number;
};

type GhostPreview = {
  source: number;
  left: number;
  top: number;
  w: number;
  h: number;
} | null;

type SwarmVillageSkiaSceneProps = {
  boardCenterX: number;
  boardWidth: number;
  boardHeight: number;
  dragItem: string | null;
  enemies: EnemySprite[];
  ghostPreview: GhostPreview;
  interactionLocked?: boolean;
  nowMs: number;
  onSceneTap: (screenX: number, screenY: number) => void;
  placedSprites: PlacedSprite[];
  projectiles: ProjectileSprite[];
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  viewportHeight: number;
  viewportWidth: number;
  children?: ReactNode;
};

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.max(min, Math.min(max, value));
};

const getWallMaxHp = (wallType: 'stone' | 'wood' | undefined) => {
  if (wallType === 'wood') return WOOD_FENCE_MAX_HP;
  if (wallType === 'stone') return STONE_WALL_MAX_HP;
  return 0;
};

const getFighterFrameIndex = (
  unit: 'boxer' | 'tennis',
  unitLastAttackAt: number | undefined,
  nowMs: number,
) => {
  const elapsed = nowMs - (unitLastAttackAt ?? 0);
  if (unit === 'boxer') {
    if (elapsed < 60) return 1;
    if (elapsed < 120) return 2;
    if (elapsed < 180) return 3;
    if (elapsed < 240) return 2;
    if (elapsed < 300) return 1;
    return 0;
  }

  if (elapsed < 120) return 1;
  if (elapsed < 240) return 2;
  if (elapsed < 360) return 3;
  if (elapsed < 480) return 2;
  if (elapsed < 600) return 1;
  return 0;
};

const getRewardPulse = (nowMs: number) => 0.76 + Math.sin(nowMs / 280) * 0.18;
const getEnemySpriteSize = (variant: EnemySprite['variant']) =>
  variant === 'snow'
    ? ENEMY_SPRITE_SIZE * SNOW_IJOM_SPRITE_SCALE
    : ENEMY_SPRITE_SIZE;
const getProjectileElevation = (projectile: ProjectileSprite) => {
  if (projectile.kind !== 'football') return 1.2;
  const totalRange = Math.max(1, projectile.totalRange ?? QUARTERBACK_RANGE);
  const progress = clamp((projectile.traveledRange ?? 0) / totalRange, 0, 1);
  return 0.55 + Math.sin(progress * Math.PI) * (projectile.arcHeight ?? 2.8);
};

const getEnemySpritePosition = (enemy: EnemySprite, boardCenterX: number) => {
  const left = boardCenterX + (enemy.col - enemy.row) * (TILE_WIDTH / 2) - (TILE_WIDTH / 2);
  const top = 134 + (enemy.col + enemy.row) * (TILE_WIDTH / 4);
  const spriteSize = getEnemySpriteSize(enemy.variant);

  return {
    left: left + ENEMY_SPRITE_LEFT_OFFSET - (spriteSize - ENEMY_SPRITE_SIZE) / 2,
    size: spriteSize,
    top: top + ENEMY_SPRITE_TOP_OFFSET - (spriteSize - ENEMY_SPRITE_SIZE),
  };
};

export default function SwarmVillageSkiaScene({
  boardCenterX,
  boardWidth,
  boardHeight,
  dragItem,
  enemies,
  ghostPreview,
  interactionLocked = false,
  nowMs,
  onSceneTap,
  placedSprites,
  projectiles,
  scale,
  translateX,
  translateY,
  viewportHeight,
  viewportWidth,
  children,
}: SwarmVillageSkiaSceneProps) {
  const grassImage = useImage(GRASS_TILE_IMAGE);
  const grassPathAImage = useImage(GRASS_TILE_PATH_A_IMAGE);
  const grassPathBImage = useImage(GRASS_TILE_PATH_B_IMAGE);
  const grassPathCImage = useImage(GRASS_TILE_PATH_C_IMAGE);
  const grassPathDImage = useImage(GRASS_TILE_PATH_D_IMAGE);
  const grassPathEImage = useImage(GRASS_TILE_PATH_E_IMAGE);
  const grassPathFImage = useImage(GRASS_TILE_PATH_F_IMAGE);
  const grassPathGImage = useImage(GRASS_TILE_PATH_G_IMAGE);
  const grassPathHImage = useImage(GRASS_TILE_PATH_H_IMAGE);
  const grassPathIImage = useImage(GRASS_TILE_PATH_I_IMAGE);
  const grassPathJImage = useImage(GRASS_TILE_PATH_J_IMAGE);
  const wallImage = useImage(WALL_TILE_IMAGE);
  const fenceImage = useImage(WOOD_FENCE_IMAGE);
  const soilImage = useImage(SOIL_TILE_IMAGE);
  const wheatImage = useImage(WHEAT_IMAGE);
  const houseImage = useImage(TINY_HOUSE_IMAGE);
  const capybaraImage = useImage(CAPYBARA_STATUE_IMAGE);
  const chestImage = useImage(CHEST_IMAGE);
  const boxerImage0 = useImage(BOXER_FRAMES[0]);
  const boxerImage1 = useImage(BOXER_FRAMES[1]);
  const boxerImage2 = useImage(BOXER_FRAMES[2]);
  const boxerImage3 = useImage(BOXER_FRAMES[3]);
  const tennisImage0 = useImage(TENNIS_FRAMES[0]);
  const tennisImage1 = useImage(TENNIS_FRAMES[1]);
  const tennisImage2 = useImage(TENNIS_FRAMES[2]);
  const tennisImage3 = useImage(TENNIS_FRAMES[3]);
  const quarterbackImage = useImage(QUARTERBACK_IMAGE);
  const footballImage = useImage(FOOTBALL_IMAGE);
  const boxerImages = [boxerImage0, boxerImage1, boxerImage2, boxerImage3];
  const tennisImages = [tennisImage0, tennisImage1, tennisImage2, tennisImage3];

  const imageBySource = useMemo(
    () =>
      new Map<number, ReturnType<typeof useImage> | null>([
        [GRASS_TILE_IMAGE, grassImage],
        [GRASS_TILE_PATH_A_IMAGE, grassPathAImage],
        [GRASS_TILE_PATH_B_IMAGE, grassPathBImage],
        [GRASS_TILE_PATH_C_IMAGE, grassPathCImage],
        [GRASS_TILE_PATH_D_IMAGE, grassPathDImage],
        [GRASS_TILE_PATH_E_IMAGE, grassPathEImage],
        [GRASS_TILE_PATH_F_IMAGE, grassPathFImage],
        [GRASS_TILE_PATH_G_IMAGE, grassPathGImage],
        [GRASS_TILE_PATH_H_IMAGE, grassPathHImage],
        [GRASS_TILE_PATH_I_IMAGE, grassPathIImage],
        [GRASS_TILE_PATH_J_IMAGE, grassPathJImage],
        [WALL_TILE_IMAGE, wallImage],
        [WOOD_FENCE_IMAGE, fenceImage],
        [SOIL_TILE_IMAGE, soilImage],
        [WHEAT_IMAGE, wheatImage],
        [TINY_HOUSE_IMAGE, houseImage],
        [CAPYBARA_STATUE_IMAGE, capybaraImage],
        [CHEST_IMAGE, chestImage],
        [QUARTERBACK_IMAGE, quarterbackImage],
      ]),
    [
      capybaraImage,
      chestImage,
      fenceImage,
      grassImage,
      grassPathAImage,
      grassPathBImage,
      grassPathCImage,
      grassPathDImage,
      grassPathEImage,
      grassPathFImage,
      grassPathGImage,
      grassPathHImage,
      grassPathIImage,
      grassPathJImage,
      houseImage,
      quarterbackImage,
      soilImage,
      wallImage,
      wheatImage,
    ],
  );

  const animatedBoardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!interactionLocked)
        .minDistance(2)
        .maxPointers(1)
        .onStart(() => {
          'worklet';
          panStartX.value = translateX.value;
          panStartY.value = translateY.value;
        })
        .onUpdate((event) => {
          'worklet';

          const scaledWidth = boardWidth * scale.value;
          const scaledHeight = boardHeight * scale.value;
          const minX = -(scaledWidth - PAN_KEEP_MARGIN);
          const maxX = viewportWidth - PAN_KEEP_MARGIN;
          const minY = -(scaledHeight - PAN_KEEP_MARGIN);
          const maxY = viewportHeight - PAN_KEEP_MARGIN;

          translateX.value = clamp(
            panStartX.value + event.translationX,
            Math.min(minX, maxX),
            Math.max(minX, maxX),
          );
          translateY.value = clamp(
            panStartY.value + event.translationY,
            Math.min(minY, maxY),
            Math.max(minY, maxY),
          );
        })
        .onEnd((event) => {
          'worklet';

          const scaledWidth = boardWidth * scale.value;
          const scaledHeight = boardHeight * scale.value;
          const minX = -(scaledWidth - PAN_KEEP_MARGIN);
          const maxX = viewportWidth - PAN_KEEP_MARGIN;
          const minY = -(scaledHeight - PAN_KEEP_MARGIN);
          const maxY = viewportHeight - PAN_KEEP_MARGIN;

          translateX.value = withDecay({
            clamp: [Math.min(minX, maxX), Math.max(minX, maxX)],
            deceleration: DECAY_RATE,
            rubberBandEffect: false,
            velocity: event.velocityX,
          });
          translateY.value = withDecay({
            clamp: [Math.min(minY, maxY), Math.max(minY, maxY)],
            deceleration: DECAY_RATE,
            rubberBandEffect: false,
            velocity: event.velocityY,
          });
        }),
    [boardHeight, boardWidth, interactionLocked, panStartX, panStartY, scale, translateX, translateY, viewportHeight, viewportWidth],
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(!interactionLocked)
        .maxDistance(8)
        .onEnd((event, success) => {
          'worklet';
          if (!success) return;
          runOnJS(onSceneTap)(event.absoluteX, event.absoluteY);
        }),
    [interactionLocked, onSceneTap],
  );

  const sceneGesture = useMemo(
    () => Gesture.Exclusive(tapGesture, panGesture),
    [panGesture, tapGesture],
  );

  const placedSpriteNodes = placedSprites.map((sprite) => {
    let image = imageBySource.get(sprite.source) ?? null;
    let shouldFlip = false;

    if (sprite.unit === 'boxer') {
      image = boxerImages[getFighterFrameIndex('boxer', sprite.unitLastAttackAt, nowMs)] ?? boxerImages[0];
      shouldFlip = sprite.unitFacingScaleX === -1;
    } else if (sprite.unit === 'tennis') {
      image = tennisImages[getFighterFrameIndex('tennis', sprite.unitLastAttackAt, nowMs)] ?? tennisImages[0];
      shouldFlip = sprite.unitFacingScaleX === -1;
    } else if (sprite.unit === 'quarterback') {
      image = quarterbackImage;
      shouldFlip = sprite.unitFacingScaleX === -1;
    } else if (sprite.unit === 'house' || sprite.unit === 'capybara_statue') {
      shouldFlip = sprite.unitRotation === 1 || sprite.unitRotation === 3;
    } else if (sprite.wallType) {
      shouldFlip = false;
    }

    const usesNativeAnimatedImage = sprite.unit === 'windmill';
    if (!usesNativeAnimatedImage && !image) return null;

    const imageNode = usesNativeAnimatedImage
      ? null
      : (
        <SkiaImage
          image={image}
          fit="contain"
          x={sprite.left}
          y={sprite.top}
          width={sprite.width}
          height={sprite.height}
        />
      );

    const opacity = dragItem
      ? 0.45
      : sprite.wallType && sprite.wallHp !== undefined
        ? 0.3 + ((sprite.wallHp ?? 0) / Math.max(1, getWallMaxHp(sprite.wallType))) * 0.7
        : 1;

    const showUnitHp = !!sprite.unit && sprite.unit !== 'capybara_statue' && (sprite.unitMaxHp ?? 0) > 0;
    const hpRatio = showUnitHp
      ? clamp((sprite.unitHp ?? 0) / Math.max(1, sprite.unitMaxHp ?? 1), 0, 1)
      : 0;
    const showWallHp =
      !!sprite.wallType &&
      sprite.wallHp !== undefined &&
      getWallMaxHp(sprite.wallType) > 0 &&
      sprite.wallHp < getWallMaxHp(sprite.wallType);
    const wallHpRatio = showWallHp
      ? clamp((sprite.wallHp ?? 0) / Math.max(1, getWallMaxHp(sprite.wallType)), 0, 1)
      : 0;
    const pulseOpacity = sprite.cropReady || sprite.rewardReady ? getRewardPulse(nowMs) : 0;
    const sparkleGlowWidth = sprite.rewardReady ? Math.max(52, sprite.width + 24) : 52;
    const sparkleGlowHeight = sprite.rewardReady
      ? Math.max(34, Math.round(sprite.height * 0.55) + 12)
      : 34;
    const sparkleGlowLeft = sprite.rewardReady
      ? sprite.left + (sprite.width - sparkleGlowWidth) / 2
      : sprite.left - 2;
    const sparkleGlowTop = sprite.rewardReady
      ? sprite.top + sprite.height - sparkleGlowHeight - 8
      : sprite.top - 3;
    const sparklePhase = nowMs / 220 + sprite.row * 0.55 + sprite.col * 0.35;
    const sparkleTwinkle = 0.74 + Math.sin(sparklePhase) * 0.22;
    const sparkleSecondaryTwinkle = 0.62 + Math.cos(sparklePhase * 1.3) * 0.16;
    const sparkleDriftY = Math.sin(sparklePhase * 0.9) * 1.6;
    const sparkleAnchorX = sprite.rewardReady
      ? sparkleGlowLeft + sparkleGlowWidth - 13
      : sparkleGlowLeft + sparkleGlowWidth - 11;
    const sparkleAnchorY = sprite.rewardReady
      ? sparkleGlowTop - 2 + sparkleDriftY
      : sparkleGlowTop + 1 + sparkleDriftY;
    const secondarySparkleX = sparkleAnchorX - (sprite.rewardReady ? 18 : 14);
    const secondarySparkleY = sparkleAnchorY + (sprite.rewardReady ? 8 : 6);
    const glowOpacity = dragItem ? 0.18 : pulseOpacity * (sprite.rewardReady ? 0.9 : 0.82);
    const innerGlowOpacity = dragItem ? 0.1 : pulseOpacity * 0.34;
    const primarySparkleOpacity = dragItem ? 0.18 : sparkleTwinkle;
    const secondarySparkleOpacity = dragItem ? 0.14 : sparkleSecondaryTwinkle;
    const primarySparkleHalf = sprite.rewardReady ? 10.5 : 8.5;
    const secondarySparkleHalf = sprite.rewardReady ? 6.5 : 5.25;
    const blurStrength = sprite.rewardReady ? 15 : 11;

    const renderedImage = imageNode && shouldFlip ? (
      <Group
        transform={[
          { translateX: sprite.left + sprite.width / 2 },
          { scaleX: -1 },
          { translateX: -(sprite.left + sprite.width / 2) },
        ]}
      >
        {imageNode}
      </Group>
    ) : imageNode ? (
      imageNode
    ) : (
      null
    );

    return (
      <React.Fragment key={sprite.id}>
        {showUnitHp && (
          <>
            <RoundedRect
              x={sprite.left + sprite.width / 2 - 17}
              y={sprite.top - 9}
              width={34}
              height={5}
              r={2.5}
              color={`rgba(15, 23, 42, ${dragItem ? 0.5 : 0.92})`}
            />
            <RoundedRect
              x={sprite.left + sprite.width / 2 - 17}
              y={sprite.top - 9}
              width={34 * hpRatio}
              height={5}
              r={2.5}
              color={`rgba(34, 197, 94, ${dragItem ? 0.5 : 1})`}
            />
          </>
        )}
        {showWallHp && (
          <>
            <RoundedRect
              x={sprite.left + 10}
              y={sprite.top - 2}
              width={34}
              height={5}
              r={2.5}
              color={`rgba(15, 23, 42, ${dragItem ? 0.5 : 0.92})`}
            />
            <RoundedRect
              x={sprite.left + 10}
              y={sprite.top - 2}
              width={34 * wallHpRatio}
              height={5}
              r={2.5}
              color={`rgba(148, 163, 184, ${dragItem ? 0.5 : 1})`}
            />
          </>
        )}
        {(sprite.cropReady || sprite.rewardReady) && (
          <Group>
            <Group
              layer={
                <Paint>
                  <BlurMask blur={blurStrength} style="normal" />
                </Paint>
              }
            >
              <RoundedRect
                x={sparkleGlowLeft}
                y={sparkleGlowTop}
                width={sparkleGlowWidth}
                height={sparkleGlowHeight}
                r={sparkleGlowHeight / 2}
                color={`rgba(250, 204, 21, ${(glowOpacity * 0.78).toFixed(3)})`}
              />
            </Group>
            <RoundedRect
              x={sparkleGlowLeft + 2}
              y={sparkleGlowTop + 2}
              width={Math.max(28, sparkleGlowWidth - 4)}
              height={Math.max(18, sparkleGlowHeight - 4)}
              r={Math.max(9, (sparkleGlowHeight - 4) / 2)}
              color={`rgba(250, 214, 74, ${(glowOpacity * 0.42).toFixed(3)})`}
            />
            <RoundedRect
              x={sparkleGlowLeft + 6}
              y={sparkleGlowTop + 5}
              width={Math.max(22, sparkleGlowWidth - 12)}
              height={Math.max(16, sparkleGlowHeight - 10)}
              r={Math.max(8, (sparkleGlowHeight - 10) / 2)}
              color={`rgba(255, 241, 170, ${innerGlowOpacity.toFixed(3)})`}
            />
            <Circle
              cx={sparkleAnchorX}
              cy={sparkleAnchorY}
              r={3.3}
              color={`rgba(255, 250, 220, ${(primarySparkleOpacity * 0.42).toFixed(3)})`}
            />
            <Rect
              x={sparkleAnchorX - 0.9}
              y={sparkleAnchorY - primarySparkleHalf}
              width={1.8}
              height={primarySparkleHalf * 2}
              color={`rgba(255, 250, 220, ${(primarySparkleOpacity * 0.96).toFixed(3)})`}
            />
            <Rect
              x={sparkleAnchorX - primarySparkleHalf}
              y={sparkleAnchorY - 0.9}
              width={primarySparkleHalf * 2}
              height={1.8}
              color={`rgba(255, 245, 186, ${(primarySparkleOpacity * 0.9).toFixed(3)})`}
            />
            <Circle
              cx={secondarySparkleX}
              cy={secondarySparkleY}
              r={2.1}
              color={`rgba(255, 249, 214, ${(secondarySparkleOpacity * 0.34).toFixed(3)})`}
            />
            <Rect
              x={secondarySparkleX - 0.7}
              y={secondarySparkleY - secondarySparkleHalf}
              width={1.4}
              height={secondarySparkleHalf * 2}
              color={`rgba(255, 248, 204, ${(secondarySparkleOpacity * 0.9).toFixed(3)})`}
            />
            <Rect
              x={secondarySparkleX - secondarySparkleHalf}
              y={secondarySparkleY - 0.7}
              width={secondarySparkleHalf * 2}
              height={1.4}
              color={`rgba(255, 244, 184, ${(secondarySparkleOpacity * 0.82).toFixed(3)})`}
            />
          </Group>
        )}
        {renderedImage && <Group opacity={opacity}>{renderedImage}</Group>}
      </React.Fragment>
    );
  });

  const projectileNodes = projectiles.map((projectile) => {
    const left = projectile.col * 37 - projectile.row * 37;
    const cx = boardCenterX + left + 30;
    const cy = 134 + (projectile.col + projectile.row) * 19 + 4 - getProjectileElevation(projectile) * 28;
    if (projectile.kind === 'football') {
      if (!footballImage) return null;
      const footballWidth = 20;
      const footballHeight = 10;
      const screenAngle = getFootballScreenAngle(projectile);
      const laceFlipScaleY = getFootballLaceFlipScaleY(nowMs, projectile.launchedAtMs);
      return (
        <Group
          key={projectile.id}
          opacity={dragItem ? 0.5 : 1}
          transform={[
            { translateX: cx },
            { translateY: cy },
            { rotate: screenAngle },
            { scaleY: laceFlipScaleY },
            { translateX: -cx },
            { translateY: -cy },
          ]}
        >
          <SkiaImage
            image={footballImage}
            fit="contain"
            x={cx - footballWidth / 2}
            y={cy - footballHeight / 2}
            width={footballWidth}
            height={footballHeight}
          />
        </Group>
      );
    }
    return (
      <Circle
        key={projectile.id}
        cx={cx}
        cy={cy}
        r={4}
        color={dragItem ? 'rgba(255,255,255,0.45)' : '#e2e8f0'}
      />
    );
  });

  const enemyHpNodes = enemies.map((enemy) => {
    const { left: spriteX, size: spriteSize, top: spriteY } = getEnemySpritePosition(enemy, boardCenterX);
    const spriteScale = spriteSize / ENEMY_SPRITE_SIZE;
    const hpTrackWidth = ENEMY_HP_TRACK_WIDTH * spriteScale;
    const hpRatio = clamp(enemy.hp / Math.max(1, enemy.maxHp), 0, 1);

    return (
      <React.Fragment key={enemy.id}>
        <RoundedRect
          x={spriteX + (spriteSize - hpTrackWidth) / 2}
          y={spriteY - 6}
          width={hpTrackWidth}
          height={ENEMY_HP_TRACK_HEIGHT}
          r={2.5}
          color={`rgba(15, 23, 42, ${dragItem ? 0.5 : 0.92})`}
        />
        <RoundedRect
          x={spriteX + (spriteSize - hpTrackWidth) / 2}
          y={spriteY - 6}
          width={hpTrackWidth * hpRatio}
          height={ENEMY_HP_TRACK_HEIGHT}
          r={2.5}
          color={`rgba(239, 68, 68, ${dragItem ? 0.5 : 1})`}
        />
      </React.Fragment>
    );
  });

  const ghostPreviewNode = ghostPreview
    ? (() => {
      if (ghostPreview.source === WINDMILL_IMAGE) return null;

      const image = imageBySource.get(ghostPreview.source) ?? null;
      if (!image) return null;
      return (
        <SkiaImage
          image={image}
          fit="contain"
          x={ghostPreview.left}
          y={ghostPreview.top}
          width={ghostPreview.w}
          height={ghostPreview.h}
          opacity={0.55}
        />
      );
    })()
    : null;

  const animatedPlacedSpriteNodes = placedSprites.map((sprite) => {
    if (sprite.unit !== 'windmill') return null;

    return (
      <View
        key={`animated-${sprite.id}`}
        pointerEvents="none"
        style={[
          sceneStyles.placedSprite,
          {
            height: sprite.height,
            left: sprite.left,
            opacity: dragItem ? 0.45 : 1,
            overflow: 'hidden',
            top: sprite.top,
            width: sprite.width,
            zIndex: 100 + Math.round(sprite.sortOrder),
          },
        ]}
      >
        <RNImage
          resizeMode="contain"
          source={WINDMILL_IMAGE}
          style={{ height: sprite.height, width: sprite.width }}
        />
      </View>
    );
  });

  const animatedEnemyNodes = enemies.map((enemy) => {
    const { left, size, top } = getEnemySpritePosition(enemy, boardCenterX);

    return (
      <View
        key={`animated-${enemy.id}`}
        pointerEvents="none"
        style={[
          sceneStyles.placedSprite,
          {
            height: size,
            left,
            opacity: dragItem ? 0.5 : 1,
            overflow: 'hidden',
            top,
            width: size,
            zIndex: 360 + Math.floor((enemy.row + enemy.col) * 10),
          },
        ]}
      >
        <RNImage
          resizeMode="contain"
          source={enemy.variant === 'snow' ? IJOM_SNOW_GIF_IMAGE : IJOM_GIF_IMAGE}
          style={{ height: size, width: size }}
        />
      </View>
    );
  });

  const windmillGhostPreview = ghostPreview?.source === WINDMILL_IMAGE ? ghostPreview : null;
  const animatedGhostPreviewNode =
    windmillGhostPreview ? (
      <View
        pointerEvents="none"
        style={[
          sceneStyles.placedSprite,
          {
            height: windmillGhostPreview.h,
            left: windmillGhostPreview.left,
            opacity: 0.55,
            overflow: 'hidden',
            top: windmillGhostPreview.top,
            width: windmillGhostPreview.w,
            zIndex: 500,
          },
        ]}
      >
        <RNImage
          resizeMode="contain"
          source={WINDMILL_IMAGE}
          style={{ height: windmillGhostPreview.h, width: windmillGhostPreview.w }}
        />
      </View>
    ) : null;

  return (
    <GestureDetector gesture={sceneGesture}>
      <View style={sceneStyles.sceneShell}>
        <Animated.View style={[sceneStyles.sceneTranslate, animatedBoardStyle]}>
          <Animated.View style={[sceneStyles.sceneScale, { width: boardWidth, height: boardHeight }]}>
            <View style={{ width: boardWidth, height: boardHeight }}>
              <Canvas style={StyleSheet.absoluteFill}>
                {placedSpriteNodes}
                {projectileNodes}
                {enemyHpNodes}
                {ghostPreviewNode}
              </Canvas>
              {animatedPlacedSpriteNodes}
              {animatedEnemyNodes}
              {animatedGhostPreviewNode}
              {children}
            </View>
          </Animated.View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
