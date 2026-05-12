import { formatToolCostLabel } from '@/components/play/swarmVillage/domain/economy';
import {
  getFoundationImage,
  getFoundationLabel,
} from '@/components/play/swarmVillage/domain/foundations';
import {
  getCombatUnitMaxHp,
  getUnitMaxHp,
} from '@/components/play/swarmVillage/domain/units';
import {
  BOXER_FRAMES,
  CAPYBARA_STATUE_IMAGE,
  CHEST_IMAGE,
  QUARTERBACK_IMAGE,
  SOIL_TILE_IMAGE,
  TENNIS_FRAMES,
  TINY_HOUSE_IMAGE,
  WALL_TILE_IMAGE,
  WINDMILL_IMAGE,
  WOOD_FENCE_IMAGE,
} from '@/components/play/swarmVillage/model/assets';
import {
  CRAZY_CAPY_CHARGE_ACTIVE_CALORIES,
  QUARTERBACK_DAMAGE,
  QUARTERBACK_RANGE,
  TENNIS_RANGE,
} from '@/components/play/swarmVillage/model/constants';
import {
  BOXER_DAMAGE,
  CHEST_MAX_HP,
  CHEST_REQUIRED_FULL_HEALTH_HOMES,
  CHEST_STREAK_REQUIREMENT,
  SOIL_SWARM_TARGET,
  STONE_WALL_MAX_HP,
  TENNIS_DAMAGE,
  WINDMILL_STAR_REWARD,
  WINDMILL_SWARM_TARGET,
  WOOD_FENCE_MAX_HP,
} from '@/components/play/swarmVillage/model/costs';
import type { Tool, ToolInspectCard } from '@/components/play/swarmVillage/model/types';
import { ENERGY_COSTS } from '@/lib/game/energy';

type BuildToolInspectCardOptions = {
  hasCapybaraStatueUnlocked: boolean;
};

