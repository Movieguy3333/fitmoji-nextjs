import { getCell } from '@/components/play/swarmVillage/domain/board';
import { isSoilConnectedToHarvestPath } from '@/components/play/swarmVillage/domain/pathing';
import {
  getChestSwarmProgress,
  getSoilSwarmProgress,
  getWindmillSwarmProgress,
  isChestRewardReady,
  isSoilCropReady,
  isWindmillRewardReady,
} from '@/components/play/swarmVillage/domain/rewards';
import {
  formatDamage,
  getCombatUnitDamage,
  getFullHealthHomeCount,
  getNextTreeUpgradeCost,
  getTreeLevel,
  getWallLabel,
  getWallMaxHp,
  getWallToolFromType,
  isUpgradeableTreeUnit,
} from '@/components/play/swarmVillage/domain/units';
import { keyForCell } from '@/components/play/swarmVillage/domain/utils';
import {
  HALF_W,
  HOME_BASE_LABEL,
  isHomeReservedCell,
  QUARTERBACK_RANGE,
  SHIP_MAX_HP,
} from '@/components/play/swarmVillage/model/constants';
import {
  CHEST_REQUIRED_FULL_HEALTH_HOMES,
  CHEST_STREAK_REQUIREMENT,
  ITEM_COSTS,
  SOIL_SWARM_TARGET,
  TREE_UPGRADE_MAX_LEVEL,
  WINDMILL_STAR_REWARD,
  WINDMILL_SWARM_TARGET,
} from '@/components/play/swarmVillage/model/costs';
import type { BoardCell } from '@/components/play/swarmVillage/model/types';
import { overlayStyles } from '@/components/play/swarmVillage/styles/overlays';
import { Pressable, Text, View } from 'react-native';

type IsoPositionFn = (row: number, col: number, elevation?: number) => {
  left: number;
  top: number;
};

type SelectedTooltipCell = {
  row: number;
  col: number;
} | null;

type CastleGroundBounds = {
  cx: number;
  minT: number;
};

type SwarmVillageCellTooltipProps = {
  availableEnergy: number;
  board: BoardCell[];
  castleGroundBounds: CastleGroundBounds;
  gridCols: number;
  harvestingCellKey: string | null;
  isoPosition: IsoPositionFn;
  onCollectWindmillReward: (row: number, col: number) => void | Promise<void>;
  onHarvestSoil: (row: number, col: number) => void | Promise<void>;
  onOpenChest: (row: number, col: number) => void | Promise<void>;
  onRotateCell: (row: number, col: number) => void;
  onUpgradeTree: (row: number, col: number) => void | Promise<void>;
  selectedTooltipCell: SelectedTooltipCell;
  shipHp: number;
  starBalance: number;
  swarmCompletionCount: number;
  treeUpgradeInFlightCellKey: string | null;
};

