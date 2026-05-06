import Image from "next/image";
import Link from "next/link";

import type { PublicVillageCard, VillageGalleryStatus } from "@/types/village";

type VillageGalleryProps = {
  villages: PublicVillageCard[];
  status: VillageGalleryStatus;
};

export function VillageGallery({ villages, status }: VillageGalleryProps) {
  if (villages.length === 0) {
    return <EmptyVillageGallery status={status} />;
  }

  return (
    <div className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto px-6 pb-8 pt-2 sm:px-10 lg:px-[max(2.5rem,calc((100vw-1120px)/2))]">
      {villages.map((village) => (
        <VillageCard key={village.mapId} village={village} />
      ))}
    </div>
  );
}

function VillageCard({ village }: { village: PublicVillageCard }) {
  const villageHref = `/village/${encodeURIComponent(village.boardId)}`;
  const shortBoardId = village.boardId.slice(0, 8);

  return (
    <Link
      href={villageHref}
      className="group w-[min(82vw,23rem)] flex-none snap-center outline-none sm:w-[24rem]"
    >
      <article className="overflow-hidden rounded-lg border border-[#2f2a1f]/12 bg-[#fffefa] shadow-[0_24px_60px_rgba(47,42,31,0.16)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_30px_76px_rgba(47,42,31,0.22)] group-focus-visible:ring-4 group-focus-visible:ring-[#2a9d8f]/30">
        <div className="relative aspect-[16/11] overflow-hidden bg-[#1f6f91]">
          <Image
            src={village.imageUrl}
            alt={`${village.villageName} by ${village.playerName}`}
            fill
            sizes="(max-width: 640px) 82vw, 24rem"
            className="object-cover transition duration-500 group-hover:scale-[1.035]"
          />
          <div className="absolute inset-0 bg-linear-to-t from-[#081018]/70 via-[#081018]/8 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-white/45" />

          <p className="absolute left-4 top-4 rounded-md border border-white/50 bg-white/88 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#264653] shadow-[0_8px_18px_rgba(8,16,24,0.16)] backdrop-blur-sm">
            {shortBoardId}
          </p>
          {village.biome ? (
            <p className="absolute right-4 top-4 rounded-md border border-white/50 bg-[#fff7e8]/88 px-3 py-2 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#315446] shadow-[0_8px_18px_rgba(8,16,24,0.12)] backdrop-blur-sm">
              {village.biome}
            </p>
          ) : null}
        </div>

        <div className="relative p-5 pt-6">
          <div className="absolute -top-7 left-5">
            {village.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={village.avatarUrl}
                alt=""
                className="h-14 w-14 rounded-lg border-2 border-[#fffefa] bg-white object-cover shadow-[0_10px_24px_rgba(47,42,31,0.22)]"
              />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-lg border-2 border-[#fffefa] bg-[#2a9d8f] text-lg font-black text-white shadow-[0_10px_24px_rgba(47,42,31,0.22)]">
                {village.playerName.slice(0, 1)}
              </div>
            )}
          </div>

          <div className="min-w-0 pl-20">
            <h3 className="truncate text-xl font-black leading-tight text-[#231f20]">
              {village.villageName}
            </h3>
            <p className="mt-1 truncate text-sm font-black text-[#2a9d8f]">
              {village.playerName}
            </p>
          </div>

          {village.tagline ? (
            <p className="mt-6 line-clamp-2 min-h-10 text-sm leading-5 text-[#5f574b]">
              {village.tagline}
            </p>
          ) : (
            <p className="mt-6 min-h-10 text-sm leading-5 text-[#5f574b]">
              A tiny world with its own rhythm.
            </p>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-[#2f2a1f]/10 pt-4">
            <span className="text-xs font-black uppercase tracking-[0.18em] text-[#7b6f60]">
              Open map
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#231f20] text-sm font-black text-white transition group-hover:bg-[#e76f51]">
              {"->"}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function EmptyVillageGallery({ status }: { status: VillageGalleryStatus }) {
  const missingKeys = status.missingKeys.join(", ");

  return (
    <div className="mx-auto max-w-6xl px-6 pb-8 pt-2 sm:px-10">
      <div className="rounded-lg border border-[#2f2a1f]/10 bg-white p-6 shadow-[0_18px_45px_rgba(47,42,31,0.1)]">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-[#e76f51]">
          {status.source === "notConfigured"
            ? "Firebase not connected"
            : "Firebase connected"}
        </p>
        <h3 className="mt-3 text-2xl font-black text-[#231f20]">
          {status.message}
        </h3>
        {missingKeys ? (
          <p className="mt-4 text-base leading-7 text-[#5f574b]">
            Missing: <span className="font-bold">{missingKeys}</span>
          </p>
        ) : null}
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#7b6f60]">
          The gallery checks SwarmVillageMaps, maps/player_villages, and /Users
          from server-only Firebase Admin code.
        </p>
      </div>
    </div>
  );
}
