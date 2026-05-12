import type {
  TooltipStyles,
  TourGuideConfig,
  TourStep,
} from '@wrack/react-native-tour-guide';
import type { RefObject } from 'react';

export const SWARM_VILLAGE_TOUR_STORAGE_KEY_PREFIX = 'fitmoji:tour:swarm-village:v1';

export type SwarmVillageTourAnchorId =
  | 'swarm-schedule'
  | 'energy-balance'
  | 'tool-tray'
  | 'prize-machine';

export type SwarmVillageTourTargetRefs = Record<SwarmVillageTourAnchorId, RefObject<any>>;

type FitmojiSwarmVillageTourStep = TourStep & {
  spotlightPulse?: boolean;
  tooltipStyles?: Partial<TooltipStyles>;
};

const SWARM_VILLAGE_TOUR_CONFIG: TourGuideConfig = {
  showProgressDots: true,
  showStepCounter: true,
  enableBackButton: true,
  nextButtonText: 'Next',
  prevButtonText: 'Back',
  skipButtonText: 'Skip',
  doneButtonText: 'Start Building',
  tooltipStyles: {
    backgroundColor: '#0F172A',
    titleColor: '#F8FAFC',
    descriptionColor: '#CBD5E1',
    primaryButtonColor: '#2563EB',
    secondaryButtonColor: '#334155',
    skipButtonColor: '#94A3B8',
    buttonTextColor: '#F8FAFC',
    borderRadius: 16,
  },
  spotlightStyles: {
    overlayColor: '#020617',
    overlayOpacity: 0.72,
  },
};

export const getSwarmVillageTourStorageKey = (uid: string) =>
  `${SWARM_VILLAGE_TOUR_STORAGE_KEY_PREFIX}:${uid}`;

export const buildSwarmVillageTour = (
  refs: SwarmVillageTourTargetRefs,
): { steps: FitmojiSwarmVillageTourStep[]; config: TourGuideConfig } => ({
  steps: [
    {
      id: 'swarm-schedule',
      targetRef: refs['swarm-schedule'],
      title: 'Defend Your Castle',
      description:
        'Ijoms launch their attack at 12:00 PM and 6:00 PM each day. Keep your eyes peeled and press the activation button when it\'s ready.',
      tooltipPosition: 'bottom',
      spotlightShape: 'rectangle',
      spotlightPadding: 10,
      spotlightBorderRadius: 20,
      spotlightPulse: true,
    },
    {
      id: 'energy-balance',
      targetRef: refs['energy-balance'],
      title: 'Build With Energy',
      description:
        'Your daily activity is converted into energy. Spend it to fortify your defenses and place combat units around the castle before the next swarm arrives.',
      tooltipPosition: 'top',
      spotlightShape: 'rectangle',
      spotlightPadding: 8,
      spotlightBorderRadius: 18,
      spotlightPulse: true,
    },
    {
      id: 'tool-tray',
      targetRef: refs['tool-tray'],
      title: 'Drag From The Toolbar',
      description:
        'Press and hold any build item here, then drag and drop it onto an open tile in the village to place it.',
      tooltipPosition: 'top',
      spotlightShape: 'rectangle',
      spotlightPadding: 10,
      spotlightBorderRadius: 20,
      spotlightPulse: true,
    },
    {
      id: 'prize-machine',
      targetRef: refs['prize-machine'],
      title: 'Spend Your Stars',
      description:
        'Earn stars by surviving swarms and collecting village rewards. When you are ready, open the prize machine here to spend them.',
      tooltipPosition: 'top',
      spotlightShape: 'rectangle',
      spotlightPadding: 10,
      spotlightBorderRadius: 18,
      spotlightPulse: true,
    },
  ],
  config: SWARM_VILLAGE_TOUR_CONFIG,
});
