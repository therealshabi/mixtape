import type { Mixtape, Song, SongSource, ThemeId } from "../types";
import { fallbackArtworkDataUrl } from "./artwork";
import { spotifyUrl } from "./media";
import { parseYouTubeId, thumbnailUrl, watchUrl } from "./youtube";

type CompactSong = [string, string, string, string?, string?, string?];
type Compact = {
  c: string;
  s: [string, number][];
  a: CompactSong[];
  b: CompactSong[];
  n: string;
  t?: string;
  p?: string;
  pc?: string;
};

function packSongs(songs: Song[]): CompactSong[] {
  return songs.map((song) => {
    const source = song.source ?? "youtube";
    const extra: CompactSong = [song.id, song.title, song.artist, source];
    if (source === "spotify" && song.artworkUrl && song.artworkUrl.startsWith("http")) extra.push(song.artworkUrl);
    if (source === "file") {
      const art =
        song.artworkUrl?.startsWith("data:") && song.artworkUrl.length < 18000 ? song.artworkUrl : "";
      extra.push(art, song.url.startsWith("http") ? song.url : "");
    }
    return extra;
  });
}

function unpackSongs(songs: CompactSong[]): Song[] {
  return songs.map(([id, title, artist, source, extra1, extra2]) => {
    const kind = (source as SongSource | undefined) || "youtube";
    const youtubeId = parseYouTubeId(id) || id;
    if (kind === "file") {
      const art = extra1 && extra1.startsWith("data:") ? extra1 : "";
      const hosted = extra2 || (extra1?.startsWith("http") ? extra1 : "");
      return {
        id,
        url: hosted,
        title,
        artist,
        artworkUrl: art || fallbackArtworkDataUrl(title || "track"),
        source: kind,
      };
    }
    return {
      id: kind === "youtube" ? youtubeId : id,
      url: kind === "spotify" ? spotifyUrl(id) : watchUrl(youtubeId),
      title,
      artist,
      artworkUrl: extra1 || (kind === "youtube" ? thumbnailUrl(youtubeId) : ""),
      source: kind,
    };
  });
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
    t: tape.themeId === "none" ? undefined : tape.themeId,
    p: tape.photo || undefined,
    pc: tape.photoCaption?.trim() || undefined,
  };
  const json = JSON.stringify(compact);
  return toBase64Url(new TextEncoder().encode(json));
}

export function mixtapePayload(hash: string, params: Record<string, string | undefined>): string {
  const fromHash = hash.startsWith("#") ? hash.slice(1) : hash;
  if (fromHash) return fromHash;
  const splat = params["*"] || params.id || "";
  return splat.replace(/\/+$/, "");
}

export function isTapeId(value: string): boolean {
  return /^[a-z0-9]{8,14}$/.test(value) && !value.startsWith("ey");
}

export function listenUrl(origin: string, payload: string): string {
  if (isTapeId(payload)) return `${origin}/m/${payload}`;
  return `${origin}/m#${payload}`;
}

const TAPE_CACHE = "mixtape-id:";

function tapeUrls(id?: string) {
  if (id) {
    const encoded = encodeURIComponent(id);
    return [`/api/tape/${encoded}`, `/.netlify/functions/tape?id=${encoded}`];
  }
  return ["/api/tape", "/.netlify/functions/tape"];
}

async function tapeJson<T extends Record<string, unknown>>(urls: string[], init?: RequestInit): Promise<T> {
  let lastError = "Couldn't reach the mixtape shelf";
  for (const url of urls) {
    try {
      const res = await fetch(url, init);
      const type = res.headers.get("content-type") || "";
      if (!type.includes("json")) continue;
      const body = (await res.json()) as T & { error?: string };
      if (!res.ok) {
        lastError = body.error || lastError;
        continue;
      }
      return body;
    } catch {
      /* try next */
    }
  }
  throw new Error(lastError);
}

export async function publishTape(payload: string): Promise<string> {
  const body = await tapeJson<{ id?: string }>(tapeUrls(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  if (!body.id || !isTapeId(body.id)) {
    throw new Error("Couldn't save this mixtape link");
  }
  try {
    sessionStorage.setItem(TAPE_CACHE + body.id, payload);
  } catch {
    /* ignore */
  }
  return body.id;
}

export async function fetchTapePayload(id: string): Promise<string> {
  try {
    const cached = sessionStorage.getItem(TAPE_CACHE + id);
    if (cached) return cached;
  } catch {
    /* ignore */
  }
  const body = await tapeJson<{ payload?: string }>(tapeUrls(id));
  if (!body.payload) throw new Error("Mixtape not found");
  try {
    sessionStorage.setItem(TAPE_CACHE + id, body.payload);
  } catch {
    /* ignore */
  }
  return body.payload;
}

export function decodeMixtape(payload: string): Mixtape | null {
  try {
    const json = new TextDecoder().decode(fromBase64Url(payload));
    const compact = JSON.parse(json) as Compact;
    if (!compact.c) return null;
    const themeId = (compact.t as ThemeId | undefined) || "none";
    return {
      coverId: compact.c,
      stickers: (compact.s || []).map(([id, rotation]) => ({ id, rotation: rotation || 0 })),
      sideA: unpackSongs(compact.a || []),
      sideB: unpackSongs(compact.b || []),
      note: compact.n || "",
      themeId: ["none", "birthday", "anniversary", "travel", "good-day"].includes(themeId) ? themeId : "none",
      photo: compact.p || "",
      photoCaption: compact.pc || "",
    };
  } catch {
    return null;
  }
}

export function allSongs(tape: Pick<Mixtape, "sideA" | "sideB">): Song[] {
  return [...tape.sideA, ...tape.sideB];
}
