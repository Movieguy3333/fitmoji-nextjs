import { getCell } from '@/components/play/swarmVillage/domain/board';
import type { PlacedSprite } from '@/components/play/swarmVillage/domain/placedSprites';
import { sceneStyles } from '@/components/play/swarmVillage/styles/scene';
import {
  BOXER_FRAMES,
  HOME_BASE_IMAGE,
  QUARTERBACK_IMAGE,
  TENNIS_FRAMES,
} from '@/components/play/swarmVillage/model/assets';
import {
  HOME_BASE_VARIANT,
  VILLAGE_GALLERY_PREVIEW_LAYOUT_SIZE,
} from '@/components/play/swarmVillage/model/constants';
import type { BoardCell } from '@/components/play/swarmVillage/model/types';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';

type Rect = {
  height: number;
  left: number;
  top: number;
  width: number;
};

type SwarmVillageGalleryPreviewProps = {
  board: BoardCell[];
  boardHeight: number;
  boardWidth: number;
  castleAvatar: Rect;
  castleAvatarSource: ImageSourcePropType;
  castleSprite: Rect;
  castleZIndex: number;
  gridCols: number;
  placedSprites: PlacedSprite[];
};

const SwarmVillageGalleryPreview = React.forwardRef<View, SwarmVillageGalleryPreviewProps>(
  (
    {
      board,
      boardHeight,
      boardWidth,
      castleAvatar,
      castleAvatarSource,
      castleSprite,
      castleZIndex,
      gridCols,
      placedSprites,
    },
    ref,
  ) => {
    const previewTransform = useMemo(() => {
      const previewScale = HOME_BASE_VARIANT === 'starter_house' ? 0.95 : 0.8;
      const focusX = castleSprite.left + castleSprite.width * (HOME_BASE_VARIANT === 'starter_house' ? 0.56 : 0.52);
      const focusY = castleSprite.top + castleSprite.height * (HOME_BASE_VARIANT === 'starter_house' ? 0.62 : 0.56);

      return {
        scale: previewScale,
        x:
          VILLAGE_GALLERY_PREVIEW_LAYOUT_SIZE / 2 -
          (boardWidth / 2 + (focusX - boardWidth / 2) * previewScale),
        y:
          VILLAGE_GALLERY_PREVIEW_LAYOUT_SIZE * 0.43 -
          (boardHeight / 2 + (focusY - boardHeight / 2) * previewScale),
      };
    }, [boardHeight, boardWidth, castleSprite]);

    return (
      <View
        ref={ref}
        collapsable={false}
        pointerEvents="none"
        style={{
          height: VILLAGE_GALLERY_PREVIEW_LAYOUT_SIZE,
          left: -(VILLAGE_GALLERY_PREVIEW_LAYOUT_SIZE + 48),
          overflow: 'hidden',
          position: 'absolute',
          top: 0,
          width: VILLAGE_GALLERY_PREVIEW_LAYOUT_SIZE,
        }}
      >
        <LinearGradient colors={['#245971ff', '#48bbf0ff']} style={StyleSheet.absoluteFill} />
        <View
          style={[
            sceneStyles.horizonGlow,
            {
              opacity: 0.35,
              top: 48,
              width: VILLAGE_GALLERY_PREVIEW_LAYOUT_SIZE * 0.72,
            },
          ]}
        />
        <View
          style={[
            sceneStyles.sceneTranslate,
            {
              transform: [
                { translateX: previewTransform.x },
                { translateY: previewTransform.y },
              ],
            },
          ]}
        >
          <View
            style={[
              sceneStyles.sceneScale,
              {
                height: boardHeight,
                transform: [{ scale: previewTransform.scale }],
                width: boardWidth,
              },
            ]}
          >
            {placedSprites.map((sprite) => {
              let source = sprite.source;
              let transform: Array<{ scaleX: -1 }> | undefined;
              const isWall = !!sprite.wallType;

              if (sprite.unit === 'boxer' || sprite.unit === 'tennis') {
                source = sprite.unit === 'boxer' ? BOXER_FRAMES[0] : TENNIS_FRAMES[0];
                if (sprite.unitFacingScaleX === -1) transform = [{ scaleX: -1 }];
              } else if (sprite.unit === 'quarterback') {
                source = QUARTERBACK_IMAGE;
                if (sprite.unitFacingScaleX === -1) transform = [{ scaleX: -1 }];
              } else if (sprite.unit === 'house' || sprite.unit === 'capybara_statue') {
                if (sprite.unitRotation === 1 || sprite.unitRotation === 3) transform = [{ scaleX: -1 }];
              } else if (isWall) {
                const cell = getCell(board, sprite.row, sprite.col, gridCols);
                if (cell.wallRotation === 1 || cell.wallRotation === 3) transform = [{ scaleX: -1 }];
              }

              const dynamicStyle: {
                height: number;
                left: number;
                opacity: number;
                top: number;
                transform?: Array<{ scaleX: -1 }>;
                width: number;
                zIndex: number;
              } = {
                height: sprite.height,
                left: sprite.left,
                opacity: 1,
                top: sprite.top,
                width: sprite.width,
                zIndex: 100 + Math.round(sprite.sortOrder),
              };
              if (transform) dynamicStyle.transform = transform;

              return (
                <Image
                  key={`gallery-${sprite.id}`}
                  source={source}
                  resizeMode="contain"
                  style={[sceneStyles.placedSprite, dynamicStyle]}
                />
              );
            })}

            <View
              pointerEvents="none"
              style={[
                sceneStyles.castleWrap,
                {
                  left: castleSprite.left,
                  top: castleSprite.top,
                  width: castleSprite.width,
                  zIndex: castleZIndex,
                },
              ]}
            >
              <Image
                source={HOME_BASE_IMAGE}
                resizeMode="contain"
                style={{ height: castleSprite.height, width: castleSprite.width }}
              />
              <View
                style={[
                  sceneStyles.castleAvatarPlatform,
                  {
                    left: castleAvatar.left - 2,
                    top: castleAvatar.top + castleAvatar.height - 7,
                    width: castleAvatar.width + 4,
                  },
                ]}
              />
              <Image
                source={castleAvatarSource}
                resizeMode="contain"
                style={[
                  sceneStyles.castleAvatarImage,
                  {
                    height: castleAvatar.height,
                    left: castleAvatar.left - 30,
                    top: castleAvatar.top,
                    width: castleAvatar.width,
                  },
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    );
  },
);

SwarmVillageGalleryPreview.displayName = 'SwarmVillageGalleryPreview';

export default React.memo(SwarmVillageGalleryPreview);