export function buildToolInspectCard(
  tool: Tool,
  { hasCapybaraStatueUnlocked }: BuildToolInspectCardOptions,
): ToolInspectCard {
  switch (tool) {
    case 'grass':
    case 'grass_path_a':
    case 'grass_path_b':
    case 'grass_path_c':
    case 'grass_path_d':
    case 'grass_path_e':
    case 'grass_path_f':
    case 'grass_path_g':
    case 'grass_path_h':
    case 'grass_path_i':
    case 'grass_path_j':
      return {
        title: getFoundationLabel(tool),
        subtitle:
          tool === 'grass'
            ? 'Restores buildable ground for your village. Connected path tiles let your avatar wander between swarms.'
            : 'Decorative walking path. Works like grass and helps your avatar walk around the village between swarms.',
        costLabel: `${formatToolCostLabel(tool)} energy`,
        hint:
          tool === 'grass'
            ? 'Hold 1 second, then drag to place'
            : 'Hold 1 second, then drag to place. Empty connected paths can be used by your avatar.',
        compactCopy: true,
        imageSource: getFoundationImage(tool),
        details: [
          { label: 'Role', value: 'Foundation' },
          { label: 'Use', value: tool === 'grass' ? 'Required for most builds' : 'Avatar walkway' },
        ],
      };
    case 'soil':
      return {
        title: 'Soil',
        subtitle: 'Grows wheat after every 3 swarms defended.',
        costLabel: `${formatToolCostLabel('soil')} energy`,
        hint: 'Hold 1 second, then drag to place',
        imageSource: SOIL_TILE_IMAGE,
        details: [
          { label: 'Harvest', value: '1 star' },
          { label: 'Ready In', value: `${SOIL_SWARM_TARGET} swarms` },
        ],
      };
    case 'wall':
      return {
        title: 'Stone Wall',
        subtitle: 'Build tough. Great for longterm defense.',
        costLabel: `${formatToolCostLabel('wall')} energy`,
        hint: 'Hold 1 second, then drag to place',
        imageSource: WALL_TILE_IMAGE,
        details: [
          { label: 'HP', value: `${STONE_WALL_MAX_HP}` },
          { label: 'Placement', value: '1 per tile' },
        ],
      };
    case 'fence':
      return {
        title: 'Fence',
        subtitle: 'Better than nothing. Good for chokepoints.',
        costLabel: `${formatToolCostLabel('fence')} energy`,
        hint: 'Hold 1 second, then drag to place',
        imageSource: WOOD_FENCE_IMAGE,
        details: [
          { label: 'HP', value: `${WOOD_FENCE_MAX_HP}` },
          { label: 'Placement', value: '1 per tile' },
        ],
      };
    case 'boxer':
      return {
        title: 'Boxer',
        subtitle: 'Has a mean jab and a solid hook for close-range defense.',
        costLabel: `${formatToolCostLabel('boxer')} energy`,
        hint: 'Hold 1 second, then drag to place',
        animationFrames: BOXER_FRAMES,
        animationIntervalMs: 140,
        details: [
          { label: 'HP', value: `${getCombatUnitMaxHp('boxer')}` },
          { label: 'Damage', value: `${BOXER_DAMAGE}` },
          { label: 'Range', value: '1' },
        ],
      };
    case 'tennis':
      return {
        title: 'Tennis',
        subtitle: 'Great for long-range defense.',
        costLabel: `${formatToolCostLabel('tennis')} energy`,
        hint: 'Hold 1 second, then drag to place',
        animationFrames: TENNIS_FRAMES,
        animationIntervalMs: 180,
        details: [
          { label: 'HP', value: `${getCombatUnitMaxHp('tennis')}` },
          { label: 'Damage', value: `${TENNIS_DAMAGE}` },
          { label: 'Range', value: `${TENNIS_RANGE}` },
        ],
      };
    case 'quarterback':
      return {
        title: 'Quarterback',
        subtitle: 'Manual long-range defense. During a swarm, tap the tree and pull back to throw a football.',
        costLabel: `${formatToolCostLabel('quarterback')} energy`,
        hint: 'Hold 1 second, then drag to place',
        imageSource: QUARTERBACK_IMAGE,
        details: [
          { label: 'HP', value: `${getCombatUnitMaxHp('quarterback')}` },
          { label: 'Damage', value: `${QUARTERBACK_DAMAGE}` },
          { label: 'Range', value: `${QUARTERBACK_RANGE}` },
        ],
      };
    case 'house':
      return {
        title: 'Tiny House',
        subtitle: 'A cozy home for your villagers. Homes cannot be removed.',
        costLabel: `${formatToolCostLabel('house')} energy`,
        hint: 'Hold 1 second, then drag to place',
        imageSource: TINY_HOUSE_IMAGE,
        details: [
          { label: 'Type', value: 'Decoration' },
          { label: 'HP', value: `${getUnitMaxHp('house')}` },
          { label: 'Combat', value: 'None' },
          { label: 'Erase', value: 'Disabled' },
        ],
      };
    case 'windmill':
      return {
        title: 'Windmill',
        subtitle: 'Generates power for the village. Earn 10 stars for every 5 swarms defended.',
        costLabel: `${formatToolCostLabel('windmill')} energy`,
        hint: 'Hold 1 second, then drag to place',
        imageSource: WINDMILL_IMAGE,
        details: [
          { label: 'HP', value: `${WOOD_FENCE_MAX_HP}` },
          { label: 'Reward', value: `${WINDMILL_STAR_REWARD} stars` },
          { label: 'Cycle', value: `${WINDMILL_SWARM_TARGET} swarms` },
        ],
      };
    case 'chest':
      return {
        title: 'Treasure Chest',
        subtitle: 'A one-time chest that pays out bonus stars after your village survives two swarms.',
        costLabel: `${formatToolCostLabel('chest')} energy`,
        hint: `Needs ${CHEST_REQUIRED_FULL_HEALTH_HOMES} homes at full health and ${CHEST_STREAK_REQUIREMENT} defended swarms after placement`,
        imageSource: CHEST_IMAGE,
        details: [
          { label: 'HP', value: `${CHEST_MAX_HP}` },
          { label: 'Reward', value: '1-5 stars' },
          { label: 'Ready In', value: `${CHEST_STREAK_REQUIREMENT} swarms` },
          { label: 'Homes', value: `${CHEST_REQUIRED_FULL_HEALTH_HOMES} full HP` },
          { label: '5\u2605 Odds', value: '10%' },
        ],
      };
    case 'capybara_statue':
      return hasCapybaraStatueUnlocked
        ? {
          title: 'Capybara',
          subtitle: 'Allows you to summon a batsh*t crazy capybara. It recharges with active calories instead of time.',
          costLabel: `${formatToolCostLabel('capybara_statue')} energy`,
          hint: 'Hold 1 second, then drag to place',
          imageSource: CAPYBARA_STATUE_IMAGE,
          details: [
            { label: 'Type', value: 'Decoration' },
            { label: 'Combat', value: 'Untouchable' },
            { label: 'Charge', value: `${CRAZY_CAPY_CHARGE_ACTIVE_CALORIES.toLocaleString()} active cal` },
          ],
        }
        : {
          title: 'Capybara',
          subtitle: 'In honor of the greatest to ever do it',
          costLabel: `${formatToolCostLabel('capybara_statue')} energy`,
          hint: 'Unlock from the Prize Machine first',
          locked: true,
          imageSource: CAPYBARA_STATUE_IMAGE,
          details: [
            { label: 'Unlock', value: 'Prize Machine' },
            { label: 'Combat', value: 'Untouchable' },
          ],
        };
    case 'erase':
      return {
        title: 'Erase',
        subtitle: 'Removes placed items',
        costLabel: 'Up to 50% refund',
        hint: 'Drag onto the item you wish to remove',
        symbol: '\u2212',
        details: [
          { label: 'Refund', value: 'Up to 50%' },
          { label: 'Houses', value: 'Cannot erase' },
          { label: 'Use', value: 'Build cleanup' },
        ],
      };
    case 'heal':
      return {
        title: 'Heal +25%',
        subtitle: 'Restore unit or wall HP',
        costLabel: `${ENERGY_COSTS.heal.toLocaleString()} energy`,
        hint: 'Drag onto the item you wish to heal',
        symbol: '\u{1F49A}',
        details: [
          { label: 'Restore', value: '25% HP' },
          { label: 'Targets', value: 'Units & walls' },
        ],
      };
    default:
      return { title: '', subtitle: '', costLabel: '', hint: '' };
  }
}
