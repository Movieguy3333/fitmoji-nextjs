import { connection } from "next/server";

import { VillageGallery } from "@/components/village-gallery";
import { getVillageGalleryData } from "@/data/public-villages";

export default async function Home() {
  await connection();

  const gallery = await getVillageGalleryData();
  const villages = gallery.villages;

  return (
    <main className="min-h-screen overflow-hidden bg-[#fbf6ec] text-[#231f20]">
      <section className="mx-auto flex min-h-[54vh] max-w-6xl flex-col justify-end px-6 pb-10 pt-10 sm:px-10 lg:pt-16">
        <p className="text-sm font-black uppercase tracking-[0.24em] text-[#2a9d8f]">
          Fitmoji
        </p>
        <div className="mt-5 max-w-4xl">
          <h1 className="text-5xl font-black leading-[0.95] text-[#231f20] sm:text-7xl lg:text-8xl">
            Every tiny village has a story.
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-[#5f574b] sm:text-xl">
            Wander through player-built worlds, peek at their momentum, and
            step into the village that makes you want to move.
          </p>
        </div>
      </section>

      <section aria-label="Player villages" className="pb-14">
        <div className="mx-auto mb-4 flex max-w-6xl items-end justify-between gap-6 px-6 sm:px-10">
          <div>
            <h2 className="text-2xl font-black text-[#231f20] sm:text-3xl">
              Village gallery
            </h2>
            <p className="mt-2 text-sm font-semibold text-[#7b6f60]">
              Swipe sideways to explore the public village roll.
            </p>
          </div>
        </div>
        <VillageGallery villages={villages} status={gallery.status} />
      </section>
    </main>
  );
}
