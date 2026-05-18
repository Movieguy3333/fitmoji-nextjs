// Village Page

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { VillagePageClient } from "@/components/village-page-client";
import { getVillageById } from "@/data/public-villages";
import { getSwarmVillageMapById } from "@/data/swarm-village-map";

type VillagePageProps = {
  params: Promise<{ mapId: string }>;
};

export default async function VillagePage({ params }: VillagePageProps) {
  await connection();

  const { mapId } = await params;

  const [village, swarmMap] = await Promise.all([
    getVillageById(mapId),
    getSwarmVillageMapById(mapId),
  ]);

  if (!village && !swarmMap) {
    notFound();
  }

  const playerName =
    village?.playerName ?? swarmMap?.displayName ?? "Fitmoji player";
  const villageName = village?.villageName ?? `${playerName}'s Village`;

  return (
    <main className="relative h-[100svh] min-h-[38rem] overflow-hidden bg-[#245971] text-[#231f20]">
      {swarmMap ? (
        <VillagePageClient
          map={swarmMap}
          playerAvatarUrl={village?.avatarUrl}
          playerName={playerName}
          villageName={villageName}
          tagline={village?.tagline}
        />
      ) : village ? (
        <>
          <Image
            src={village.imageUrl}
            alt={`${village.villageName} by ${village.playerName}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
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

          <section className="absolute inset-x-4 bottom-4 z-[900] sm:inset-x-8 sm:bottom-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-lg border border-white/45 bg-[#fffefa]/88 p-4 shadow-[0_24px_70px_rgba(8,16,24,0.22)] backdrop-blur-md sm:flex-row sm:items-end sm:justify-between sm:p-5">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#e76f51]">
                  Village Preview
                </p>
                <h1 className="mt-2 truncate text-3xl font-black leading-none text-[#231f20] sm:text-4xl">
                  {villageName}
                </h1>
                <p className="mt-2 truncate text-base font-black text-[#2a9d8f]">
                  {playerName}
                </p>
                <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-[#5f574b]">
                  {village.tagline ??
                    "This public page is ready for the full village reconstruction flow."}
                </p>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
