import type { ToolInspectCard as ToolInspectCardData } from '@/components/play/swarmVillage/model/types';
import { overlayStyles } from '@/components/play/swarmVillage/styles/overlays';
import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, Text, View } from 'react-native';

type SwarmVillageToolInspectCardProps = {
  insetsBottom: number;
  onDismiss: () => void;
  toolInspectCard: ToolInspectCardData | null;
  toolInspectFrameIndex: number;
};

export default function SwarmVillageToolInspectCard({
  insetsBottom,
  onDismiss,
  toolInspectCard,
  toolInspectFrameIndex,
}: SwarmVillageToolInspectCardProps) {
  if (!toolInspectCard) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        overlayStyles.toolInspectCardWrap,
        { bottom: Math.max(insetsBottom + 305, 327) },
      ]}
    >
      <View pointerEvents="box-none" style={overlayStyles.toolInspectCard}>
        <Pressable
          accessibilityLabel="Close tool preview"
          accessibilityRole="button"
          hitSlop={10}
          onPress={onDismiss}
          style={overlayStyles.toolInspectCloseButton}
        >
          <Ionicons name="close" size={16} color="#e8f3ff" />
        </Pressable>
        <View style={overlayStyles.toolInspectHeader}>
            <View style={overlayStyles.toolInspectTextColumn}>
            <View style={overlayStyles.toolInspectHeadingBlock}>
              <Text style={overlayStyles.toolInspectTitle}>{toolInspectCard.title}</Text>
              <Text
                style={[
                  overlayStyles.toolInspectSubtitle,
                  toolInspectCard.compactCopy && overlayStyles.toolInspectSubtitleCompact,
                ]}
              >
                {toolInspectCard.subtitle}
              </Text>
            </View>
            <View style={[overlayStyles.toolInspectBadge, toolInspectCard.locked && overlayStyles.toolInspectBadgeLocked]}>
              <Ionicons
                name={toolInspectCard.locked ? 'lock-closed' : 'flash'}
                size={11}
                color={toolInspectCard.locked ? '#e2e8f0' : '#fcd34d'}
              />
              <Text style={[overlayStyles.toolInspectBadgeText, toolInspectCard.locked && overlayStyles.toolInspectBadgeTextLocked]}>
                {toolInspectCard.locked ? 'Locked Prize' : toolInspectCard.costLabel}
              </Text>
            </View>
          </View>
          <View style={overlayStyles.toolInspectMediaWrap}>
            <View style={[overlayStyles.toolInspectMediaCard, toolInspectCard.locked && overlayStyles.toolInspectMediaCardLocked]}>
              {toolInspectCard.animationFrames || toolInspectCard.imageSource ? (
                <Image
                  source={
                    toolInspectCard.animationFrames
                      ? toolInspectCard.animationFrames[toolInspectFrameIndex % toolInspectCard.animationFrames.length]
                      : toolInspectCard.imageSource!
                  }
                  style={overlayStyles.toolInspectMediaImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={overlayStyles.toolInspectMediaSymbol}>{toolInspectCard.symbol}</Text>
              )}
            </View>
          </View>
        </View>
        {!!toolInspectCard.details?.length && (
          <View style={overlayStyles.toolInspectDetailsRow}>
            {toolInspectCard.details.map((detail) => (
              <View key={`${toolInspectCard.title}-${detail.label}`} style={overlayStyles.toolInspectDetailPill}>
                <Text style={overlayStyles.toolInspectDetailLabel}>{detail.label}</Text>
                <Text style={overlayStyles.toolInspectDetailValue}>{detail.value}</Text>
              </View>
            ))}
          </View>
        )}
        <View style={overlayStyles.toolInspectMetaRow}>
          <Text
            style={[
              overlayStyles.toolInspectHint,
              toolInspectCard.compactCopy && overlayStyles.toolInspectHintCompact,
            ]}
          >
            {toolInspectCard.hint}
          </Text>
        </View>
      </View>
    </View>
  );
}
