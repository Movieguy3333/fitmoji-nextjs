import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { WebView } from 'react-native-webview';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  generateNeighborhoodSeed,
  getNeighborhoodSetupDecisionKey,
  saveNeighborhoodSeedFile,
  type NeighborhoodPoiKind,
  type NeighborhoodSeedFoundation,
  type NeighborhoodSeedTemplate,
} from '@/lib/game/swarmVillageNeighborhood';

type SwarmVillageNeighborhoodSetupProps = {
  devLocationOverride?: {
    latitude: number;
    longitude: number;
  } | null;
  enabled: boolean;
  forceVisibleToken?: number;
  onApply: (seed: NeighborhoodSeedTemplate) => Promise<void> | void;
  userId?: string | null;
};

type BootState = 'checking' | 'hidden' | 'visible';
type LoadState = 'idle' | 'requesting' | 'ready' | 'error';
type SetupStep = 'permissions' | 'location' | 'translation' | 'preview';

const STEP_ORDER: SetupStep[] = ['permissions', 'location', 'translation', 'preview'];
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

const STEP_COPY: Record<SetupStep, { title: string; body: string; shortLabel: string }> = {
  permissions: {
    title: 'Start with your real block',
    body: 'We use your current location to make the first swarm feel personal, then turn it into a playable village layout.',
    shortLabel: 'Why',
  },
  location: {
    title: 'Confirm the area',
    body: 'Check that this is the neighborhood you want to defend. Close enough is perfect.',
    shortLabel: 'Location',
  },
  translation: {
    title: 'Street map to village map',
    body: 'White road lines become village paths. Everything else stays open ground.',
    shortLabel: 'Translate',
  },
  preview: {
    title: 'Preview the real game tiles',
    body: 'This is the playable opening board. We also save the richer neighborhood JSON so later expansion can bring local places back in.',
    shortLabel: 'Preview',
  },
};

const PERMISSION_BENEFITS = [
  {
    title: 'Use your current spot once',
    body: 'We only need enough detail to shape the opening neighborhood.',
  },
  {
    title: 'Roads become village paths',
    body: 'Open land stays grassy, and your home base gets anchored near home.',
  },
  {
    title: 'Future places are remembered',
    body: 'Schools, parks, libraries, and corners get saved into expansion data.',
  },
];

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

const getBlueprintCellColor = (foundation: NeighborhoodSeedFoundation) => {
  if (foundation === 'grass') return '#2f5a34';
  if (foundation === 'grass_path_d') return '#9d9484';
  if (foundation === 'grass_path_e' || foundation === 'grass_path_f') return '#948a77';
  if (
    foundation === 'grass_path_c' ||
    foundation === 'grass_path_g' ||
    foundation === 'grass_path_h' ||
    foundation === 'grass_path_i' ||
    foundation === 'grass_path_j'
  ) {
    return '#877d6c';
  }
  if (foundation === 'grass_path_b') return '#8b8474';
  return '#938b7b';
};

