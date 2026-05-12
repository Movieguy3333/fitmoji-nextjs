import type { Tool } from '@/components/play/swarmVillage/model/types';
import { overlayStyles } from '@/components/play/swarmVillage/styles/overlays';
import { Image, Text, View, type ImageSourcePropType } from 'react-native';

type DragGhostSources = Record<
  Exclude<Tool, 'erase' | 'heal'>,
  ImageSourcePropType
>;

type SwarmVillageDragGhostProps = {
  dragItem: Tool | null;
  dragPos: { x: number; y: number } | null;
  sources: DragGhostSources;
};

export default function SwarmVillageDragGhost({
  dragItem,
  dragPos,
  sources,
}: SwarmVillageDragGhostProps) {
  if (!dragItem || !dragPos) return null;

  return (
    <View style={[overlayStyles.dragGhost, { left: dragPos.x - 30, top: dragPos.y - 30 }]} pointerEvents="none">
      {dragItem === 'heal' ? (
        <View style={overlayStyles.dragGhostHeal}>
          <Text style={{ fontSize: 28 }}>💚</Text>
          <Text style={overlayStyles.dragGhostHealStar}>✦</Text>
        </View>
      ) : dragItem === 'erase' ? (
        <View style={overlayStyles.dragGhostErase}>
          <Text style={overlayStyles.eraseGlyph}>−</Text>
        </View>
      ) : (
        <Image source={sources[dragItem]} style={overlayStyles.dragGhostImage} resizeMode="contain" />
      )}
    </View>
  );
}
