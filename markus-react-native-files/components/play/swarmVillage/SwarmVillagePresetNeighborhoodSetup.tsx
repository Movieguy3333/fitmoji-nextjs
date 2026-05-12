import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getNeighborhoodSetupDecisionKey,
  isNeighborhoodSelectionComplete,
  NEIGHBORHOOD_SELECTION_COMPLETE_VALUE,
  saveNeighborhoodSeedFile,
  type NeighborhoodPoiKind,
  type NeighborhoodSeedFoundation,
  type NeighborhoodSeedTemplate,
} from '@/lib/game/swarmVillageNeighborhood';
import {
  SWARM_VILLAGE_NEIGHBORHOOD_PRESETS
} from '@/lib/game/swarmVillageNeighborhoodPresets';

type SwarmVillagePresetNeighborhoodSetupProps = {
  enabled: boolean;
  forceVisibleToken?: number;
  onApply: (seed: NeighborhoodSeedTemplate) => Promise<void> | void;
  onSelectionApplied?: () => void;
  onVisibilityChange?: (visible: boolean) => void;
  userId?: string | null;
};

type BootState = 'checking' | 'hidden' | 'visible';
type SetupStep = 'intro' | 'choose';

const STEP_ORDER: SetupStep[] = ['intro', 'choose'];
const HOME_BASE_IMAGE = require('@/assets/images/quest/starter_house.png');
const TINY_HOUSE_IMAGE = require('@/assets/images/quest/tiny_house.png');
const GRASS_TILE_IMAGE = require('@/assets/images/quest/grass_tile.webp');
const GRASS_TILE_PATH_A_IMAGE = require('@/assets/images/quest/grass_tile_path_a.webp');
const GRASS_TILE_PATH_B_IMAGE = require('@/assets/images/quest/grass_tile_path_b.webp');
const GRASS_TILE_PATH_C_IMAGE = require('@/assets/images/quest/grass_tile_path_c.webp');
const GRASS_TILE_PATH_D_IMAGE = require('@/assets/images/quest/grass_tile_path_d.webp');
const GRASS_TILE_PATH_E_IMAGE = require('@/assets/images/quest/grass_tile_path_e.webp');
const GRASS_TILE_PATH_F_IMAGE = require('@/assets/images/quest/grass_tile_path_f.webp');
const GRASS_TILE_PATH_G_IMAGE = require('@/assets/images/quest/grass_tile_path_g.webp');
const GRASS_TILE_PATH_H_IMAGE = require('@/assets/images/quest/grass_tile_path_h.webp');
const GRASS_TILE_PATH_I_IMAGE = require('@/assets/images/quest/grass_tile_path_i.webp');
const GRASS_TILE_PATH_J_IMAGE = require('@/assets/images/quest/grass_tile_path_j.webp');
const HOUSE_SPRITE_OFFSET_X = 0;
const HOUSE_SPRITE_OFFSET_Y = 30;

const STEP_COPY: Record<SetupStep, { title: string; body: string }> = {
  intro: {
    title: 'Pick a neighborhood style',
    body: 'Choose the pre-made map that feels the most like your own block. You need to activate one before you can start playing the village.',
  },
  choose: {
    title: 'Select Your Neighborhood',
    body: 'Swipe through the neighborhood cards and activate the one that feels closest to home.',
  },
};

const FOUNDATION_TILE_SOURCES: Record<NeighborhoodSeedFoundation, ImageSourcePropType> = {
  grass: GRASS_TILE_IMAGE,
  grass_path_a: GRASS_TILE_PATH_A_IMAGE,
  grass_path_b: GRASS_TILE_PATH_B_IMAGE,
  grass_path_c: GRASS_TILE_PATH_C_IMAGE,
  grass_path_d: GRASS_TILE_PATH_D_IMAGE,
  grass_path_e: GRASS_TILE_PATH_E_IMAGE,
  grass_path_f: GRASS_TILE_PATH_F_IMAGE,
  grass_path_g: GRASS_TILE_PATH_G_IMAGE,
  grass_path_h: GRASS_TILE_PATH_H_IMAGE,
  grass_path_i: GRASS_TILE_PATH_I_IMAGE,
  grass_path_j: GRASS_TILE_PATH_J_IMAGE,
};

