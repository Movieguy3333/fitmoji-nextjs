import type { BuildToolDef } from '@/components/play/swarmVillage/model/types';
import { trayStyles } from '@/components/play/swarmVillage/styles/tray';
import { Ionicons } from '@expo/vector-icons';
import type { RefObject } from 'react';
import { ActivityIndicator, Image, PanResponder, Pressable, Text, View } from 'react-native';

type PanHandlers = ReturnType<typeof PanResponder.create>['panHandlers'];

type SwarmVillageBottomTrayProps = {
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
  onNextPage: () => void;
  onOpenVending: () => void;
  onOpenEnergyInfo: () => void;
  onPrevPage: () => void;
  onSave: () => void;
  onToggleCollapsed: () => void;
  prizeMachineTourRef: RefObject<View | null>;
  toolPage: number;
  totalToolPages: number;
  toolPanHandlersById: Record<string, PanHandlers>;
  toolTrayTourRef: RefObject<View | null>;
  vendingInventory: string[];
  visibleTools: BuildToolDef[];
};

export default function SwarmVillageBottomTray({
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
  onNextPage,
  onOpenEnergyInfo,
  onOpenVending,
  onPrevPage,
  onSave,
  onToggleCollapsed,
  prizeMachineTourRef,
  toolPage,
  totalToolPages,
  toolPanHandlersById,
  toolTrayTourRef,
  vendingInventory,
  visibleTools,
}: SwarmVillageBottomTrayProps) {
  return (
    <View
      style={[trayStyles.bottomTray, { paddingBottom: Math.max(12, insetsBottom + 4) }]}
      pointerEvents={dragActive ? 'none' : 'box-none'}
    >
      <View
        ref={energyBalanceTourRef}
        collapsable={false}
        style={[trayStyles.trayCalorieRow, { justifyContent: 'space-between', alignContent: 'center', alignItems: 'center' }]}
      >
        <Pressable style={[trayStyles.actionBtn, trayStyles.actionBtnSecondary, { paddingVertical: 4 }]} onPress={onToggleCollapsed}>
          <Text style={trayStyles.actionBtnSecondaryText}>{isTrayCollapsed ? 'Show' : 'Hide'}</Text>
        </Pressable>
        <Pressable
          style={[trayStyles.actionBtnSecondary, { gap: 10, padding: 10, borderRadius: 10 }]}
          onPress={onOpenEnergyInfo}
        >
          <View style={{ flexDirection: 'column', gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: 'bold', textAlign: 'center', color: 'white' }}>Energy</Text>
              <Text style={[trayStyles.trayCalorieValue, availableEnergy < healEnergyCost && { color: '#f87171' }]}>
                ⚡ {availableEnergy.toLocaleString()}
              </Text>
            </View>
          </View>
        </Pressable>
      </View>

      {!isTrayCollapsed && (
        <>
          <View ref={toolTrayTourRef} collapsable={false} style={trayStyles.paginatedRow}>
            <Pressable
              style={[trayStyles.pageArrow, toolPage <= 0 && trayStyles.pageArrowDisabled]}
              disabled={toolPage <= 0}
              onPress={onPrevPage}
            >
              <Text style={trayStyles.pageArrowText}>‹</Text>
            </Pressable>

            <View style={trayStyles.paginatedTools}>
              {visibleTools.map((def) => {
                const locked = !!def.unlockPrizeId && !vendingInventory.includes(def.unlockPrizeId);
                const energyInsufficient = !locked && availableEnergy < def.cost;
                return (
                  <View
                    key={def.tool}
                    {...toolPanHandlersById[def.tool]}
                    style={[
                      trayStyles.toolChip,
                      trayStyles.toolChipTray,
                      energyInsufficient && trayStyles.toolChipDisabled,
                      locked && trayStyles.toolChipLocked,
                    ]}
                  >
                    <Image source={def.icon} style={trayStyles.toolIcon} resizeMode="contain" />
                    <Text style={def.label !== 'Quarterback' ? trayStyles.toolText : trayStyles.toolTextSmall}>{def.label}</Text>
                    <View style={[trayStyles.toolBadge, locked && trayStyles.toolBadgeLocked]}>
                      {locked ? (
                        <>
                          <Ionicons name="lock-closed" size={10} color="#f8fbff" />
                          <Text style={trayStyles.toolBadgeText}>{def.cost.toLocaleString()}</Text>
                        </>
                      ) : (
                        <>
                          <Text style={{ fontSize: 10 }}>⚡</Text>
                          <Text style={trayStyles.toolBadgeText}>{def.cost.toLocaleString()}</Text>
                        </>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>

            <Pressable
              style={[trayStyles.pageArrow, toolPage >= totalToolPages - 1 && trayStyles.pageArrowDisabled]}
              disabled={toolPage >= totalToolPages - 1}
              onPress={onNextPage}
            >
              <Text style={trayStyles.pageArrowText}>›</Text>
            </Pressable>
          </View>

          <View style={trayStyles.pageDots}>
            {Array.from({ length: totalToolPages }, (_, i) => (
              <View key={i} style={[trayStyles.pageDot, i === toolPage && trayStyles.pageDotActive]} />
            ))}
          </View>

          <View style={trayStyles.utilityChipsRow}>
            <View
              {...healPanHandlers}
              style={[trayStyles.healChip, trayStyles.utilityChip, availableEnergy < healEnergyCost && trayStyles.healChipDisabled]}
            >
              <View style={trayStyles.utilityChipContent}>
                <View style={trayStyles.healIconWrap}>
                  <Text style={trayStyles.healIconEmoji}>💚</Text>
                  <Text style={trayStyles.healIconStar}>✦</Text>
                </View>
              </View>
              <View style={[trayStyles.utilityChipFooter, trayStyles.healChipFooter]}>
                <Text style={trayStyles.utilityChipFooterLabel}>⚡ -{healEnergyCost}</Text>
              </View>
            </View>

            <View {...erasePanHandlers} style={[trayStyles.eraseQuickChip, trayStyles.utilityChip]}>
              <View style={trayStyles.utilityChipContent}>
                <Text style={trayStyles.eraseQuickGlyph}>−</Text>
              </View>
              <View style={[trayStyles.utilityChipFooter, trayStyles.eraseQuickChipFooter]}>
                <Text style={trayStyles.utilityChipFooterLabel}>50% ↩</Text>
              </View>
            </View>
            <View ref={prizeMachineTourRef} collapsable={false} style={trayStyles.utilityChipTourWrap}>
              <Pressable style={[trayStyles.prizeChip, trayStyles.utilityChip]} onPress={onOpenVending}>
                <View style={trayStyles.utilityChipContent}>
                  <Text style={trayStyles.prizeChipGlyph}>🎰</Text>
                </View>
                <View style={[trayStyles.utilityChipFooter, trayStyles.prizeChipFooter]}>
                  <Text style={trayStyles.utilityChipFooterLabel}>Open</Text>
                </View>
              </Pressable>
            </View>
            <Pressable
              style={[
                trayStyles.saveChip,
                trayStyles.utilityChip,
                !hasUnsavedChanges && trayStyles.saveChipSaved,
                isSavingDraft && trayStyles.saveChipBusy,
              ]}
              disabled={!draftBaselineReady || isSavingDraft}
              onPress={onSave}
            >
              <View style={trayStyles.utilityChipContent}>
                {isSavingDraft ? (
                  <ActivityIndicator size="small" color="#3b82f6" style={{ marginBottom: 5 }} />
                ) : (
                  <Ionicons name="checkmark-circle" size={20} color="#3b82f6" style={{ marginBottom: 5 }} />
                )}
              </View>
              <View style={[trayStyles.utilityChipFooter, trayStyles.saveChipFooter]}>
                <Text style={trayStyles.utilityChipFooterLabel}>
                  {!draftBaselineReady ? 'Wait' : isSavingDraft ? 'Saving...' : 'Save'}
                </Text>
              </View>
            </Pressable>


          </View>
        </>
      )}
    </View>
  );
}
