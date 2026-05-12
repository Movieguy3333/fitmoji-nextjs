import { CRAZY_CAPY_AMBIENT_SFX_VOLUME, CRAZY_CAPY_SWING_SFX_INTERVAL_MS, CRAZY_CAPY_SWING_SFX_VOLUME } from '@/components/play/swarmVillage/model/constants';
import type { CrazyCapyState } from '@/components/play/swarmVillage/model/types';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, type MutableRefObject } from 'react';

type UseCrazyCapyAudioOptions = {
  crazyCapyRef: MutableRefObject<CrazyCapyState | null>;
  crazyCapySoundscapeActive: boolean;
  isVillageFocused: boolean;
  musicEnabled: boolean;
};

export function useCrazyCapyAudio({
  crazyCapyRef,
  crazyCapySoundscapeActive,
  isVillageFocused,
  musicEnabled,
}: UseCrazyCapyAudioOptions) {
  const crazyCapyAmbientPlayerRef = useRef<AudioPlayer | null>(null);
  const crazyCapySwingPlayerRef = useRef<AudioPlayer | null>(null);
  const crazyCapySwingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopCrazyCapySwingSfx = useCallback(() => {
    if (crazyCapySwingIntervalRef.current) {
      clearInterval(crazyCapySwingIntervalRef.current);
      crazyCapySwingIntervalRef.current = null;
    }
    const player = crazyCapySwingPlayerRef.current;
    if (!player) return;
    try {
      player.pause();
      player.remove();
    } catch {
      // Best-effort cleanup.
    }
    crazyCapySwingPlayerRef.current = null;
  }, []);

  const stopCrazyCapyAmbientSfx = useCallback(() => {
    const player = crazyCapyAmbientPlayerRef.current;
    if (!player) return;
    try {
      player.pause();
      player.remove();
    } catch {
      // Best-effort cleanup.
    }
    crazyCapyAmbientPlayerRef.current = null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initAmbientLoop = async () => {
      try {
        const player = createAudioPlayer(require('@/assets/audio/capybara.mp3'));
        player.loop = true;
        player.volume = CRAZY_CAPY_AMBIENT_SFX_VOLUME;
        crazyCapyAmbientPlayerRef.current = player;
        if (!cancelled) player.play();
      } catch (error) {
        if (__DEV__) console.warn('[SwarmVillage] Crazy Capy ambient SFX failed:', error);
      }
    };

    if (!isVillageFocused || !crazyCapySoundscapeActive || !musicEnabled) {
      stopCrazyCapyAmbientSfx();
      return () => {
        cancelled = true;
      };
    }

    void initAmbientLoop();

    return () => {
      cancelled = true;
      stopCrazyCapyAmbientSfx();
    };
  }, [crazyCapySoundscapeActive, isVillageFocused, musicEnabled, stopCrazyCapyAmbientSfx]);

  useEffect(() => {
    let cancelled = false;
    const retriggerSwing = async () => {
      if (cancelled) return;
      const player = crazyCapySwingPlayerRef.current;
      if (!player) return;
      try {
        await player.seekTo(0);
        if (cancelled) return;
        player.play();
      } catch (error) {
        if (__DEV__) console.warn('[SwarmVillage] Crazy Capy swing SFX failed:', error);
      }
    };

    const initSwingPlayer = async () => {
      try {
        const player = createAudioPlayer(require('@/assets/audio/swing.mp3'));
        player.loop = false;
        player.volume = CRAZY_CAPY_SWING_SFX_VOLUME;
        crazyCapySwingPlayerRef.current = player;
        await retriggerSwing();
        if (cancelled) {
          player.pause();
          player.remove();
          if (crazyCapySwingPlayerRef.current === player) {
            crazyCapySwingPlayerRef.current = null;
          }
          return;
        }
        crazyCapySwingIntervalRef.current = setInterval(() => {
          if (cancelled || !crazyCapyRef.current || !musicEnabled) return;
          void retriggerSwing();
        }, CRAZY_CAPY_SWING_SFX_INTERVAL_MS);
      } catch (error) {
        if (__DEV__) console.warn('[SwarmVillage] Crazy Capy swing SFX init failed:', error);
      }
    };

    if (!isVillageFocused || !crazyCapySoundscapeActive || !musicEnabled) {
      stopCrazyCapySwingSfx();
      return () => {
        cancelled = true;
      };
    }

    void initSwingPlayer();

    return () => {
      cancelled = true;
      stopCrazyCapySwingSfx();
    };
  }, [crazyCapyRef, crazyCapySoundscapeActive, isVillageFocused, musicEnabled, stopCrazyCapySwingSfx]);
}
