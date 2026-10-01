import type { Mixtape, Song } from "../types";

type CompactSong = [string, string, string];
type Compact = {
  c: string;
  s: [string, number][];
  a: CompactSong[];
  b: CompactSong[];
  n: string;
};

function packSongs(songs: Song[]): CompactSong[] {
  return songs.map((song) => [song.id, song.title, song.artist]);
}

function unpackSongs(songs: CompactSong[]): Song[] {
  return songs.map(([id, title, artist]) => ({
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title,
    artist,
    artworkUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  }));
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function encodeMixtape(tape: Mixtape): string {
  const compact: Compact = {
    c: tape.coverId,
    s: tape.stickers.map((sticker) => [sticker.id, sticker.rotation]),
    a: packSongs(tape.sideA),
    b: packSongs(tape.sideB),
    n: tape.note,
  };
  const json = JSON.stringify(compact);
  return toBase64Url(new TextEncoder().encode(json));
}

export function decodeMixtape(payload: string): Mixtape | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(payload));
    const compact = JSON.parse(json) as Compact;
    if (!compact.c) return null;
    return {
      coverId: compact.c,
      stickers: (compact.s || []).map(([id, rotation]) => ({ id, rotation: rotation || 0 })),
      sideA: unpackSongs(compact.a || []),
      sideB: unpackSongs(compact.b || []),
      note: compact.n || "",
    };
  } catch {
    return null;
  }
}

export function allSongs(tape: Pick<Mixtape, "sideA" | "sideB">): Song[] {
  return [...tape.sideA, ...tape.sideB];
}
