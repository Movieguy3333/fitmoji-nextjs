import { getEasternDayKeyOffset, getSwarmWindowNotificationTitle, getSwarmWindowsForEasternDayKey } from '@/components/play/swarmVillage/domain/schedule';
import { pickString } from '@/components/play/swarmVillage/domain/utils';
import { SWARM_NOTIFICATION_LOOKAHEAD_DAYS, VILLAGE_NOTIFICATION_CHANNEL_ID } from '@/components/play/swarmVillage/model/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

type ReadyRewardSnapshot = {
  chestKeys: string[];
  soilKeys: string[];
  windmillKeys: string[];
};

type UseSwarmNotificationsOptions = {
  boardLoaded: boolean;
  effectiveSwarmUnlockAtMs: number;
  readyRewardSnapshot: ReadyRewardSnapshot;
  swarmProgressLoaded: boolean;
  userId?: string | null;
};

const db = getFirestore(getApp());

export function useSwarmNotifications({
  boardLoaded,
  effectiveSwarmUnlockAtMs,
  readyRewardSnapshot,
  swarmProgressLoaded,
  userId,
}: UseSwarmNotificationsOptions) {
  const rewardNotificationSnapshotReadyRef = useRef(false);
  const previousReadyRewardKeysRef = useRef<ReadyRewardSnapshot>({
    soilKeys: [],
    windmillKeys: [],
    chestKeys: [],
  });

  const ensureVillageNotificationsEnabled = useCallback(async () => {
    const pushEnabled = await AsyncStorage.getItem('settings_push');
    if (pushEnabled !== 'true') return false;
    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.status !== 'granted') return false;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(VILLAGE_NOTIFICATION_CHANNEL_ID, {
        name: 'Village Alerts',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    return true;
  }, []);

  const resolveCurrentUserExpoPushToken = useCallback(async () => {
    if (!userId) return null;
    try {
      const userSnap = await getDoc(doc(db, 'Users', userId));
      if (!userSnap.exists()) return null;
      return pickString((userSnap.data() as Record<string, unknown>).expoPushToken);
    } catch (error) {
      if (__DEV__) console.warn('[SwarmVillage] Failed to read Expo push token:', error);
      return null;
    }
  }, [userId]);

  const sendVillageRewardNotification = useCallback(async (payload: {
    title: string;
    body: string;
    rewardType: 'soil' | 'windmill' | 'chest';
  }) => {
    if (!(await ensureVillageNotificationsEnabled())) return;

    const content = {
      title: payload.title,
      body: payload.body,
      sound: 'default' as const,
      data: {
        type: 'village_reward_ready',
        rewardType: payload.rewardType,
        screen: 'village',
      },
    };

    const expoPushToken = await resolveCurrentUserExpoPushToken();
    if (!expoPushToken) {
      await Notifications.scheduleNotificationAsync({ content, trigger: null });
      return;
    }

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: expoPushToken,
          ...content,
        }),
      });
      const result = await response.json();
      const pushPayload = Array.isArray(result?.data) ? result.data[0] : result?.data;
      if (!response.ok || pushPayload?.status === 'error') {
        throw new Error(pushPayload?.message || result?.errors?.[0]?.message || 'Push send failed');
      }
    } catch (error) {
      if (__DEV__) console.warn('[SwarmVillage] Failed to send reward push, falling back to local notification:', error);
      await Notifications.scheduleNotificationAsync({ content, trigger: null });
    }
  }, [ensureVillageNotificationsEnabled, resolveCurrentUserExpoPushToken]);

  const scheduleVillageSwarmNotifications = useCallback(async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const villageSwarmNotifications = scheduled.filter((notification) => {
      const data = notification.content.data as { type?: string } | undefined;
      return data?.type === 'village_swarm_ready';
    });
    await Promise.all(
      villageSwarmNotifications.map((notification) =>
        Notifications.cancelScheduledNotificationAsync(notification.identifier)),
    );

    if (!swarmProgressLoaded || !(await ensureVillageNotificationsEnabled())) return;

    const now = Date.now();
    const earliestNotificationAtMs = Math.max(now + 15_000, effectiveSwarmUnlockAtMs + 1_000);
    const upcomingSwarmWindows: number[] = [];
    for (let dayOffset = 0; dayOffset <= SWARM_NOTIFICATION_LOOKAHEAD_DAYS; dayOffset += 1) {
      const dayKey = getEasternDayKeyOffset(new Date(), dayOffset);
      getSwarmWindowsForEasternDayKey(dayKey).forEach((window) => {
        if (window.atMs >= earliestNotificationAtMs) {
          upcomingSwarmWindows.push(window.atMs);
        }
      });
    }

    await Promise.all(
      upcomingSwarmWindows.map((windowAtMs) =>
        Notifications.scheduleNotificationAsync({
          content: {
            title: getSwarmWindowNotificationTitle(windowAtMs),
            body: 'Tap to enter Swarm Village.',
            sound: 'default',
            data: {
              type: 'village_swarm_ready',
              screen: 'village',
              swarmWindowAtMs: windowAtMs,
            },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: new Date(windowAtMs),
          },
        })),
    );
  }, [effectiveSwarmUnlockAtMs, ensureVillageNotificationsEnabled, swarmProgressLoaded]);

  useEffect(() => {
    void scheduleVillageSwarmNotifications();
  }, [scheduleVillageSwarmNotifications]);

  useEffect(() => {
    if (!boardLoaded || !swarmProgressLoaded) return;

    const previousReadyRewardKeys = previousReadyRewardKeysRef.current;
    if (!rewardNotificationSnapshotReadyRef.current) {
      previousReadyRewardKeysRef.current = readyRewardSnapshot;
      rewardNotificationSnapshotReadyRef.current = true;
      return;
    }

    const previousSoilKeys = new Set(previousReadyRewardKeys.soilKeys);
    const previousWindmillKeys = new Set(previousReadyRewardKeys.windmillKeys);
    const previousChestKeys = new Set(previousReadyRewardKeys.chestKeys);
    const hasNewSoilReward = readyRewardSnapshot.soilKeys.some((key) => !previousSoilKeys.has(key));
    const hasNewWindmillReward = readyRewardSnapshot.windmillKeys.some((key) => !previousWindmillKeys.has(key));
    const hasNewChestReward = readyRewardSnapshot.chestKeys.some((key) => !previousChestKeys.has(key));

    previousReadyRewardKeysRef.current = readyRewardSnapshot;

    if (hasNewSoilReward) {
      void sendVillageRewardNotification({
        title: 'Your wheat is ready to harvest 🌾',
        body: 'Stars are waiting for you in Swarm Village.',
        rewardType: 'soil',
      });
    }
    if (hasNewWindmillReward) {
      void sendVillageRewardNotification({
        title: 'Windmill reward ready — collect your stars ✨',
        body: 'Your windmill payout is waiting in Swarm Village.',
        rewardType: 'windmill',
      });
    }
    if (hasNewChestReward) {
      void sendVillageRewardNotification({
        title: 'Chest unlocked! Open to reveal your stars ✨',
        body: 'A treasure chest is ready for you in Swarm Village.',
        rewardType: 'chest',
      });
    }
  }, [boardLoaded, readyRewardSnapshot, sendVillageRewardNotification, swarmProgressLoaded]);

  return {
    scheduleVillageSwarmNotifications,
  };
}
