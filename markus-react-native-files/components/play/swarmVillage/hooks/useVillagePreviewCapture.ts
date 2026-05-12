import { VILLAGE_GALLERY_PREVIEW_CONTENT_TYPE, VILLAGE_GALLERY_PREVIEW_IMAGE_SIZE, VILLAGE_GALLERY_PREVIEW_QUALITY } from '@/components/play/swarmVillage/model/constants';
import type { VillagePreviewUpload } from '@/components/play/swarmVillage/model/types';
import { getApp } from '@react-native-firebase/app';
import { getDownloadURL, getStorage, putFile, ref as storageRef } from '@react-native-firebase/storage';
import { useCallback, useRef } from 'react';
import type { View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';

const storage = getStorage(getApp());

export function useVillagePreviewCapture() {
  const villagePreviewShotRef = useRef<React.ElementRef<typeof View> | null>(null);

  const captureAndUploadVillagePreview = useCallback(async (boardID: string): Promise<VillagePreviewUpload> => {
    const target = villagePreviewShotRef.current;
    if (!target) throw new Error('Village preview renderer is not mounted');

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    const previewUri = await captureRef(target, {
      format: 'jpg',
      height: VILLAGE_GALLERY_PREVIEW_IMAGE_SIZE,
      quality: VILLAGE_GALLERY_PREVIEW_QUALITY,
      result: 'tmpfile',
      width: VILLAGE_GALLERY_PREVIEW_IMAGE_SIZE,
    });
    const path = `maps/player_villages/${boardID}/preview.jpg`;
    const imageRef = storageRef(storage, path);

    try {
      await putFile(imageRef, previewUri, {
        contentType: VILLAGE_GALLERY_PREVIEW_CONTENT_TYPE,
        customMetadata: {
          source: 'swarm-village-save',
          boardID,
        },
      });
      const downloadUrl = await getDownloadURL(imageRef);
      return {
        contentType: VILLAGE_GALLERY_PREVIEW_CONTENT_TYPE,
        downloadUrl,
        height: VILLAGE_GALLERY_PREVIEW_IMAGE_SIZE,
        storagePath: path,
        width: VILLAGE_GALLERY_PREVIEW_IMAGE_SIZE,
      };
    } finally {
      releaseCapture(previewUri);
    }
  }, []);

  return {
    captureAndUploadVillagePreview,
    villagePreviewShotRef,
  };
}