const buildPreviewMapUrl = (latitude: number, longitude: number) => {
  const latDelta = 0.0003;
  const safeCos = Math.max(0.2, Math.cos((latitude * Math.PI) / 180));
  const lngDelta = latDelta / safeCos;
  const left = longitude - lngDelta;
  const bottom = latitude - latDelta;
  const right = longitude + lngDelta;
  const top = latitude + latDelta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    `${left},${bottom},${right},${top}`,
  )}&layer=mapnik`;
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

function BlueprintPreview({ seed }: { seed: NeighborhoodSeedTemplate }) {
  const cellSize = 12;
  const gap = 2;
  const boardWidth = seed.plannedGridCols * cellSize + (seed.plannedGridCols - 1) * gap;
  const boardHeight = seed.rows * cellSize + (seed.rows - 1) * gap;
  const initialWidth = seed.initialGridCols * cellSize + Math.max(0, seed.initialGridCols - 1) * gap;

  return (
    <View style={styles.previewCard}>
      <View style={[styles.previewBoardWrap, { width: boardWidth + 10, height: boardHeight + 10 }]}>
        <View style={[styles.previewBoard, { width: boardWidth, height: boardHeight }]}>
          {seed.foundations.map((cell) => {
            const left = cell.col * (cellSize + gap);
            const top = cell.row * (cellSize + gap);
            const isFutureColumn = cell.col >= seed.initialGridCols;
            return (
              <View
                key={`${cell.row}:${cell.col}`}
                style={[
                  styles.previewCell,
                  {
                    backgroundColor: getBlueprintCellColor(cell.foundation),
                    height: cellSize,
                    left,
                    opacity: isFutureColumn ? 0.4 : 1,
                    top,
                    width: cellSize,
                  },
                ]}
              />
            );
          })}

          <View
            pointerEvents="none"
            style={[
              styles.previewInitialBounds,
              {
                height: boardHeight + 4,
                width: initialWidth + 4,
              },
            ]}
          />

          <View
            pointerEvents="none"
            style={[
              styles.previewHomeOutline,
              {
                height:
                  (seed.homeFootprint.rowMax - seed.homeFootprint.rowMin + 1) * cellSize +
                  (seed.homeFootprint.rowMax - seed.homeFootprint.rowMin) * gap +
                  4,
                left: seed.homeFootprint.colMin * (cellSize + gap) - 2,
                top: seed.homeFootprint.rowMin * (cellSize + gap) - 2,
                width:
                  (seed.homeFootprint.colMax - seed.homeFootprint.colMin + 1) * cellSize +
                  (seed.homeFootprint.colMax - seed.homeFootprint.colMin) * gap +
                  4,
              },
            ]}
          />

          <View
            pointerEvents="none"
            style={[
              styles.previewFutureShade,
              {
                height: boardHeight,
                left: initialWidth + gap,
                width: Math.max(0, boardWidth - initialWidth - gap),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

function GameTilePreview({ seed }: { seed: NeighborhoodSeedTemplate }) {
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
  const viewportWidth = Math.min(windowWidth - 64, 420);
  const viewportHeight = Math.max(300, Math.min(420, Math.floor(windowHeight * 0.36)));
  const previewScale = Math.min(0.52, Math.max(0.42, viewportWidth / 720));

  const isoPosition = (row: number, col: number, elevation = 0) => ({
    left: boardCenterX + (col - row) * halfW - halfW,
    top: boardTopInset + (col + row) * halfH - elevation * 28,
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
    <View style={styles.gamePreviewCard}>
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
          return (
            <Image
              key={poi.id}
              source={TINY_HOUSE_IMAGE}
              resizeMode="contain"
              style={[
                styles.gameCastle,
                {
                  height: houseSpriteHeight * previewScale,
                  left:
                    sceneOffsetX +
                    (position.left + (tileWidth - houseSpriteWidth) / 2) * previewScale,
                  top:
                    sceneOffsetY +
                    (position.top + tileHeight - houseSpriteHeight) * previewScale,
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
                left:
                  sceneOffsetX +
                  (isoPosition(poi.row, poi.col).left + tileWidth / 2) * previewScale -
                  10,
                top:
                  sceneOffsetY +
                  (isoPosition(poi.row, poi.col).top + tileHeight * 0.48) * previewScale -
                  10,
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

export default function SwarmVillageNeighborhoodSetup({
  devLocationOverride = null,
  enabled,
  forceVisibleToken = 0,
  onApply,
  userId,
}: SwarmVillageNeighborhoodSetupProps) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [bootState, setBootState] = useState<BootState>('checking');
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [currentStep, setCurrentStep] = useState<SetupStep>('permissions');
  const [seed, setSeed] = useState<NeighborhoodSeedTemplate | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mapLoadFailed, setMapLoadFailed] = useState(false);

  const decisionKey = useMemo(() => getNeighborhoodSetupDecisionKey(userId), [userId]);
  const previewMapUrl = seed ? buildPreviewMapUrl(seed.source.latitude, seed.source.longitude) : null;
  const previewMapHeight = Math.max(320, Math.floor(windowHeight * 0.5));
  const stepIndex = STEP_ORDER.indexOf(currentStep) + 1;
  const stepMeta = STEP_COPY[currentStep];

  const resetFlow = useCallback(() => {
    setCurrentStep('permissions');
    setSeed(null);
    setLoadState('idle');
    setErrorMessage(null);
    setSaving(false);
    setMapLoadFailed(false);
  }, []);

  const loadPreview = useCallback(async () => {
    setLoadState('requesting');
    setErrorMessage(null);
    setMapLoadFailed(false);

    try {
      const overrideLatitude = __DEV__ ? devLocationOverride?.latitude ?? null : null;
      const overrideLongitude = __DEV__ ? devLocationOverride?.longitude ?? null : null;
      const hasDevLocationOverride = overrideLatitude != null && overrideLongitude != null;
      let latitude = 0;
      let longitude = 0;
      let accuracyMeters: number | null = null;

      if (hasDevLocationOverride) {
        latitude = overrideLatitude;
        longitude = overrideLongitude;
      } else {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          throw new Error('Turn on location services to build a neighborhood-inspired village.');
        }

        let permission = await Location.getForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (permission.status !== 'granted') {
          throw new Error('Location access was skipped, so the village stayed generic.');
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          mayShowUserSettingsDialog: true,
        });

        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        accuracyMeters = position.coords.accuracy ?? null;
      }

      let reverseGeocodeAddress = null;
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        const [firstAddress] = addresses;
        if (firstAddress) {
          reverseGeocodeAddress = {
            city: firstAddress.city ?? null,
            country: firstAddress.country ?? null,
            district: firstAddress.district ?? null,
            name: firstAddress.name ?? null,
            postalCode: firstAddress.postalCode ?? null,
            region: firstAddress.region ?? null,
            street: firstAddress.street ?? null,
            streetNumber: firstAddress.streetNumber ?? null,
            subregion: firstAddress.subregion ?? null,
          };
        }
      } catch {
        reverseGeocodeAddress = null;
      }

      const nextSeed = await generateNeighborhoodSeed({
        accuracyMeters,
        address: reverseGeocodeAddress,
        latitude,
        longitude,
        preferredMapProvider: Platform.OS === 'ios' ? 'apple' : 'google',
      });

      setSeed(nextSeed);
      setLoadState('ready');
      setCurrentStep('location');
    } catch (error) {
      setLoadState('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not build the neighborhood preview right now.',
      );
    }
  }, [devLocationOverride]);

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
        setBootState(value ? 'hidden' : 'visible');
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
    if (!seed && currentStep !== 'permissions') {
      setCurrentStep('permissions');
    }
  }, [currentStep, seed]);

  const handleSkip = useCallback(async () => {
    await AsyncStorage.setItem(decisionKey, 'skipped');
    setBootState('hidden');
  }, [decisionKey]);

  const handleStartPermissionStep = useCallback(() => {
    if (seed) {
      setCurrentStep('location');
      return;
    }
    void loadPreview();
  }, [loadPreview, seed]);

  const handleApply = useCallback(async () => {
    if (!seed || saving) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      try {
        await saveNeighborhoodSeedFile(seed, userId);
      } catch {
        // Keep the gameplay setup flowing even if the JSON export fails.
      }

      await onApply(seed);
      await AsyncStorage.setItem(decisionKey, 'applied');
      setBootState('hidden');
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not apply the neighborhood layout.',
      );
    } finally {
      setSaving(false);
    }
  }, [decisionKey, onApply, saving, seed, userId]);

  if (!enabled || bootState !== 'visible') {
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
            <Text style={styles.eyebrow}>Optional Neighborhood Setup</Text>
            <Text style={styles.headerTitle}>{stepMeta.title}</Text>
            <Text style={styles.stepLabel}>Step {stepIndex} of {STEP_ORDER.length}</Text>
          </View>
          <Pressable onPress={() => void handleSkip()} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Not Now</Text>
          </Pressable>
        </View>

        <StepProgress currentStep={currentStep} />

        <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.copy}>{stepMeta.body}</Text>

          {currentStep === 'permissions' && (
            <>
              <View style={styles.whyCard}>
                {PERMISSION_BENEFITS.map((benefit) => (
                  <View key={benefit.title} style={styles.whyRow}>
                    <View style={styles.whyDot} />
                    <View style={styles.whyTextWrap}>
                      <Text style={styles.whyTitle}>{benefit.title}</Text>
                      <Text style={styles.whyBody}>{benefit.body}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {loadState === 'requesting' && (
                <View style={styles.loadingCard}>
                  <ActivityIndicator color="#7dd3fc" />
                  <Text style={styles.loadingTitle}>Finding your neighborhood</Text>
                  <Text style={styles.loadingCopy}>
                    Pulling your current location and building a first-pass village seed.
                  </Text>
                </View>
              )}
            </>
          )}

          {currentStep === 'location' && seed && (
            <>
              <View style={styles.locationCard}>
                <Text style={styles.locationLabel}>{seed.source.neighborhoodLabel}</Text>
                <Text style={styles.locationMeta}>
                  {[seed.source.streetLabel, seed.source.city, seed.source.region]
                    .filter(Boolean)
                    .join(' · ') || 'Current GPS position'}
                </Text>
                {seed.source.accuracyMeters != null && (
                  <Text style={styles.locationAccuracy}>
                    GPS accuracy about {seed.source.accuracyMeters}m
                  </Text>
                )}
              </View>

              <View style={styles.mapCard}>
                {!mapLoadFailed && previewMapUrl ? (
                  <View style={styles.mapViewport}>
                    <WebView
                      bounces={false}
                      onError={() => setMapLoadFailed(true)}
                      originWhitelist={['*']}
                      scrollEnabled={false}
                      source={{ uri: previewMapUrl }}
                      style={[styles.webMap, { height: previewMapHeight }]}
                    />
                    <View pointerEvents="none" style={styles.mapPinWrap}>
                      <View style={styles.mapPinHead}>
                        <View style={styles.mapPinCenter} />
                      </View>
                      <View style={styles.mapPinStem} />
                      <View style={styles.mapPinShadow} />
                    </View>
                  </View>
                ) : (
                  <View style={styles.mapFallback}>
                    <Text style={styles.mapFallbackTitle}>Live map preview unavailable</Text>
                    <Text style={styles.mapFallbackCopy}>
                      The neighborhood seed still works, so you can keep going if the area card above
                      looks right.
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}

          {currentStep === 'translation' && seed && (
            <>
              <BlueprintPreview seed={seed} />

              <View style={styles.translationSummaryCard}>
                <View style={styles.translationSummaryRow}>
                  <View style={[styles.translationSummarySwatch, styles.translationPathSwatch]} />
                  <Text style={styles.translationSummaryText}>Road lines become path tiles</Text>
                </View>
                <View style={styles.translationSummaryRow}>
                  <View style={[styles.translationSummarySwatch, styles.translationGrassSwatch]} />
                  <Text style={styles.translationSummaryText}>Everything else stays grassy and open</Text>
                </View>
                <Text style={styles.translationSummaryMeta}>
                  Blue frame is your starting board.{' '}
                  {seed.notablePlaces.filter((poi) => poi.kind !== 'home' && poi.kind !== 'neighbor_house').length}{' '}
                  local places are saved for later expansion.
                  {seed.notablePlaces.some((poi) => poi.kind === 'neighbor_house')
                    ? ` ${seed.notablePlaces.filter((poi) => poi.kind === 'neighbor_house').length} nearby houses start on the map now.`
                    : ''}
                </Text>
              </View>
            </>
          )}

          {currentStep === 'preview' && seed && (
            <>
              <GameTilePreview seed={seed} />

              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Saves now</Text>
                  <Text style={styles.summaryValue}>Your playable starting board</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Saves for later</Text>
                  <Text style={styles.summaryValue}>Road + landmark JSON for expansion</Text>
                </View>
              </View>
            </>
          )}

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <View style={styles.actionRow}>
            {currentStep !== 'permissions' && (
              <Pressable
                onPress={() =>
                  setCurrentStep(STEP_ORDER[Math.max(0, STEP_ORDER.indexOf(currentStep) - 1)]!)
                }
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
            )}

            {currentStep === 'permissions' && (
              <Pressable
                disabled={loadState === 'requesting'}
                onPress={handleStartPermissionStep}
                style={[
                  styles.primaryButton,
                  loadState === 'requesting' && styles.primaryButtonDisabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {seed ? 'Review Location' : loadState === 'requesting' ? 'Finding Location...' : 'Continue & Use Location'}
                </Text>
              </Pressable>
            )}

            {currentStep === 'location' && seed && (
              <Pressable onPress={() => setCurrentStep('translation')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>This Looks Right</Text>
              </Pressable>
            )}

            {currentStep === 'translation' && seed && (
              <Pressable onPress={() => setCurrentStep('preview')} style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>See Game Tile Preview</Text>
              </Pressable>
            )}

            {currentStep === 'preview' && (
              <Pressable
                disabled={!seed || saving}
                onPress={() => void handleApply()}
                style={[
                  styles.primaryButton,
                  (!seed || saving) && styles.primaryButtonDisabled,
                ]}
              >
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Saving...' : 'Save This Neighborhood'}
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
  loadingCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(11, 17, 34, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 22,
  },
  loadingCopy: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  loadingTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '800',
  },
  locationAccuracy: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 6,
  },
  locationCard: {
    backgroundColor: 'rgba(12, 20, 36, 0.92)',
    borderColor: 'rgba(125, 211, 252, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  locationLabel: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
  },
  locationMeta: {
    color: '#bfdbfe',
    fontSize: 13,
    marginTop: 4,
  },
  mapCard: {
    backgroundColor: 'rgba(11, 17, 34, 0.92)',
    borderColor: 'rgba(148, 163, 184, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 14,
    overflow: 'hidden',
    padding: 12,
  },
  mapFallback: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 178,
    paddingHorizontal: 16,
  },
  mapFallbackCopy: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  mapFallbackTitle: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
  },
  mapPinCenter: {
    backgroundColor: '#eff6ff',
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  mapPinHead: {
    alignItems: 'center',
    backgroundColor: '#22c55e',
    borderColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 3,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  mapPinShadow: {
    backgroundColor: 'rgba(2, 6, 23, 0.3)',
    borderRadius: 999,
    height: 8,
    marginTop: 2,
    width: 24,
  },
  mapPinStem: {
    backgroundColor: '#16a34a',
    borderRadius: 999,
    height: 18,
    marginTop: -2,
    width: 6,
  },
  mapPinWrap: {
    alignItems: 'center',
    left: '50%',
    marginLeft: -20,
    marginTop: -50,
    position: 'absolute',
    top: '50%',
    width: 40,
  },
  mapViewport: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1800,
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
  previewCell: {
    borderRadius: 3,
    position: 'absolute',
  },
  previewFutureShade: {
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    position: 'absolute',
    right: 0,
    top: 0,
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
  skipButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  skipButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
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
  translationGrassSwatch: {
    backgroundColor: '#2f5a34',
  },
  translationPathSwatch: {
    backgroundColor: '#8f8677',
  },
  translationSummaryCard: {
    backgroundColor: 'rgba(11, 17, 34, 0.72)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  translationSummaryMeta: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  translationSummaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  translationSummarySwatch: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  translationSummaryText: {
    color: '#dbeafe',
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  webMap: {
    backgroundColor: '#0f172a',
  },
  whyBody: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  whyCard: {
    backgroundColor: 'rgba(11, 17, 34, 0.76)',
    borderColor: 'rgba(148, 163, 184, 0.18)',
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  whyDot: {
    backgroundColor: '#38bdf8',
    borderRadius: 999,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  whyRow: {
    borderBottomColor: 'rgba(148, 163, 184, 0.12)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  whyTextWrap: {
    flex: 1,
  },
  whyTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
  },
});
