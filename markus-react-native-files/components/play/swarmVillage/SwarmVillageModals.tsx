import { modalStyles } from '@/components/play/swarmVillage/styles/modals';
import { BlurView } from 'expo-blur';
import { Animated, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type SwarmVillageModalsProps = {
  availableEnergy: number;
  expansionEnergyCost: number;
  mapExpansionEnergyCost: number;
  maxExpandableColumns: number;
  metricsReady: boolean;
  seasonalEnergy: number;
  spentEnergy: number;
  crazyCapyChargeCaloriesRequired: number;
  crazyCapyChargeProgressCalories: number;
  crazyCapyDurationPerStatueSeconds: number;
  crazyCapyChargeRatio: number;
  crazyCapyRemainingCalories: number;
  crazyCapyReady: boolean;
  onCloseCrazyCapyInfo: () => void;
  onCloseDefeat: () => void;
  onCloseEnergyInfo: () => void;
  onCloseExpansion: () => void;
  onCloseVictory: () => void;
  onConfirmExpansion: () => void;
  onDecreaseExpansion: () => void;
  onIncreaseExpansion: () => void;
  onRetryDefeat: () => void;
  pendingExpansionColumns: number;
  shipHp: number;
  showCrazyCapyInfoModal: boolean;
  showDefeatModal: boolean;
  showEnergyInfoModal: boolean;
  showExpansionModal: boolean;
  showVictoryModal: boolean;
  waveDefeated: number;
};

export default function SwarmVillageModals({
  availableEnergy,
  expansionEnergyCost,
  mapExpansionEnergyCost,
  maxExpandableColumns,
  metricsReady,
  seasonalEnergy,
  spentEnergy,
  crazyCapyChargeCaloriesRequired,
  crazyCapyChargeProgressCalories,
  crazyCapyDurationPerStatueSeconds,
  crazyCapyChargeRatio,
  crazyCapyRemainingCalories,
  crazyCapyReady,
  onCloseCrazyCapyInfo,
  onCloseDefeat,
  onCloseEnergyInfo,
  onCloseExpansion,
  onCloseVictory,
  onConfirmExpansion,
  onDecreaseExpansion,
  onIncreaseExpansion,
  onRetryDefeat,
  pendingExpansionColumns,
  shipHp,
  showCrazyCapyInfoModal,
  showDefeatModal,
  showEnergyInfoModal,
  showExpansionModal,
  showVictoryModal,
  waveDefeated,
}: SwarmVillageModalsProps) {
  return (
    <>
      <Modal visible={showExpansionModal} transparent animationType="fade" onRequestClose={onCloseExpansion}>
        <View style={modalStyles.modalOverlay}>
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
          <Animated.View style={modalStyles.modalCard}>
            <View style={[modalStyles.modalIconRing, { borderColor: '#67e8f9' }]}>
              <Text style={modalStyles.modalIconText}>⚡</Text>
            </View>
            <Text style={modalStyles.modalTitle}>Expand Your Map</Text>
            <Text style={modalStyles.modalSubtitle}>
              Spend energy to add more grass columns to the eastern edge of your village.
            </Text>
            <View style={modalStyles.expansionBalanceCard}>
              <Text style={modalStyles.expansionBalanceLabel}>Energy Balance</Text>
              <Text style={modalStyles.expansionBalanceValue}>{availableEnergy}</Text>
              <Text style={modalStyles.expansionBalanceHint}>Each column costs {mapExpansionEnergyCost} energy.</Text>
            </View>
            <View style={modalStyles.expansionPickerRow}>
              <Pressable
                style={[modalStyles.expansionAdjustButton, pendingExpansionColumns <= 1 && modalStyles.expansionAdjustButtonDisabled]}
                disabled={pendingExpansionColumns <= 1}
                onPress={onDecreaseExpansion}
              >
                <Text style={modalStyles.expansionAdjustButtonText}>−</Text>
              </Pressable>
              <View style={modalStyles.expansionSummaryPill}>
                <Text style={modalStyles.expansionSummaryValue}>{pendingExpansionColumns}</Text>
                <Text style={modalStyles.expansionSummaryLabel}>column{pendingExpansionColumns === 1 ? '' : 's'}</Text>
                <Text style={modalStyles.expansionSummaryCost}>{expansionEnergyCost} energy</Text>
              </View>
              <Pressable
                style={[
                  modalStyles.expansionAdjustButton,
                  (maxExpandableColumns <= 0 || pendingExpansionColumns >= maxExpandableColumns) && modalStyles.expansionAdjustButtonDisabled,
                ]}
                disabled={maxExpandableColumns <= 0 || pendingExpansionColumns >= maxExpandableColumns}
                onPress={onIncreaseExpansion}
              >
                <Text style={modalStyles.expansionAdjustButtonText}>+</Text>
              </Pressable>
            </View>
            <View style={modalStyles.expansionWarningCard}>
              <Text style={modalStyles.expansionWarningTitle}>Warning</Text>
              <Text style={modalStyles.expansionWarningText}>
                Expanding the map also gives Ijoms more columns to spawn in, so make sure your defenses can cover the extra ground.
              </Text>
            </View>
            <View style={modalStyles.expansionModalActions}>
              <Pressable style={[modalStyles.modalButton, { flex: 1, width: 'auto' }, modalStyles.expansionCancelButton]} onPress={onCloseExpansion}>
                <Text style={modalStyles.expansionCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  modalStyles.modalButton,
                  { flex: 1, width: 'auto' },
                  modalStyles.expansionConfirmButton,
                  (!metricsReady || maxExpandableColumns <= 0) && modalStyles.actionBtnDisabled,
                ]}
                disabled={!metricsReady || maxExpandableColumns <= 0}
                onPress={onConfirmExpansion}
              >
                <Text style={modalStyles.modalButtonText}>{maxExpandableColumns <= 0 ? 'Need More Energy' : 'Expand'}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showEnergyInfoModal} transparent animationType="fade" onRequestClose={onCloseEnergyInfo}>
        <View style={modalStyles.modalOverlay}>
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
          <Animated.View style={modalStyles.modalCard}>
            <View style={[modalStyles.modalIconRing, { borderColor: '#fcd34d' }]}>
              <Text style={modalStyles.modalIconText}>⚡</Text>
            </View>
            <Text style={modalStyles.modalTitle}>Energy</Text>
            <Text style={modalStyles.modalSubtitle}>
              Energy is your village-building currency. You spend it on buildings, healing, and map expansion, then earn more from your real-world activity.
            </Text>

            <View style={modalStyles.infoSectionCard}>
              <Text style={modalStyles.infoSectionTitle}>How To Earn It</Text>
              <View style={modalStyles.energyInfoFactRow}>
                <Text style={modalStyles.energyInfoFactLabel}>Active calories</Text>
                <Text style={modalStyles.energyInfoFactValue}>1 = 4 energy</Text>
              </View>
              <View style={modalStyles.energyInfoFactRow}>
                <Text style={modalStyles.energyInfoFactLabel}>Exercise minutes</Text>
                <Text style={modalStyles.energyInfoFactValue}>1 = 20 energy</Text>
              </View>
              <View style={modalStyles.energyInfoFactRow}>
                <Text style={modalStyles.energyInfoFactLabel}>Steps</Text>
                <Text style={modalStyles.energyInfoFactValue}>10 = 1 energy</Text>
              </View>
            </View>

            <View style={modalStyles.infoSectionCard}>
              <Text style={modalStyles.infoSectionTitle}>Your Balance</Text>
              <Text style={modalStyles.infoSectionText}>
                Available energy is everything you have earned this season minus what you have already spent in the village.
              </Text>
              <View style={modalStyles.energyInfoBalanceRow}>
                <Text style={modalStyles.energyInfoBalanceLabel}>Earned This Season</Text>
                <Text style={modalStyles.energyInfoBalanceValue}>{seasonalEnergy.toLocaleString()}</Text>
              </View>
              <View style={modalStyles.energyInfoBalanceRow}>
                <Text style={modalStyles.energyInfoBalanceLabel}>Spent In Village</Text>
                <Text style={modalStyles.energyInfoBalanceValue}>{spentEnergy.toLocaleString()}</Text>
              </View>
              <View style={modalStyles.energyInfoBalanceRow}>
                <Text style={modalStyles.energyInfoBalanceLabel}>Available Now</Text>
                <Text style={[modalStyles.energyInfoBalanceValue, modalStyles.energyInfoBalanceValueHighlight]}>
                  {availableEnergy.toLocaleString()}
                </Text>
              </View>
            </View>

            <Pressable style={[modalStyles.modalButton, { backgroundColor: '#fcd34d' }]} onPress={onCloseEnergyInfo}>
              <Text style={modalStyles.modalButtonText}>Got It</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showVictoryModal} transparent animationType="fade" onRequestClose={onCloseVictory}>
        <View style={modalStyles.modalOverlay}>
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
          <Animated.View style={modalStyles.modalCard}>
            <View style={[modalStyles.modalIconRing, { borderColor: '#34d399' }]}>
              <Text style={modalStyles.modalIconText}>🏆</Text>
            </View>
            <Text style={[modalStyles.modalTitle, modalStyles.endStateModalTitle]}>Swarm Repelled!</Text>
            <Text style={[modalStyles.modalSubtitle, modalStyles.endStateModalSubtitle]}>
              The North Keep remains secure thanks to your strategic defenses.
            </Text>
            <View style={modalStyles.modalStatsRow}>
              <View style={modalStyles.modalStatPill}>
                <Text style={[modalStyles.modalStatValue, modalStyles.endStateModalStatValue]}>{waveDefeated}</Text>
                <Text style={[modalStyles.modalStatLabel, { fontSize: 10 }]}>Defeated</Text>
              </View>
              <View style={modalStyles.modalStatPill}>
                <Text style={[modalStyles.modalStatValue, modalStyles.endStateModalStatValue]}>{shipHp}</Text>
                <Text style={[modalStyles.modalStatLabel, { fontSize: 10 }]}>Village HP</Text>
              </View>
              <View style={modalStyles.modalStatPill}>
                <Text style={[modalStyles.modalStatValue, modalStyles.endStateModalStatValue, { color: '#fcd34d' }]}>
                  {availableEnergy}
                </Text>
                <Text style={[modalStyles.modalStatLabel, { fontSize: 10 }]}>Energy Left</Text>
              </View>
            </View>
            <Pressable style={[modalStyles.modalButton, { backgroundColor: '#34d399' }]} onPress={onCloseVictory}>
              <Text style={[modalStyles.modalButtonText, modalStyles.endStateModalButtonText]}>Continue Building</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showCrazyCapyInfoModal} transparent animationType="fade" onRequestClose={onCloseCrazyCapyInfo}>
        <View style={modalStyles.modalOverlay}>
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
          <Animated.View style={modalStyles.modalCard}>
            <View style={[modalStyles.modalIconRing, { borderColor: '#34d399' }]}>
              <Image source={require('@/assets/images/quest/capybara_powerup.webp')} resizeMode="contain" style={{ width: 90, height: 90 }} />
            </View>
            <Text style={modalStyles.modalTitle}>Crazy Capy</Text>
            <Text style={modalStyles.modalSubtitleSmall}>
              Can only be unleashed during an active swarm. It takes {crazyCapyChargeCaloriesRequired.toLocaleString()} active calories to recharge from the last use. When charged, tap the badge to send it running through the village with a bat, dealing strong multi-hit damage to any ijoms it catches.
            </Text>
            <View style={modalStyles.crazyCapyChargeCard}>
              <View style={modalStyles.crazyCapyChargeHeader}>
                <Text style={modalStyles.crazyCapyChargeTitle}>Charge Progress</Text>
                <Text style={modalStyles.crazyCapyChargePercent}>{Math.round(crazyCapyChargeRatio * 100)}%</Text>
              </View>
              <View style={modalStyles.crazyCapyChargeTrack}>
                <View style={[modalStyles.crazyCapyChargeFill, { width: `${crazyCapyChargeRatio * 100}%` }]} />
              </View>
              <Text style={modalStyles.crazyCapyChargeValue}>
                {crazyCapyChargeProgressCalories.toLocaleString()} / {crazyCapyChargeCaloriesRequired.toLocaleString()} active cal
              </Text>
              <Text style={modalStyles.crazyCapyChargeHint}>
                {crazyCapyReady
                  ? 'Fully charged for the next swarm.'
                  : `${crazyCapyRemainingCalories.toLocaleString()} more active calories to charge.`}
              </Text>
            </View>
            <View style={modalStyles.modalStatsRow}>
              <View style={modalStyles.modalStatPill}>
                <Text style={[modalStyles.modalStatValue, { fontSize: 16, color: '#34d399' }]}>{crazyCapyDurationPerStatueSeconds}s</Text>
                <Text style={[modalStyles.modalStatLabel, { fontSize: 10 }]}>Per Statue</Text>
              </View>
              <View style={modalStyles.modalStatPill}>
                <Text style={[modalStyles.modalStatValue, { fontSize: 16, color: '#67e8f9' }]}>{crazyCapyChargeCaloriesRequired.toLocaleString()}</Text>
                <Text style={[modalStyles.modalStatLabel, { fontSize: 10 }]}>Active Cal</Text>
              </View>
              <View style={modalStyles.modalStatPill}>
                <Text style={[modalStyles.modalStatValue, { fontSize: 16, color: '#fcd34d' }]}>Strong</Text>
                <Text style={[modalStyles.modalStatLabel, { fontSize: 10 }]}>Damage</Text>
              </View>
            </View>
            <Pressable style={[modalStyles.modalButton, { backgroundColor: '#34d399' }]} onPress={onCloseCrazyCapyInfo}>
              <Text style={modalStyles.modalButtonText}>Got It</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showDefeatModal} transparent animationType="fade" onRequestClose={onCloseDefeat}>
        <View style={modalStyles.modalOverlay}>
          <BlurView intensity={70} tint="dark" style={StyleSheet.absoluteFill} />
          <Animated.View style={modalStyles.modalCard}>
            <View style={[modalStyles.modalIconRing, { borderColor: '#f87171' }]}>
              <Text style={modalStyles.modalIconText}>⚔️</Text>
            </View>
            <Text style={[modalStyles.modalTitle, modalStyles.endStateModalTitle]}>Village Breached!</Text>
            <Text style={[modalStyles.modalSubtitle, modalStyles.endStateModalSubtitle]}>
              The Ijoms have overwhelmed your defenses. Strengthen your walls and try again.
            </Text>
            <View style={modalStyles.modalStatsRow}>
              <View style={modalStyles.modalStatPill}>
                <Text style={[modalStyles.modalStatValue, modalStyles.endStateModalStatValue]}>{waveDefeated}</Text>
                <Text style={modalStyles.modalStatLabel}>Defeated</Text>
              </View>
              <View style={modalStyles.modalStatPill}>
                <Text style={[modalStyles.modalStatValue, modalStyles.endStateModalStatValue, { color: '#f87171' }]}>
                  Lost
                </Text>
                <Text style={modalStyles.modalStatLabel}>Result</Text>
              </View>
            </View>
            <Pressable style={[modalStyles.modalButton, { backgroundColor: '#f87171' }]} onPress={onRetryDefeat}>
              <Text style={[modalStyles.modalButtonText, modalStyles.endStateModalButtonText]}>Try Again</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}
