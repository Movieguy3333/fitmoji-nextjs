import { trayStyles } from '@/components/play/swarmVillage/styles/tray';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';

type ToolDef = {
  cost: number;
  icon: any;
  label: string;
  tool: string;
  unlockPrizeId?: string;
};

type PanHandlers = ReturnType<typeof PanResponder.create>['panHandlers'];

type SwarmVillageWheelTrayProps = {
  availableEnergy: number;
  draftBaselineReady: boolean;
  dragActive: boolean;
  erasePanHandlers: PanHandlers;
  energyBalanceTourRef: RefObject<View | null>;
  hasUnsavedChanges: boolean;
  healEnergyCost: number;
  healPanHandlers: PanHandlers;
  insetsBottom: number;
  isSavingDraft: boolean;
  isTrayCollapsed: boolean;
  onOpenVending: () => void;
  onOpenEnergyInfo: () => void;
  onSave: () => void;
  onSelectedToolIndexChange: (index: number) => void;
  onToggleCollapsed: () => void;
  prizeMachineTourRef: RefObject<View | null>;
  selectedToolIndex: number;
  toolPanHandlersById: Record<string, PanHandlers>;
  toolTrayTourRef: RefObject<View | null>;
  tools: ToolDef[];
  vendingInventory: string[];
};

type WheelCard = {
  def: ToolDef;
  isActive: boolean;
  key: string;
  left: number;
  locked: boolean;
  opacity: number;
  scale: number;
  tilt: string;
  top: number;
  zIndex: number;
};

const SNAP_POINTS = [0, 0.56, 1];
const COLLAPSED_THRESHOLD = 0.12;
const WHEEL_CARD_RANGE = 2.7;
const WHEEL_STEP_PIXELS = 52;
const WHEEL_STEP_RADIANS = Math.PI / 7.2;
const WHEEL_VERTICAL_DRAG_FACTOR = 0.1;
const EXPANSION_DRAG_PIXELS = 210;
const CARD_WIDTH = 136;
const CARD_HEIGHT = 84;
const SPIN_STOP_VELOCITY = 0.00065;
const SPIN_FRICTION_PER_MS = 0.995;
const ACTION_ROW_HEIGHT = 112;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const normalizeBetween = (value: number, start: number, end: number) => clamp((value - start) / (end - start), 0, 1);

const getShellHeight = (progress: number) => {
  if (progress <= SNAP_POINTS[1]) {
    return lerp(86, 138, normalizeBetween(progress, 0, SNAP_POINTS[1]));
  }
  return lerp(138, 256, normalizeBetween(progress, SNAP_POINTS[1], 1));
};

