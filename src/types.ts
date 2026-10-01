export type TapeSide = "A" | "B";

export type Song = {
  id: string;
  url: string;
  title: string;
  artist: string;
  artworkUrl: string;
};

export type PlacedSticker = {
  id: string;
  rotation: number;
};

export type Mixtape = {
  coverId: string;
  stickers: PlacedSticker[];
  sideA: Song[];
  sideB: Song[];
  note: string;
};

export const MAX_SONGS_PER_SIDE = 10;
export const MAX_STICKERS = 3;
export const MAX_NOTE = 280;
