'use client';

import Link from 'next/link';
import { useState } from 'react';

import { SwarmSimControls } from '@/components/swarm-sim-controls';
import { SwarmVillageLiveScene } from '@/components/swarm-village-live-scene';
import type { SimControls } from '@/lib/swarm-village/sim/useSwarmSimulation';
import type { SwarmVillageMapSnapshot } from '@/types/swarm-village';

type Props = {
  map: SwarmVillageMapSnapshot;
  playerAvatarUrl?: string | null;
  playerName?: string | null;
  villageName: string;
  tagline?: string | null;
};

const DEFAULT_CONTROLS: SimControls = {
  isSwarmActive: false,
  waveSize: 20,
  enemyKind: 'normal',
  spawnIntervalMs: 700,
  crazyCapyEnabled: false,
  walkerCount: 4,
};

export function VillagePageClient({
  map,
  playerAvatarUrl,
  playerName,
  villageName,
  tagline,
}: Props) {
  const [controls, setControls] = useState<SimControls>(DEFAULT_CONTROLS);

  return (
    <>
      <SwarmVillageLiveScene
        map={map}
        playerAvatarUrl={playerAvatarUrl}
        playerName={playerName}
        controls={controls}
        className="absolute inset-0"
      />

      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#081018]/42 via-transparent to-[#081018]/16" />

      <div className="absolute left-5 top-5 z-[900] sm:left-8 sm:top-8">
        <Link
          href="/"
          className="rounded-lg border border-white/45 bg-white/86 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#264653] shadow-[0_14px_32px_rgba(8,16,24,0.18)] backdrop-blur-md transition hover:bg-white"
        >
          Back to gallery
        </Link>
      </div>

      <SwarmSimControls value={controls} onChange={setControls} />

      <section className="absolute inset-x-4 bottom-4 z-[900] sm:inset-x-8 sm:bottom-8">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-lg border border-white/45 bg-[#fffefa]/88 p-4 shadow-[0_24px_70px_rgba(8,16,24,0.22)] backdrop-blur-md sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#e76f51]">
              Reconstructed Village
            </p>
            <h1 className="mt-2 truncate text-3xl font-black leading-none text-[#231f20] sm:text-4xl">
              {villageName}
            </h1>
            <p className="mt-2 truncate text-base font-black text-[#2a9d8f]">
              {playerName ?? map.displayName ?? 'Fitmoji player'}
            </p>
            <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-[#5f574b]">
              {tagline ??
                'Use the gear icon to activate the swarm simulation.'}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 text-xs sm:w-64">
            <div className="rounded-md border border-[#2f2a1f]/10 bg-white/60 p-3">
              <dt className="font-black uppercase tracking-[0.16em] text-[#7b6f60]">
                Board ID
              </dt>
              <dd className="mt-1 break-all font-black text-[#264653]">
                {map.id}
              </dd>
            </div>
            <div className="rounded-md border border-[#2f2a1f]/10 bg-white/60 p-3">
              <dt className="font-black uppercase tracking-[0.16em] text-[#7b6f60]">
                Board
              </dt>
              <dd className="mt-1 font-black text-[#264653]">
                {map.gridCols} × 20
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </>
  );
}
