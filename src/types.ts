export type TapeSide = "A" | "B";
export type SongSource = "youtube" | "spotify" | "file";
export type ThemeId = "none" | "birthday" | "anniversary" | "travel" | "good-day" | "office" | "commute";

export type Song = {
  id: string;
  url: string;
  title: string;
  artist: string;
  artworkUrl: string;
  source?: SongSource;
};

export type PlacedSticker = {
  id: string;
  rotation: number;
  image?: string;
};

export type Mixtape = {
  coverId: string;
  stickers: PlacedSticker[];
  sideA: Song[];
  sideB: Song[];
  note: string;
  themeId: ThemeId;
  photo: string;
  photoCaption: string;
};

export const MAX_SONGS_PER_SIDE = 10;
export const MAX_STICKERS = 3;
export const MAX_NOTE = 280;
export const MAX_PHOTO_CAPTION = 24;

export function songSource(song: Song): SongSource {
  return song.source ?? "youtube";
}