const poiGlyphForKind = (kind: NeighborhoodPoiKind) => {
  if (kind === 'home') return 'H';
  if (kind === 'neighbor_house') return 'N';
  if (kind === 'park') return 'P';
  if (kind === 'school') return 'S';
  if (kind === 'library') return 'L';
  return 'C';
};

const poiColorForKind = (kind: NeighborhoodPoiKind) => {
  if (kind === 'home') return '#fbbf24';
  if (kind === 'neighbor_house') return '#f59e0b';
  if (kind === 'park') return '#22c55e';
  if (kind === 'school') return '#60a5fa';
  if (kind === 'library') return '#c084fc';
  return '#fb7185';
};

function StepProgress({ currentStep }: { currentStep: SetupStep }) {
  const currentIndex = STEP_ORDER.indexOf(currentStep);

  return (
    <View style={styles.progressRow}>
      {STEP_ORDER.map((step, index) => {
        const isActive = index === currentIndex;
        const isComplete = index < currentIndex;
        return (
          <React.Fragment key={step}>
            <View
              style={[
                styles.progressDot,
                isComplete && styles.progressDotComplete,
                isActive && styles.progressDotActive,
              ]}
            />
            {index < STEP_ORDER.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  index < currentIndex && styles.progressLineComplete,
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function GameTilePreview({
  seed,
  compact = false,
  maxViewportWidth,
}: {
  compact?: boolean;
  maxViewportWidth?: number;
  seed: NeighborhoodSeedTemplate;
}) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const tileWidth = 74;
  const tileHeight = 38;
  const houseSpriteWidth = 90;
  const houseSpriteHeight = 90;
  const halfW = tileWidth / 2;
  const halfH = tileHeight / 2;
  const boardTopInset = 96;
  const castleSpriteMinWidth = 112;
  const castleSpriteOffsetY = -40;
  const visibleFoundations = seed.foundations.filter((cell) => cell.col < seed.initialGridCols);
  const visibleHousePois = seed.notablePlaces.filter(
    (poi) => poi.inInitialBounds && poi.kind === 'neighbor_house',
  );
  const visiblePois = seed.notablePlaces.filter(
    (poi) => poi.inInitialBounds && poi.kind !== 'home' && poi.kind !== 'neighbor_house',
  );
  const boardWidth = (seed.rows + seed.initialGridCols) * halfW + tileWidth;
  const boardCenterX = boardWidth / 2;
  const availableViewportWidth = maxViewportWidth ?? (compact ? windowWidth - 88 : windowWidth - 64);
  const viewportWidth = compact
    ? Math.min(availableViewportWidth, 336)
    : Math.min(availableViewportWidth, 420);
  const viewportHeight = compact
    ? Math.max(230, Math.min(292, Math.floor(windowHeight * 0.28)))
    : Math.max(300, Math.min(420, Math.floor(windowHeight * 0.36)));
  const previewScale = compact
    ? Math.min(0.46, Math.max(0.35, viewportWidth / 820))
    : Math.min(0.52, Math.max(0.42, viewportWidth / 720));

  const isoPosition = (row: number, col: number, elevation = 0) => ({
    left: boardCenterX + (col - row) * halfW - halfW,
    top: boardTopInset + (col + row) * halfH - elevation * 28,
  });

  const getHouseSpritePosition = (left: number, top: number) => ({
    left: left + (tileWidth - houseSpriteWidth) / 2 + HOUSE_SPRITE_OFFSET_X,
    top: top + tileHeight - houseSpriteHeight + HOUSE_SPRITE_OFFSET_Y,
  });

  const sceneOffsetX = viewportWidth / 2 - boardCenterX * previewScale;
  const sceneOffsetY = 14 - boardTopInset * previewScale;

  let minL = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  for (let row = seed.homeFootprint.rowMin; row <= seed.homeFootprint.rowMax; row += 1) {
    for (let col = seed.homeFootprint.colMin; col <= seed.homeFootprint.colMax; col += 1) {
      const position = isoPosition(row, col);
      const left = position.left + 2;
      const right = position.left + tileWidth - 2;
      const bottom = position.top + 46;
      minL = Math.min(minL, left);
      maxR = Math.max(maxR, right);
      maxB = Math.max(maxB, bottom);
    }
  }

  const footprintWidth = maxR - minL;
  const castleWidth = Math.max(castleSpriteMinWidth, footprintWidth);
  const castleHeight = castleWidth * (198 / 230);
  const castleCenterX = (minL + maxR) / 2 - footprintWidth * 0.045;
  const castleLeft = castleCenterX - castleWidth / 2;
  const castleTop = maxB - castleHeight * 0.86 + castleSpriteOffsetY;

  return (
    <View style={[styles.gamePreviewCard, compact && styles.gamePreviewCardCompact]}>
      <View style={[styles.gamePreviewViewport, { height: viewportHeight }]}>
        <View
          pointerEvents="none"
          style={[
            styles.gamePreviewShadow,
            {
              left: sceneOffsetX + boardWidth * 0.16 * previewScale,
              top: sceneOffsetY + (boardTopInset + (seed.rows + seed.initialGridCols) * halfH + 124) * previewScale,
              width: boardWidth * 0.68 * previewScale,
            },
          ]}
        />

        {visibleFoundations.map((cell) => (
          <Image
            key={`${cell.row}:${cell.col}`}
            source={FOUNDATION_TILE_SOURCES[cell.foundation]}
            resizeMode="contain"
            style={[
              styles.gameTile,
              {
                height: 48 * previewScale,
                left: sceneOffsetX + (isoPosition(cell.row, cell.col).left + 2) * previewScale,
                top: sceneOffsetY + (isoPosition(cell.row, cell.col).top - 2) * previewScale,
                width: (tileWidth - 4) * previewScale,
                zIndex: 80 + cell.row + cell.col,
              },
            ]}
          />
        ))}

        <Image
          source={HOME_BASE_IMAGE}
          resizeMode="contain"
          style={[
            styles.gameCastle,
            {
              height: castleHeight * previewScale,
              left: sceneOffsetX + castleLeft * previewScale,
              top: sceneOffsetY + castleTop * previewScale,
              width: castleWidth * previewScale,
              zIndex: 200,
            },
          ]}
        />

        {visibleHousePois.map((poi) => {
          const position = isoPosition(poi.row, poi.col, 1);
          const housePosition = getHouseSpritePosition(position.left, position.top);
          return (
            <Image
              key={poi.id}
              source={TINY_HOUSE_IMAGE}
              resizeMode="contain"
              style={[
                styles.gameCastle,
                {
                  height: houseSpriteHeight * previewScale,
                  left: sceneOffsetX + housePosition.left * previewScale,
                  top: sceneOffsetY + housePosition.top * previewScale,
                  transform: poi.flipHorizontal ? [{ scaleX: -1 }] : undefined,
                  width: houseSpriteWidth * previewScale,
                  zIndex: 190 + poi.row + poi.col,
                },
              ]}
            />
          );
        })}

        {visiblePois.map((poi) => (
          <View
            key={poi.id}
            style={[
              styles.gamePoiChip,
              {
                backgroundColor: poiColorForKind(poi.kind),
                left: sceneOffsetX + (isoPosition(poi.row, poi.col).left + tileWidth / 2) * previewScale - 10,
                top: sceneOffsetY + (isoPosition(poi.row, poi.col).top + tileHeight * 0.48) * previewScale - 10,
                zIndex: 220 + poi.row + poi.col,
              },
            ]}
          >
            <Text style={styles.gamePoiChipText}>{poiGlyphForKind(poi.kind)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function SwarmVillagePresetNeighborhoodSetup({
  enabled,
  forceVisibleToken = 0,
  onApply,
  onSelectionApplied,
  onVisibilityChange,
  userId,
}: SwarmVillagePresetNeighborhoodSetupProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const presetScrollRef = useRef<ScrollView | null>(null);
  const [bootState, setBootState] = useState<BootState>('checking');
  const [currentStep, setCurrentStep] = useState<SetupStep>('intro');
  const [selectedPresetId, setSelectedPresetId] = useState(SWARM_VILLAGE_NEIGHBORHOOD_PRESETS[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const decisionKey = useMemo(() => getNeighborhoodSetupDecisionKey(userId), [userId]);
  const selectedPreset =
    SWARM_VILLAGE_NEIGHBORHOOD_PRESETS.find((preset) => preset.id === selectedPresetId) ??
    SWARM_VILLAGE_NEIGHBORHOOD_PRESETS[0];
  const selectedPresetIndex = Math.max(
    0,
    SWARM_VILLAGE_NEIGHBORHOOD_PRESETS.findIndex((preset) => preset.id === selectedPreset?.id),
  );
  const stepIndex = STEP_ORDER.indexOf(currentStep) + 1;
  const stepMeta = STEP_COPY[currentStep];
  const presetCardWidth = Math.min(windowWidth - 64, 340);
  const presetCardGap = 14;
  const presetSnapInterval = presetCardWidth + presetCardGap;

  const resetFlow = useCallback(() => {
    setCurrentStep('intro');
    setSelectedPresetId(SWARM_VILLAGE_NEIGHBORHOOD_PRESETS[0]?.id ?? '');
    setSaving(false);
    setErrorMessage(null);
    requestAnimationFrame(() => {
      presetScrollRef.current?.scrollTo({ x: 0, animated: false });
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setBootState('hidden');
      return;
    }

    let cancelled = false;
    setBootState('checking');
    resetFlow();

    AsyncStorage.getItem(decisionKey)
      .then((value) => {
        if (cancelled) return;
        setBootState(isNeighborhoodSelectionComplete(value) ? 'hidden' : 'visible');
      })
      .catch(() => {
        if (!cancelled) setBootState('visible');
      });

    return () => {
      cancelled = true;
    };
  }, [decisionKey, enabled, resetFlow]);

  useEffect(() => {
    if (!enabled || forceVisibleToken <= 0) return;
    resetFlow();
    setBootState('visible');
  }, [enabled, forceVisibleToken, resetFlow]);

  useEffect(() => {
    onVisibilityChange?.(enabled && bootState === 'visible');
  }, [bootState, enabled, onVisibilityChange]);

  useEffect(() => {
    if (currentStep !== 'choose') return;
    requestAnimationFrame(() => {
      presetScrollRef.current?.scrollTo({
        x: selectedPresetIndex * presetSnapInterval,
        animated: false,
      });
    });
  }, [currentStep, presetSnapInterval, selectedPresetIndex]);

  const handlePresetSnap = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / presetSnapInterval);
      const boundedIndex = Math.max(
        0,
        Math.min(index, SWARM_VILLAGE_NEIGHBORHOOD_PRESETS.length - 1),
      );
      const nextPreset = SWARM_VILLAGE_NEIGHBORHOOD_PRESETS[boundedIndex];
      if (nextPreset && nextPreset.id !== selectedPresetId) {
        setSelectedPresetId(nextPreset.id);
      }
    },
    [presetSnapInterval, selectedPresetId],
  );

  const handleSelectPreset = useCallback(
    (presetId: string, index: number) => {
      setSelectedPresetId(presetId);
      presetScrollRef.current?.scrollTo({
        x: index * presetSnapInterval,
        animated: true,
      });
    },
    [presetSnapInterval],
  );

  const handleApply = useCallback(async () => {
    if (!selectedPreset || saving) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      try {
        await saveNeighborhoodSeedFile(selectedPreset.seed, userId);
      } catch {
        // Keep setup flowing even if the JSON export fails.
      }

      await onApply(selectedPreset.seed);
      await AsyncStorage.setItem(decisionKey, NEIGHBORHOOD_SELECTION_COMPLETE_VALUE);
      setBootState('hidden');
      onSelectionApplied?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Could not apply this neighborhood.',
      );
    } finally {
      setSaving(false);
    }
  }, [decisionKey, onApply, onSelectionApplied, saving, selectedPreset, userId]);

  if (!enabled || bootState !== 'visible' || !selectedPreset) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <View style={styles.backdrop} />
      <View
        style={[
          styles.sheet,
          {
            paddingBottom: Math.max(18, insets.bottom + 8),
            paddingTop: Math.max(14, insets.top + 2),
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerCopyWrap}>
            <Text style={styles.eyebrow}>Neighborhood Setup</Text>
            <Text style={styles.headerTitle}>{stepMeta.title}</Text>
            <Text style={styles.stepLabel}>Step {stepIndex} of {STEP_ORDER.length}</Text>
          </View>
        </View>

        <StepProgress currentStep={currentStep} />

        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.copy}>{stepMeta.body}</Text>

          {currentStep === 'intro' && (
            <View style={styles.introCard}>
              <Text style={styles.introTitle}>Four starter neighborhoods</Text>
              <Text style={styles.introBody}>
                Swipe through a small set of hand-built neighborhoods and pick the one that feels
                closest to your own block.
              </Text>
              <Text style={styles.introMeta}>
                This only sets your starting village layout. Everything else still works the same.
              </Text>
            </View>
          )}

          {currentStep === 'choose' && (
            <View style={styles.carouselSection}>
              <ScrollView
                ref={presetScrollRef}
                horizontal
                decelerationRate="fast"
                disableIntervalMomentum
                onMomentumScrollEnd={handlePresetSnap}
                showsHorizontalScrollIndicator={false}
                snapToAlignment="start"
                snapToInterval={presetSnapInterval}
                contentContainerStyle={[
                  styles.carouselContent,
                  { paddingRight: Math.max(18, windowWidth - presetCardWidth - 36) },
                ]}
              >
                {SWARM_VILLAGE_NEIGHBORHOOD_PRESETS.map((preset, index) => {
                  const isSelected = preset.id === selectedPreset.id;
                  return (
                    <Pressable
                      key={preset.id}
                      onPress={() => handleSelectPreset(preset.id, index)}
                      style={[
                        styles.renderCard,
                        { marginRight: index === SWARM_VILLAGE_NEIGHBORHOOD_PRESETS.length - 1 ? 0 : presetCardGap, width: presetCardWidth },
                        isSelected && styles.renderCardSelected,
                      ]}
                    >
                      <View style={styles.renderCardHeader}>
                        <View style={styles.renderCardHeaderCopy}>
                          <Text style={styles.renderCardTitle}>{preset.title}</Text>
                          <Text style={styles.renderCardSubtitle}>{preset.subtitle}</Text>
                        </View>
                      </View>

                      <GameTilePreview
                        compact
                        maxViewportWidth={presetCardWidth - 24}
                        seed={preset.seed}
                      />

                      <Text style={styles.renderCardDescription}>{preset.description}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.carouselDots}>
                {SWARM_VILLAGE_NEIGHBORHOOD_PRESETS.map((preset) => {
                  const isSelected = preset.id === selectedPreset.id;
                  return (
                    <View
                      key={preset.id}
                      style={[styles.carouselDot, isSelected && styles.carouselDotActive]}
                    />
                  );
                })}
              </View>
            </View>
          )}

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <View style={styles.actionRow}>
            {currentStep !== 'intro' && (
              <Pressable
                onPress={() =>
                  setCurrentStep(STEP_ORDER[Math.max(0, STEP_ORDER.indexOf(currentStep) - 1)]!)
                }
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
            )}

            {currentStep === 'intro' && (
              <Pressable onPress={() => setCurrentStep('choose')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>See Neighborhood Cards</Text>
              </Pressable>
            )}

            {currentStep === 'choose' && (
              <Pressable
                disabled={saving}
                onPress={() => void handleApply()}
                style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Activating...' : 'Activate'}
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3, 7, 18, 0.84)',
  },
  carouselCaption: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  carouselContent: {
    paddingLeft: 2,
    paddingTop: 2,
  },
  carouselDot: {
    backgroundColor: 'rgba(148, 163, 184, 0.26)',
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  carouselDotActive: {
    backgroundColor: '#38bdf8',
    width: 24,
  },
  carouselDots: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 14,
  },
  carouselSection: {
    marginTop: 18,
  },
  copy: {
    color: '#bfdbfe',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 16,
  },
  errorText: {
    color: '#fda4af',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  eyebrow: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  gameCastle: {
    position: 'absolute',
  },
  gamePoiChip: {
    alignItems: 'center',
    borderColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 10,
    borderWidth: 2,
    height: 20,
    justifyContent: 'center',
    position: 'absolute',
    width: 20,
  },
  gamePoiChipText: {
    color: '#020617',
    fontSize: 11,
    fontWeight: '800',
  },
  gamePreviewCard: {
    backgroundColor: 'rgba(11, 17, 34, 0.78)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    overflow: 'hidden',
    padding: 12,
  },
  gamePreviewCardCompact: {
    marginTop: 12,
    padding: 10,
  },
  gamePreviewShadow: {
    backgroundColor: 'rgba(2, 6, 23, 0.18)',
    borderRadius: 999,
    height: 24,
    position: 'absolute',
  },
  gamePreviewViewport: {
    backgroundColor: '#0a1323',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    width: '100%',
  },
  gameTile: {
    position: 'absolute',
  },
  headerCopyWrap: {
    flex: 1,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
    lineHeight: 31,
    marginTop: 10,
    paddingRight: 10,
  },
  introBody: {
    color: '#dbeafe',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  introCard: {
    backgroundColor: 'rgba(11, 17, 34, 0.78)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  introMeta: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  introTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  optionCard: {
    backgroundColor: 'rgba(11, 17, 34, 0.78)',
    borderColor: 'rgba(148, 163, 184, 0.16)',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    width: '48%',
  },
  optionCardSelected: {
    borderColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  optionDescription: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 18,
  },
  optionSubtitle: {
    color: '#bfdbfe',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  optionTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1800,
  },
  activeBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.14)',
    borderColor: 'rgba(56, 189, 248, 0.45)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  activeBadgeText: {
    color: '#7dd3fc',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  previewBoard: {
    backgroundColor: '#122033',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewBoardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  previewCard: {
    backgroundColor: 'rgba(11, 17, 34, 0.78)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  previewCardCompact: {
    marginTop: 10,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  previewCell: {
    borderRadius: 3,
    position: 'absolute',
  },
  previewHomeOutline: {
    borderColor: '#fbbf24',
    borderRadius: 8,
    borderWidth: 2,
    position: 'absolute',
  },
  previewInitialBounds: {
    borderColor: 'rgba(125, 211, 252, 0.86)',
    borderRadius: 14,
    borderWidth: 2,
    left: -2,
    position: 'absolute',
    top: -2,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0ea5e9',
    borderRadius: 16,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButtonDisabled: {
    backgroundColor: 'rgba(14, 165, 233, 0.38)',
  },
  primaryButtonText: {
    color: '#eff6ff',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  renderCard: {
    backgroundColor: 'rgba(11, 17, 34, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 16,
  },
  renderCardDescription: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  renderCardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  renderCardHeaderCopy: {
    flex: 1,
  },
  renderCardSelected: {
    borderColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  renderCardSubtitle: {
    color: '#bfdbfe',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  renderCardTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  progressDot: {
    backgroundColor: 'rgba(148, 163, 184, 0.28)',
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  progressDotActive: {
    backgroundColor: '#f8fafc',
    height: 12,
    width: 12,
  },
  progressDotComplete: {
    backgroundColor: '#38bdf8',
  },
  progressLine: {
    backgroundColor: 'rgba(148, 163, 184, 0.18)',
    flex: 1,
    height: 2,
  },
  progressLineComplete: {
    backgroundColor: 'rgba(56, 189, 248, 0.58)',
  },
  progressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  secondaryButtonText: {
    color: '#dbeafe',
    fontSize: 14,
    fontWeight: '700',
  },
  selectedSummaryCard: {
    backgroundColor: 'rgba(11, 17, 34, 0.78)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  selectedSummaryCopy: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  selectedSummarySubtitle: {
    color: '#bfdbfe',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  selectedSummaryTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  sheet: {
    backgroundColor: '#081325',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '92%',
    paddingHorizontal: 18,
  },
  sheetContent: {
    paddingBottom: 8,
  },
  stepLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
  },
  summaryCard: {
    backgroundColor: 'rgba(11, 17, 34, 0.72)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    overflow: 'hidden',
  },
  summaryLabel: {
    color: '#dbeafe',
    fontSize: 13,
    fontWeight: '700',
  },
  summaryRow: {
    borderBottomColor: 'rgba(148, 163, 184, 0.12)',
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  summaryValue: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
});