export default function SwarmVillageWheelTray({
  availableEnergy,
  draftBaselineReady,
  dragActive,
  erasePanHandlers,
  energyBalanceTourRef,
  hasUnsavedChanges,
  healEnergyCost,
  healPanHandlers,
  insetsBottom,
  isSavingDraft,
  isTrayCollapsed,
  onOpenEnergyInfo,
  onOpenVending,
  onSave,
  onSelectedToolIndexChange,
  onToggleCollapsed,
  prizeMachineTourRef,
  selectedToolIndex,
  toolPanHandlersById,
  toolTrayTourRef,
  tools,
  vendingInventory,
}: SwarmVillageWheelTrayProps) {
  const maxIndex = Math.max(0, tools.length - 1);
  const [wheelWidth, setWheelWidth] = useState(320);
  const [wheelPosition, setWheelPosition] = useState(clamp(selectedToolIndex, 0, maxIndex));
  const [expansionProgress, setExpansionProgress] = useState(isTrayCollapsed ? 0 : 1);

  const wheelPositionRef = useRef(clamp(selectedToolIndex, 0, maxIndex));
  const expansionProgressRef = useRef(isTrayCollapsed ? 0 : 1);
  const spinStartRef = useRef(clamp(selectedToolIndex, 0, maxIndex));
  const expansionStartRef = useRef(isTrayCollapsed ? 0 : 1);
  const wheelAnimationFrameRef = useRef<number | null>(null);
  const expansionAnimationFrameRef = useRef<number | null>(null);
  const wheelSampleRef = useRef({ position: clamp(selectedToolIndex, 0, maxIndex), time: 0 });
  const expansionSampleRef = useRef({ progress: isTrayCollapsed ? 0 : 1, time: 0 });
  const releaseVelocityRef = useRef(0);
  const releaseExpansionVelocityRef = useRef(0);
  const gestureModeRef = useRef<'idle' | 'spin' | 'expand'>('idle');
  const lastCollapsedPropRef = useRef(isTrayCollapsed);

  const stopWheelAnimation = useCallback(() => {
    if (wheelAnimationFrameRef.current != null) {
      cancelAnimationFrame(wheelAnimationFrameRef.current);
      wheelAnimationFrameRef.current = null;
    }
  }, []);

  const stopExpansionAnimation = useCallback(() => {
    if (expansionAnimationFrameRef.current != null) {
      cancelAnimationFrame(expansionAnimationFrameRef.current);
      expansionAnimationFrameRef.current = null;
    }
  }, []);

  const syncWheelPosition = useCallback(
    (nextPosition: number) => {
      const clampedPosition = clamp(nextPosition, 0, maxIndex);
      wheelPositionRef.current = clampedPosition;
      setWheelPosition(clampedPosition);
      return clampedPosition;
    },
    [maxIndex],
  );

  const syncExpansionProgress = useCallback((nextProgress: number) => {
    const clampedProgress = clamp(nextProgress, 0, 1);
    expansionProgressRef.current = clampedProgress;
    setExpansionProgress(clampedProgress);
    return clampedProgress;
  }, []);

  const animateWheelToPosition = useCallback(
    (targetPosition: number) => {
      stopWheelAnimation();

      const from = wheelPositionRef.current;
      const to = clamp(targetPosition, 0, maxIndex);

      if (Math.abs(to - from) < 0.001) {
        syncWheelPosition(to);
        if (to !== selectedToolIndex) onSelectedToolIndexChange(to);
        return;
      }

      let startTime: number | null = null;
      const durationMs = 220;

      const step = (timestamp: number) => {
        if (startTime == null) startTime = timestamp;
        const t = Math.min(1, (timestamp - startTime) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        syncWheelPosition(from + (to - from) * eased);

        if (t < 1) {
          wheelAnimationFrameRef.current = requestAnimationFrame(step);
          return;
        }

        wheelAnimationFrameRef.current = null;
        syncWheelPosition(to);
        if (to !== selectedToolIndex) onSelectedToolIndexChange(to);
      };

      wheelAnimationFrameRef.current = requestAnimationFrame(step);
    },
    [maxIndex, onSelectedToolIndexChange, selectedToolIndex, stopWheelAnimation, syncWheelPosition],
  );

  const animateExpansionTo = useCallback(
    (targetProgress: number) => {
      stopExpansionAnimation();

      const from = expansionProgressRef.current;
      const to = clamp(targetProgress, 0, 1);

      if (Math.abs(to - from) < 0.001) {
        syncExpansionProgress(to);
        return;
      }

      let startTime: number | null = null;
      const durationMs = 240;

      const step = (timestamp: number) => {
        if (startTime == null) startTime = timestamp;
        const t = Math.min(1, (timestamp - startTime) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3);
        syncExpansionProgress(from + (to - from) * eased);

        if (t < 1) {
          expansionAnimationFrameRef.current = requestAnimationFrame(step);
          return;
        }

        expansionAnimationFrameRef.current = null;
        syncExpansionProgress(to);
      };

      expansionAnimationFrameRef.current = requestAnimationFrame(step);
    },
    [stopExpansionAnimation, syncExpansionProgress],
  );

  const finishSpin = useCallback(
    (nextPosition: number) => {
      animateWheelToPosition(Math.round(nextPosition));
    },
    [animateWheelToPosition],
  );

  const startDecay = useCallback(
    (initialVelocity: number) => {
      if (Math.abs(initialVelocity) < SPIN_STOP_VELOCITY) {
        finishSpin(wheelPositionRef.current);
        return;
      }

      stopWheelAnimation();

      let velocity = initialVelocity;
      let lastTimestamp: number | null = null;

      const step = (timestamp: number) => {
        if (lastTimestamp == null) lastTimestamp = timestamp;
        const elapsed = Math.min(32, Math.max(12, timestamp - lastTimestamp));
        lastTimestamp = timestamp;

        const nextPosition = clamp(wheelPositionRef.current + velocity * elapsed, 0, maxIndex);
        const atEdge = nextPosition <= 0.001 || nextPosition >= maxIndex - 0.001;
        syncWheelPosition(nextPosition);

        velocity *= Math.pow(SPIN_FRICTION_PER_MS, elapsed);
        if (atEdge) velocity *= 0.68;

        if (Math.abs(velocity) < SPIN_STOP_VELOCITY) {
          wheelAnimationFrameRef.current = null;
          finishSpin(nextPosition);
          return;
        }

        wheelAnimationFrameRef.current = requestAnimationFrame(step);
      };

      wheelAnimationFrameRef.current = requestAnimationFrame(step);
    },
    [finishSpin, maxIndex, stopWheelAnimation, syncWheelPosition],
  );

  useEffect(() => {
    stopWheelAnimation();
    syncWheelPosition(selectedToolIndex);
  }, [selectedToolIndex, stopWheelAnimation, syncWheelPosition]);

  useEffect(() => {
    if (lastCollapsedPropRef.current === isTrayCollapsed) return;
    lastCollapsedPropRef.current = isTrayCollapsed;
    animateExpansionTo(isTrayCollapsed ? 0 : 1);
  }, [animateExpansionTo, isTrayCollapsed]);

  useEffect(
    () => () => {
      stopWheelAnimation();
      stopExpansionAnimation();
    },
    [stopExpansionAnimation, stopWheelAnimation],
  );

  const interactionResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          !dragActive &&
          (Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6),
        onPanResponderGrant: (evt) => {
          stopWheelAnimation();
          stopExpansionAnimation();
          gestureModeRef.current = 'idle';
          spinStartRef.current = wheelPositionRef.current;
          expansionStartRef.current = expansionProgressRef.current;
          releaseVelocityRef.current = 0;
          releaseExpansionVelocityRef.current = 0;
          wheelSampleRef.current = {
            position: wheelPositionRef.current,
            time: evt.nativeEvent.timestamp,
          };
          expansionSampleRef.current = {
            progress: expansionProgressRef.current,
            time: evt.nativeEvent.timestamp,
          };
        },
        onPanResponderMove: (evt, gesture) => {
          if (gestureModeRef.current === 'idle') {
            if (Math.abs(gesture.dy) > Math.abs(gesture.dx) + 8) gestureModeRef.current = 'expand';
            else if (Math.abs(gesture.dx) > Math.abs(gesture.dy) + 8) gestureModeRef.current = 'spin';
            else return;
          }

          if (gestureModeRef.current === 'expand') {
            const nextProgress = clamp(expansionStartRef.current - gesture.dy / EXPANSION_DRAG_PIXELS, 0, 1);
            const prevSample = expansionSampleRef.current;
            const nextTime = evt.nativeEvent.timestamp;
            const elapsed = nextTime - prevSample.time;

            syncExpansionProgress(nextProgress);

            if (elapsed > 0) {
              releaseExpansionVelocityRef.current = (nextProgress - prevSample.progress) / elapsed;
            }

            expansionSampleRef.current = {
              progress: nextProgress,
              time: nextTime,
            };
            return;
          }

          if (expansionProgressRef.current <= 0.1) return;

          const dragDistance = gesture.dx + gesture.dy * WHEEL_VERTICAL_DRAG_FACTOR;
          const nextPosition = clamp(spinStartRef.current - dragDistance / WHEEL_STEP_PIXELS, 0, maxIndex);
          const prevSample = wheelSampleRef.current;
          const nextTime = evt.nativeEvent.timestamp;
          const elapsed = nextTime - prevSample.time;

          syncWheelPosition(nextPosition);

          if (elapsed > 0) {
            releaseVelocityRef.current = (nextPosition - prevSample.position) / elapsed;
          }

          wheelSampleRef.current = {
            position: nextPosition,
            time: nextTime,
          };
        },
        onPanResponderRelease: () => {
          if (gestureModeRef.current === 'expand') {
            const projected = clamp(
              expansionProgressRef.current + releaseExpansionVelocityRef.current * 160,
              0,
              1,
            );
            const target = SNAP_POINTS.reduce(
              (nearest, point) => (Math.abs(point - projected) < Math.abs(nearest - projected) ? point : nearest),
              SNAP_POINTS[0],
            );
            animateExpansionTo(target);
            if (target === 0 && !isTrayCollapsed) onToggleCollapsed();
            if (target === 1 && isTrayCollapsed) onToggleCollapsed();
          } else if (gestureModeRef.current === 'spin') {
            startDecay(releaseVelocityRef.current);
          }
          gestureModeRef.current = 'idle';
        },
        onPanResponderTerminate: () => {
          if (gestureModeRef.current === 'expand') {
            animateExpansionTo(expansionProgressRef.current);
          } else if (gestureModeRef.current === 'spin') {
            finishSpin(wheelPositionRef.current);
          }
          gestureModeRef.current = 'idle';
        },
      }),
    [
      animateExpansionTo,
      dragActive,
      finishSpin,
      isTrayCollapsed,
      maxIndex,
      onToggleCollapsed,
      startDecay,
      stopExpansionAnimation,
      stopWheelAnimation,
      syncExpansionProgress,
      syncWheelPosition,
    ],
  );

  const handleToggleMenu = useCallback(() => {
    const target = expansionProgressRef.current <= COLLAPSED_THRESHOLD ? 1 : 0;
    animateExpansionTo(target);
    if (target === 0 && !isTrayCollapsed) onToggleCollapsed();
    if (target === 1 && isTrayCollapsed) onToggleCollapsed();
  }, [animateExpansionTo, isTrayCollapsed, onToggleCollapsed]);

  const activeToolIndex = clamp(Math.round(wheelPosition), 0, maxIndex);
  const activeTool = tools[activeToolIndex];
  const activeToolPanHandlers = activeTool ? toolPanHandlersById[activeTool.tool] : undefined;

  const topControlsOpacity = normalizeBetween(expansionProgress, 0.86, 1);
  const utilityRowOpacity = normalizeBetween(expansionProgress, 0.84, 1);
  const previewDockOpacity = normalizeBetween(expansionProgress, 0.26, 0.54) * (1 - utilityRowOpacity);
  const selectionOpacity = normalizeBetween(expansionProgress, 0.28, 1);
  const collapsedRimOpacity = 1 - normalizeBetween(expansionProgress, 0.18, 0.42);
  const previewRimOpacity = normalizeBetween(expansionProgress, 0.2, 0.62) * (1 - utilityRowOpacity * 0.9);
  const wheelVisibility = normalizeBetween(expansionProgress, 0.12, 0.42);

  const shellHeight = getShellHeight(expansionProgress);
  const safeBottom = Math.max(8, insetsBottom + 4);
  const utilityLift = utilityRowOpacity * (ACTION_ROW_HEIGHT + 14);
  const shellBottom = safeBottom + utilityLift;
  const shellTopControlsBottom = shellBottom + shellHeight + 10;
  const wheelViewportHeight = shellHeight - 18;
  const wheelRadius = lerp(104, Math.min(wheelWidth * 0.38, 148), expansionProgress);
  const wheelCenterY = lerp(142, 220, expansionProgress);

  const wheelCards = useMemo(
    () =>
      tools
        .map((tool, index) => {
          const delta = index - wheelPosition;
          const distance = Math.abs(delta);
          if (distance > WHEEL_CARD_RANGE) return null;

          const angle = delta * WHEEL_STEP_RADIANS;
          const centerX = wheelWidth / 2;
          const left = centerX + Math.sin(angle) * wheelRadius - CARD_WIDTH / 2;
          const top = wheelCenterY - Math.cos(angle) * wheelRadius - CARD_HEIGHT / 2;
          const scale = clamp((1.14 - distance * 0.18) * lerp(0.7, 1, expansionProgress), 0.46, 1.14);
          const locked = !!tool.unlockPrizeId && !vendingInventory.includes(tool.unlockPrizeId);
          const energyInsufficient = !locked && availableEnergy < tool.cost;
          const baseOpacity = clamp(1 - distance * 0.22, 0.14, 1) * wheelVisibility;

          return {
            def: tool,
            isActive: index === activeToolIndex,
            key: tool.tool,
            left,
            locked,
            opacity: energyInsufficient ? Math.max(0.12, baseOpacity * 0.45) : baseOpacity,
            scale,
            tilt: `${angle * 0.8}rad`,
            top,
            zIndex: 220 - Math.round(distance * 18),
          } satisfies WheelCard;
        })
        .filter((card): card is WheelCard => card !== null)
        .sort((a, b) => a.zIndex - b.zIndex),
    [
      activeToolIndex,
      availableEnergy,
      expansionProgress,
      tools,
      vendingInventory,
      wheelCenterY,
      wheelPosition,
      wheelRadius,
      wheelVisibility,
      wheelWidth,
    ],
  );

  return (
    <View style={wheelStyles.root} pointerEvents={dragActive ? 'none' : 'box-none'}>
      {topControlsOpacity > 0.05 && (
        <View
          ref={energyBalanceTourRef}
          collapsable={false}
          style={[
            wheelStyles.topControlsRow,
            {
              bottom: shellTopControlsBottom,
              opacity: topControlsOpacity,
              transform: [{ translateY: (1 - topControlsOpacity) * 10 }],
            },
          ]}
        >
          <Pressable style={[trayStyles.actionBtn, trayStyles.actionBtnSecondary, wheelStyles.topPill]} onPress={handleToggleMenu}>
            <Text style={trayStyles.actionBtnSecondaryText}>Hide</Text>
          </Pressable>
          <Pressable
            style={[trayStyles.actionBtnSecondary, wheelStyles.topPill, wheelStyles.topEnergyPill]}
            onPress={onOpenEnergyInfo}
          >
            <Text style={wheelStyles.topEnergyLabel}>Energy</Text>
            <Text style={[trayStyles.trayCalorieValue, availableEnergy < healEnergyCost && { color: '#f87171' }]}>
              ⚡ {availableEnergy.toLocaleString()}
            </Text>
          </Pressable>
        </View>
      )}

      <View
        ref={toolTrayTourRef}
        collapsable={false}
        style={[wheelStyles.shellWrap, { bottom: shellBottom, height: shellHeight }]}
      >
        <View style={wheelStyles.shell}>
          <LinearGradient
            colors={['rgba(8,22,36,0.99)', 'rgba(5,14,24,0.99)']}
            end={{ x: 0.82, y: 1 }}
            start={{ x: 0.18, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={wheelStyles.shellBorder} />

          {selectionOpacity > 0.05 && (
            <View
              style={[
                wheelStyles.counterWrap,
                {
                  opacity: selectionOpacity,
                  transform: [{ translateY: (1 - selectionOpacity) * 8 }],
                },
              ]}
              pointerEvents="none"
            >
              <View style={wheelStyles.counterPill}>
                <Text style={wheelStyles.counterText}>
                  {activeToolIndex + 1} / {tools.length}
                </Text>
              </View>
            </View>
          )}

          {previewDockOpacity > 0.05 && (
            <View
              style={[
                wheelStyles.previewDock,
                {
                  opacity: previewDockOpacity,
                  transform: [{ translateY: (1 - previewDockOpacity) * 12 }],
                },
              ]}
              pointerEvents="box-none"
            >
              <Pressable
                style={[wheelStyles.previewSaveTab, !hasUnsavedChanges && wheelStyles.previewSaveTabMuted]}
                disabled={!draftBaselineReady || isSavingDraft}
                onPress={onSave}
              >
                <Text style={wheelStyles.previewSaveText}>
                  {!draftBaselineReady ? 'Wait' : isSavingDraft ? 'Saving' : 'Save'}
                </Text>
              </Pressable>
              <View style={wheelStyles.previewMiniActions}>
                <View {...erasePanHandlers} style={wheelStyles.previewMiniAction}>
                  <Text style={wheelStyles.previewMiniActionText}>-</Text>
                </View>
                <Pressable style={[wheelStyles.previewMiniAction, wheelStyles.previewPrizeAction]} onPress={onOpenVending}>
                  <Text style={wheelStyles.previewMiniActionText}>🎰</Text>
                </Pressable>
              </View>
            </View>
          )}

          <View
            {...interactionResponder.panHandlers}
            onLayout={(event) => setWheelWidth(event.nativeEvent.layout.width)}
            style={[wheelStyles.viewport, { height: wheelViewportHeight }]}
          >
            <View
              pointerEvents="none"
              style={[
                wheelStyles.drum,
                {
                  bottom: lerp(-92, -76, expansionProgress),
                  height: lerp(210, 250, expansionProgress),
                },
              ]}
            />
            <View
              pointerEvents="none"
              style={[
                wheelStyles.innerGlow,
                {
                  bottom: lerp(-78, -54, expansionProgress),
                  top: lerp(26, 38, expansionProgress),
                },
              ]}
            />

            {selectionOpacity > 0.05 && (
              <>
                <View
                  pointerEvents="none"
                  style={[
                    wheelStyles.railTop,
                    {
                      opacity: selectionOpacity,
                      top: lerp(24, 34, expansionProgress),
                    },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    wheelStyles.railBottom,
                    {
                      opacity: selectionOpacity,
                      bottom: lerp(18, 24, expansionProgress),
                    },
                  ]}
                />
                <View
                  pointerEvents="none"
                  style={[
                    wheelStyles.selectionWindow,
                    {
                      opacity: selectionOpacity,
                      top: lerp(34, 56, expansionProgress),
                      transform: [{ scale: lerp(0.88, 1, expansionProgress) }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['rgba(230,236,241,0.98)', 'rgba(124,136,149,0.94)', 'rgba(232,238,243,0.92)']}
                    end={{ x: 1, y: 1 }}
                    start={{ x: 0, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={wheelStyles.selectionWindowInner} />
                </View>
              </>
            )}

            {wheelCards.map((card) => (
              <View
                key={card.key}
                {...(card.isActive ? activeToolPanHandlers ?? {} : {})}
                style={[
                  wheelStyles.toolItem,
                  card.isActive && wheelStyles.toolItemActive,
                  {
                    left: card.left,
                    opacity: card.opacity,
                    top: card.top,
                    transform: [{ scale: card.scale }, { rotate: card.tilt }],
                    zIndex: card.zIndex,
                  },
                ]}
              >
                <Image
                  source={card.def.icon}
                  resizeMode="contain"
                  style={[wheelStyles.toolIcon, card.isActive && wheelStyles.toolIconActive]}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    wheelStyles.toolLabel,
                    card.isActive && wheelStyles.toolLabelActive,
                    card.locked && wheelStyles.toolLabelLocked,
                  ]}
                >
                  {card.def.label}
                </Text>
                <View style={[wheelStyles.costBadge, card.locked && wheelStyles.costBadgeLocked]}>
                  {card.locked ? (
                    <>
                      <Ionicons name="lock-closed" size={10} color="#f8fbff" />
                      <Text style={wheelStyles.costBadgeText}>{card.def.cost.toLocaleString()}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={wheelStyles.costBadgeGlyph}>⚡</Text>
                      <Text style={wheelStyles.costBadgeText}>{card.def.cost.toLocaleString()}</Text>
                    </>
                  )}
                </View>
              </View>
            ))}

            {previewRimOpacity > 0.05 && (
              <View
                style={[
                  wheelStyles.previewRimOverlay,
                  {
                    opacity: previewRimOpacity,
                  },
                ]}
                pointerEvents="none"
              >
                <Text style={wheelStyles.previewRimLabel}>HIDE</Text>
                <Text style={wheelStyles.previewRimEnergy}>⚡ {availableEnergy.toLocaleString()}</Text>
              </View>
            )}

            {collapsedRimOpacity > 0.05 && (
              <View
                style={[
                  wheelStyles.collapsedRimOverlay,
                  {
                    opacity: collapsedRimOpacity,
                  },
                ]}
                pointerEvents="box-none"
              >
                <Pressable style={wheelStyles.collapsedLeftAction} onPress={handleToggleMenu}>
                  <Text style={wheelStyles.collapsedLeftText}>HIDE</Text>
                </Pressable>
                <View style={wheelStyles.collapsedHandle} />
                <Pressable style={wheelStyles.collapsedRightAction} onPress={onOpenEnergyInfo}>
                  <Text style={wheelStyles.collapsedRightText}>⚡ {availableEnergy.toLocaleString()}</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>

      {utilityRowOpacity > 0.05 && (
        <View
          style={[
            wheelStyles.utilityRowWrap,
            {
              bottom: safeBottom,
              opacity: utilityRowOpacity,
              transform: [{ translateY: (1 - utilityRowOpacity) * 16 }],
            },
          ]}
        >
          <View
            {...healPanHandlers}
            style={[
              trayStyles.healChip,
              trayStyles.utilityChip,
              wheelStyles.utilityChipCompact,
              availableEnergy < healEnergyCost && trayStyles.healChipDisabled,
            ]}
          >
            <View style={[trayStyles.utilityChipContent, wheelStyles.utilityChipContentCompact]}>
              <View style={trayStyles.healIconWrap}>
                <Text style={trayStyles.healIconEmoji}>💚</Text>
                <Text style={trayStyles.healIconStar}>✦</Text>
              </View>
            </View>
            <View style={[trayStyles.utilityChipFooter, trayStyles.healChipFooter, wheelStyles.utilityChipFooterCompact]}>
              <Text style={trayStyles.utilityChipFooterLabel}>⚡ -{healEnergyCost}</Text>
            </View>
          </View>

          <View
            {...erasePanHandlers}
            style={[trayStyles.eraseQuickChip, trayStyles.utilityChip, wheelStyles.utilityChipCompact]}
          >
            <View style={[trayStyles.utilityChipContent, wheelStyles.utilityChipContentCompact]}>
              <Text style={trayStyles.eraseQuickGlyph}>-</Text>
            </View>
            <View style={[trayStyles.utilityChipFooter, trayStyles.eraseQuickChipFooter, wheelStyles.utilityChipFooterCompact]}>
              <Text style={trayStyles.utilityChipFooterLabel}>50% undo</Text>
            </View>
          </View>

          <View ref={prizeMachineTourRef} collapsable={false} style={trayStyles.utilityChipTourWrap}>
            <Pressable style={[trayStyles.prizeChip, trayStyles.utilityChip, wheelStyles.utilityChipCompact]} onPress={onOpenVending}>
              <View style={[trayStyles.utilityChipContent, wheelStyles.utilityChipContentCompact]}>
                <Text style={trayStyles.prizeChipGlyph}>🎰</Text>
              </View>
              <View style={[trayStyles.utilityChipFooter, trayStyles.prizeChipFooter, wheelStyles.utilityChipFooterCompact]}>
                <Text style={trayStyles.utilityChipFooterLabel}>Open</Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            style={[
              trayStyles.saveChip,
              trayStyles.utilityChip,
              wheelStyles.utilityChipCompact,
              !hasUnsavedChanges && trayStyles.saveChipSaved,
              isSavingDraft && trayStyles.saveChipBusy,
            ]}
            disabled={!draftBaselineReady || isSavingDraft}
            onPress={onSave}
          >
            <View style={[trayStyles.utilityChipContent, wheelStyles.utilityChipContentCompact]}>
              <Ionicons name="checkmark-circle" size={20} color="#3b82f6" style={{ marginBottom: 4 }} />
            </View>
            <View style={[trayStyles.utilityChipFooter, trayStyles.saveChipFooter, wheelStyles.utilityChipFooterCompact]}>
              <Text style={trayStyles.utilityChipFooterLabel}>
                {!draftBaselineReady ? 'Wait' : isSavingDraft ? 'Saving' : 'Save'}
              </Text>
            </View>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  collapsedHandle: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: 999,
    height: 8,
    marginTop: 30,
    width: 136,
  },
  collapsedLeftAction: {
    left: 20,
    position: 'absolute',
    top: 12,
  },
  collapsedLeftText: {
    color: '#f8fbff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.8,
    transform: [{ rotate: '-22deg' }],
  },
  collapsedRightAction: {
    position: 'absolute',
    right: 20,
    top: 10,
  },
  collapsedRightText: {
    color: '#fcd34d',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.4,
    transform: [{ rotate: '18deg' }],
  },
  collapsedRimOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 520,
  },
  costBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(33,45,62,0.94)',
    borderColor: 'rgba(188,202,214,0.18)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'absolute',
    right: -2,
    top: 2,
  },
  costBadgeGlyph: {
    color: '#fcd34d',
    fontSize: 10,
    fontWeight: '900',
  },
  costBadgeLocked: {
    backgroundColor: 'rgba(51,65,85,0.96)',
  },
  costBadgeText: {
    color: '#fcd34d',
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 2,
  },
  counterPill: {
    backgroundColor: 'rgba(11,23,36,0.82)',
    borderColor: 'rgba(174,190,204,0.16)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  counterText: {
    color: '#eef4f9',
    fontSize: 12,
    fontWeight: '900',
  },
  counterWrap: {
    alignItems: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 12,
    zIndex: 80,
  },
  drum: {
    backgroundColor: '#08192a',
    borderColor: 'rgba(84,110,130,0.22)',
    borderRadius: 260,
    borderWidth: 1,
    left: 18,
    position: 'absolute',
    right: 18,
  },
  innerGlow: {
    backgroundColor: 'rgba(56,189,248,0.04)',
    borderRadius: 220,
    left: 28,
    position: 'absolute',
    right: 28,
  },
  previewDock: {
    alignItems: 'flex-end',
    position: 'absolute',
    right: 14,
    top: -2,
    zIndex: 100,
  },
  previewMiniAction: {
    alignItems: 'center',
    backgroundColor: 'rgba(18,31,46,0.98)',
    borderColor: 'rgba(194,207,219,0.16)',
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  previewMiniActionText: {
    color: '#f8fbff',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 18,
  },
  previewMiniActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  previewPrizeAction: {
    backgroundColor: 'rgba(116,71,18,0.98)',
  },
  previewRimEnergy: {
    color: '#fcd34d',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.3,
    position: 'absolute',
    right: 20,
    top: 14,
    transform: [{ rotate: '14deg' }],
  },
  previewRimLabel: {
    color: '#f8fbff',
    fontSize: 15,
    fontWeight: '900',
    left: 20,
    letterSpacing: 0.7,
    position: 'absolute',
    top: 18,
    transform: [{ rotate: '-18deg' }],
  },
  previewRimOverlay: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 500,
  },
  previewSaveTab: {
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderColor: 'rgba(191,219,254,0.3)',
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 66,
    minWidth: 132,
    paddingHorizontal: 20,
  },
  previewSaveTabMuted: {
    opacity: 0.72,
  },
  previewSaveText: {
    color: '#f8fbff',
    fontSize: 18,
    fontWeight: '900',
  },
  railBottom: {
    backgroundColor: 'rgba(190,204,216,0.12)',
    borderRadius: 999,
    height: 3,
    left: 26,
    position: 'absolute',
    right: 26,
  },
  railTop: {
    backgroundColor: 'rgba(190,204,216,0.14)',
    borderRadius: 999,
    height: 3,
    left: 26,
    position: 'absolute',
    right: 26,
  },
  root: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 900,
  },
  selectionWindow: {
    height: 96,
    left: '50%',
    marginLeft: -84,
    overflow: 'hidden',
    padding: 2,
    position: 'absolute',
    width: 168,
    zIndex: 120,
  },
  selectionWindowInner: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(233,241,246,0.18)',
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
  },
  shell: {
    backgroundColor: 'rgba(7,18,29,0.99)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 34,
    borderWidth: 1,
    flex: 1,
    overflow: 'hidden',
  },
  shellBorder: {
    borderColor: 'rgba(255,255,255,0.03)',
    borderRadius: 34,
    borderWidth: 1,
    bottom: 2,
    left: 2,
    position: 'absolute',
    right: 2,
    top: 2,
  },
  shellWrap: {
    left: 16,
    position: 'absolute',
    right: 16,
  },
  toolIcon: {
    height: 24,
    marginBottom: 8,
    width: 24,
  },
  toolIconActive: {
    height: 32,
    width: 32,
  },
  toolItem: {
    alignItems: 'center',
    height: CARD_HEIGHT,
    justifyContent: 'center',
    position: 'absolute',
    width: CARD_WIDTH,
  },
  toolItemActive: {
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  toolLabel: {
    color: 'rgba(232,243,255,0.82)',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
    maxWidth: CARD_WIDTH - 18,
    textAlign: 'center',
    textShadowColor: 'rgba(2,6,23,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },
  toolLabelActive: {
    color: '#f8fbff',
    fontSize: 14,
    fontWeight: '900',
  },
  toolLabelLocked: {
    color: 'rgba(203,213,225,0.84)',
  },
  topControlsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 950,
  },
  topEnergyLabel: {
    color: '#f8fbff',
    fontSize: 12,
    fontWeight: '700',
  },
  topEnergyPill: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  topPill: {
    minHeight: 44,
    paddingHorizontal: 18,
  },
  utilityChipCompact: {
    minHeight: 88,
  },
  utilityChipContentCompact: {
    paddingBottom: 10,
    paddingTop: 12,
  },
  utilityChipFooterCompact: {
    paddingVertical: 8,
  },
  utilityRowWrap: {
    columnGap: 12,
    flexDirection: 'row',
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 920,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
});
