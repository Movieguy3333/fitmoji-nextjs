import { useAudioSettings } from '@/contexts/AudioSettingsContext';
import type { BattleStatus } from '@/components/play/swarmVillage/model/types';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';

type UseVillageAudioOptions = {
  hasActivePowerupAudioOverride: boolean;
  isVillageFocused: boolean;
  status: BattleStatus;
};

const getStatusMusicVolume = (status: BattleStatus) => (status === 'wave' ? 0.08 : 0.03);

export function useVillageAudio({
  hasActivePowerupAudioOverride,
  isVillageFocused,
  status,
}: UseVillageAudioOptions) {
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const { musicEnabled, setPlayScreenAssetsReady } = useAudioSettings();
  const musicEnabledRef = useRef(musicEnabled);
  const hasActivePowerupAudioOverrideRef = useRef(hasActivePowerupAudioOverride);

  const stopCurrentAudioImmediately = useCallback(() => {
    const player = audioPlayerRef.current;
    if (!player) return;
    try {
      player.pause();
    } catch {
      // Best effort: removing the player is what matters for transition safety.
    }
    player.remove();
    audioPlayerRef.current = null;
  }, []);

  useEffect(() => {
    setPlayScreenAssetsReady(true);
  }, [setPlayScreenAssetsReady]);

  useEffect(() => {
    musicEnabledRef.current = musicEnabled;
  }, [musicEnabled]);

  useEffect(() => {
    hasActivePowerupAudioOverrideRef.current = hasActivePowerupAudioOverride;
  }, [hasActivePowerupAudioOverride]);

  useEffect(() => {
    let cancelled = false;
    const nextStatus = status;
    const track = status === 'wave'
      ? require('@/assets/audio/combat.mp3')
      : require('@/assets/audio/verity.mp3');

    if (!isVillageFocused) {
      stopCurrentAudioImmediately();
      return () => {
        cancelled = true;
      };
    }

    const initAudio = async () => {
      try {
        stopCurrentAudioImmediately();

        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: false,
          interruptionMode: 'duckOthers',
        });
        if (cancelled) return;

        const player = createAudioPlayer(track);
        player.loop = true;
        player.volume = getStatusMusicVolume(nextStatus);
        audioPlayerRef.current = player;

        if (!cancelled && musicEnabledRef.current && !hasActivePowerupAudioOverrideRef.current) {
          player.play();
        }
      } catch (error) {
        if (__DEV__) console.warn('[SwarmVillage] Music failed:', error);
      }
    };

    void initAudio();

    return () => {
      cancelled = true;
      stopCurrentAudioImmediately();
    };
  }, [isVillageFocused, status, stopCurrentAudioImmediately]);

  useEffect(() => {
    const player = audioPlayerRef.current;
    if (!player) return;
    if (isVillageFocused && musicEnabled && !hasActivePowerupAudioOverride) {
      player.volume = getStatusMusicVolume(status);
      player.play();
    } else {
      player.pause();
    }
  }, [hasActivePowerupAudioOverride, isVillageFocused, musicEnabled, status]);

  return {
    musicEnabled,
    stopCurrentAudioImmediately,
  };
}