export default function SwarmVillageCellTooltip({
  availableEnergy,
  board,
  castleGroundBounds,
  gridCols,
  harvestingCellKey,
  isoPosition,
  onCollectWindmillReward,
  onHarvestSoil,
  onOpenChest,
  onRotateCell,
  onUpgradeTree,
  selectedTooltipCell,
  shipHp,
  starBalance,
  swarmCompletionCount,
  treeUpgradeInFlightCellKey,
}: SwarmVillageCellTooltipProps) {
  if (!selectedTooltipCell) return null;

  const cell = getCell(board, selectedTooltipCell.row, selectedTooltipCell.col, gridCols);
  const onCastle = isHomeReservedCell(selectedTooltipCell.row, selectedTooltipCell.col);
  const isSoilTip = cell.foundation === 'soil' && cell.wallHeight <= 0 && !cell.unit;

  if (onCastle && cell.foundation) {
    return (
      <View
        style={[
          overlayStyles.tooltipWrap,
          { left: castleGroundBounds.cx - 60, top: castleGroundBounds.minT - 120, zIndex: 1000 },
        ]}
      >
        <View style={overlayStyles.tooltipCard}>
          <Text style={overlayStyles.tooltipTitle}>{HOME_BASE_LABEL}</Text>
          <Text style={[overlayStyles.tooltipStats, { marginBottom: 0 }]}>
            {`HP: ${shipHp} / ${SHIP_MAX_HP}\nDefend from Enemies`}
          </Text>
        </View>
        <View style={overlayStyles.tooltipArrow} />
      </View>
    );
  }

  const isUnit = !!cell.unit;
  const isWallTip = !isUnit && cell.wallHeight > 0;
  if (!isUnit && !isWallTip && !isSoilTip) return null;

  const elevation = isUnit ? cell.wallHeight + 1 : cell.wallHeight;
  const pos = isoPosition(selectedTooltipCell.row, selectedTooltipCell.col, elevation);
  const soilProgress = isSoilTip ? getSoilSwarmProgress(cell, swarmCompletionCount) : 0;
  const soilReady = isSoilTip ? isSoilCropReady(cell, swarmCompletionCount) : false;
  const soilConnected = isSoilTip
    ? isSoilConnectedToHarvestPath(board, selectedTooltipCell.row, selectedTooltipCell.col, gridCols)
    : false;
  const windmillProgress = cell.unit === 'windmill' ? getWindmillSwarmProgress(cell, swarmCompletionCount) : 0;
  const windmillReady = cell.unit === 'windmill' ? isWindmillRewardReady(cell, swarmCompletionCount) : false;
  const fullHealthHomeCount = getFullHealthHomeCount(board);
  const chestProgress = cell.unit === 'chest' ? getChestSwarmProgress(cell, swarmCompletionCount) : 0;
  const chestReady = cell.unit === 'chest' && isChestRewardReady(cell, swarmCompletionCount, fullHealthHomeCount);
  const tooltipCellKey = keyForCell(selectedTooltipCell.row, selectedTooltipCell.col);
  const treeLevel = isUpgradeableTreeUnit(cell.unit) ? getTreeLevel(cell) : 0;
  const nextTreeUpgradeCost = treeLevel > 0 ? getNextTreeUpgradeCost(treeLevel) : null;
  const treeUpgradeInsufficient =
    !!nextTreeUpgradeCost &&
    (starBalance < nextTreeUpgradeCost.stars || availableEnergy < nextTreeUpgradeCost.energy);
  const treeUpgradeDisabled = !nextTreeUpgradeCost || treeUpgradeInFlightCellKey === tooltipCellKey;
  const soilStatusColor = !soilConnected ? '#ef4444' : soilReady ? '#22c55e' : '#facc15';

  let title = '';
  let stats = '';
  let canRotate = false;

  if (isUnit) {
    if (cell.unit === 'boxer') {
      title = 'Boxer';
      stats = `Level: ${treeLevel} / ${TREE_UPGRADE_MAX_LEVEL}\nHP: ${cell.unitHp} / ${cell.unitMaxHp}\nDamage: ${formatDamage(getCombatUnitDamage('boxer', treeLevel))}\nRange: 1\nCost: ${ITEM_COSTS.boxer} energy`;
    } else if (cell.unit === 'tennis') {
      title = 'Tennis';
      stats = `Level: ${treeLevel} / ${TREE_UPGRADE_MAX_LEVEL}\nHP: ${cell.unitHp} / ${cell.unitMaxHp}\nDamage: ${formatDamage(getCombatUnitDamage('tennis', treeLevel))}\nRange: 6\nCost: ${ITEM_COSTS.tennis} energy`;
    } else if (cell.unit === 'quarterback') {
      title = 'Quarterback';
      stats = `Level: ${treeLevel} / ${TREE_UPGRADE_MAX_LEVEL}\nHP: ${cell.unitHp} / ${cell.unitMaxHp}\nDamage: ${formatDamage(getCombatUnitDamage('quarterback', treeLevel))}\nRange: ${QUARTERBACK_RANGE}\nCost: ${ITEM_COSTS.quarterback} energy`;
    } else if (cell.unit === 'house') {
      title = 'Tiny House';
      stats = `HP: ${cell.unitHp} / ${cell.unitMaxHp}\nCombat: None\nCost: ${ITEM_COSTS.house} energy`;
      canRotate = true;
    } else if (cell.unit === 'capybara_statue') {
      title = 'Capybara';
      stats = `Decoration\nPrize Machine unlock\nCost: ${ITEM_COSTS.capybara_statue} energy`;
      canRotate = true;
    } else if (cell.unit === 'chest') {
      title = 'Treasure Chest';
      stats =
        `HP: ${cell.unitHp} / ${cell.unitMaxHp}\nReward: 1-5★\nProgress: ${Math.min(CHEST_STREAK_REQUIREMENT, chestProgress)} / ${CHEST_STREAK_REQUIREMENT} swarms since placed\nFull HP Homes: ${fullHealthHomeCount} / ${CHEST_REQUIRED_FULL_HEALTH_HOMES}\nCost: ${ITEM_COSTS.chest} energy`;
    } else if (cell.unit === 'windmill') {
      title = 'Windmill';
      stats =
        `HP: ${cell.unitHp} / ${cell.unitMaxHp}\nReward: ${WINDMILL_STAR_REWARD}★ every ${WINDMILL_SWARM_TARGET} swarms\nProgress: ${Math.min(WINDMILL_SWARM_TARGET, windmillProgress)} / ${WINDMILL_SWARM_TARGET}`;
    }
  } else if (isWallTip) {
    const wallTool = getWallToolFromType(cell.wallType) ?? 'wall';
    title = getWallLabel(cell.wallType);
    stats = `Defense Level: ${cell.wallHeight}\nLayer HP: ${cell.wallHp} / ${getWallMaxHp(cell.wallType)}\nCost: ${ITEM_COSTS[wallTool] * cell.wallHeight} energy`;
    canRotate = true;
  } else if (isSoilTip) {
    title = 'Soil Field';
    stats = !soilConnected
      ? soilReady
        ? 'Wheat ready\nConnect to the Starter House path'
        : `Swarm progress: ${Math.min(SOIL_SWARM_TARGET, soilProgress)} / ${SOIL_SWARM_TARGET}\nConnect to the Starter House path`
      : soilReady
        ? 'Wheat ready to harvest\nTrampling resets progress'
        : `Swarm progress: ${Math.min(SOIL_SWARM_TARGET, soilProgress)} / ${SOIL_SWARM_TARGET}\nComplete swarms after planting`;
  }

  return (
    <View
      style={[
        overlayStyles.tooltipWrap,
        { left: pos.left + HALF_W - 84, top: pos.top - 120, zIndex: 1000 },
      ]}
    >
      <View style={overlayStyles.tooltipCard}>
        <View style={overlayStyles.tooltipTitleRow}>
          <Text style={[overlayStyles.tooltipTitle, overlayStyles.tooltipTitleInline]}>{title}</Text>
          {isSoilTip && (
            <View style={[overlayStyles.tooltipStatusDot, { backgroundColor: soilStatusColor }]} />
          )}
        </View>
        <Text style={overlayStyles.tooltipStats}>{stats}</Text>
        {canRotate && (
          <Pressable
            style={overlayStyles.tooltipBtn}
            onPress={() => onRotateCell(selectedTooltipCell.row, selectedTooltipCell.col)}
          >
            <Text style={overlayStyles.tooltipBtnText}>Flip</Text>
          </Pressable>
        )}
        {isUpgradeableTreeUnit(cell.unit) && (
          <Pressable
            style={[
              overlayStyles.tooltipBtn,
              overlayStyles.tooltipHarvestBtn,
              (treeUpgradeDisabled || treeUpgradeInsufficient) && overlayStyles.tooltipBtnDisabled,
            ]}
            disabled={treeUpgradeDisabled}
            onPress={() => { void onUpgradeTree(selectedTooltipCell.row, selectedTooltipCell.col); }}
          >
            <Text style={overlayStyles.tooltipBtnText}>
              {treeUpgradeInFlightCellKey === tooltipCellKey
                ? 'Upgrading...'
                : nextTreeUpgradeCost
                  ? `Upgrade L${treeLevel + 1}\n${nextTreeUpgradeCost.stars}★ + ${nextTreeUpgradeCost.energy} energy`
                  : 'Max Level'}
            </Text>
          </Pressable>
        )}
        {isSoilTip && soilReady && (
          <Pressable
            style={[
              overlayStyles.tooltipBtn,
              overlayStyles.tooltipHarvestBtn,
              (!soilConnected || harvestingCellKey === tooltipCellKey) && overlayStyles.tooltipBtnDisabled,
            ]}
            disabled={!soilConnected || harvestingCellKey === tooltipCellKey}
            onPress={() => { void onHarvestSoil(selectedTooltipCell.row, selectedTooltipCell.col); }}
          >
            <Text style={overlayStyles.tooltipBtnText}>
              {!soilConnected ? 'Connect Home Path' : harvestingCellKey === tooltipCellKey ? 'Harvesting...' : 'Harvest +1★'}
            </Text>
          </Pressable>
        )}
        {cell.unit === 'windmill' && windmillReady && (
          <Pressable
            style={[
              overlayStyles.tooltipBtn,
              overlayStyles.tooltipHarvestBtn,
              harvestingCellKey === tooltipCellKey && overlayStyles.tooltipBtnDisabled,
            ]}
            disabled={harvestingCellKey === tooltipCellKey}
            onPress={() => { void onCollectWindmillReward(selectedTooltipCell.row, selectedTooltipCell.col); }}
          >
            <Text style={overlayStyles.tooltipBtnText}>
              {harvestingCellKey === tooltipCellKey ? 'Collecting...' : `Collect +${WINDMILL_STAR_REWARD}★`}
            </Text>
          </Pressable>
        )}
        {cell.unit === 'chest' && (
          <Pressable
            style={[
              overlayStyles.tooltipBtn,
              overlayStyles.tooltipHarvestBtn,
              (!chestReady || harvestingCellKey === tooltipCellKey) && overlayStyles.tooltipBtnDisabled,
            ]}
            disabled={!chestReady || harvestingCellKey === tooltipCellKey}
            onPress={() => { void onOpenChest(selectedTooltipCell.row, selectedTooltipCell.col); }}
          >
            <Text style={overlayStyles.tooltipBtnText}>
              {harvestingCellKey === tooltipCellKey
                ? 'Opening...'
                : fullHealthHomeCount < CHEST_REQUIRED_FULL_HEALTH_HOMES
                  ? `Homes ${fullHealthHomeCount}/${CHEST_REQUIRED_FULL_HEALTH_HOMES}`
                  : !chestReady
                    ? `${Math.min(CHEST_STREAK_REQUIREMENT, chestProgress)} / ${CHEST_STREAK_REQUIREMENT} swarms`
                    : 'Open Chest'}
            </Text>
          </Pressable>
        )}
      </View>
      <View style={overlayStyles.tooltipArrow} />
    </View>
  );
}
