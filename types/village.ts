export type PublicVillageCard = {
  uid: string;
  mapId: string;
  href: string;
  imageUrl: string;
  playerName: string;
  villageName: string;
  tagline: string | null;
  avatarUrl: string | null;
  biome: string | null;
  updatedAt: string | null;
  boardId: string;
};

export type VillageGallerySource =
  | "publicVillages"
  | "swarmVillageMaps"
  | "storageAndUsers"
  | "notConfigured"
  | "empty"
  | "error";

export type VillageGalleryStatus = {
  firebaseReady: boolean;
  source: VillageGallerySource;
  message: string;
  missingKeys: string[];
};

export type VillageGalleryData = {
  villages: PublicVillageCard[];
  status: VillageGalleryStatus;
};
