# Public Village Data

The landing page reads Firebase data only from server-only code. Browsers should
not read `/Users/{uid}` directly and should not list `maps/player_villages`.

## Firestore

The app can read the existing live map collection:

```txt
SwarmVillageMaps/{mapId}
```

The gallery preserves `mapId` in the click through URL:

```txt
/village/{mapId}
```

For each map document, the app looks for an owner/player UID in fields such as
`uid`, `userId`, `ownerUid`, `playerUid`, or `createdBy`. It then uses that UID
to load a screenshot from Storage and display-safe player fields from `/Users`.

Optionally, create one sanitized public document per published village:

```txt
publicVillages/{uid}
```

Supported fields:

```ts
{
  published: true,
  displayName: string,
  playerName?: string,
  username?: string,
  villageName: string,
  title?: string,
  tagline?: string,
  bio?: string,
  avatarUrl?: string,
  photoURL?: string,
  biome?: string,
  coverImagePath?: string,
  screenshotPath?: string,
  imagePath?: string,
  featuredOrder?: number,
  updatedAt?: Timestamp | string
}
```

`coverImagePath`, `screenshotPath`, or `imagePath` must point inside the same
player's folder:

```txt
maps/player_villages/{uid}/...
```

If no image path is set, the app falls back to:

```txt
maps/player_villages/{uid}/cover.png
```

## Rules Sketch

Keep private player data private:

```js
match /Users/{uid} {
  allow read, write: if request.auth.uid == uid;
}
```

Expose only sanitized public village records:

```js
match /publicVillages/{uid} {
  allow read: if resource.data.published == true;
  allow write: if request.auth.uid == uid;
}
```

Storage screenshots can stay private because the Next route handler serves
published screenshots through Firebase Admin:

```txt
GET /api/villages/{uid}/screenshot
```

That route checks the server-side village record first, then refuses any storage
path outside `maps/player_villages/{uid}/`.
