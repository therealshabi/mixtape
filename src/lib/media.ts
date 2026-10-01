import type { Song, SongSource } from "../types";
import { compressArtwork, fallbackArtworkDataUrl, readAudioTags, titleFromFilename } from "./artwork";
import { hostAudioFile } from "./hostAudio";
import { getLocalFile, saveLocalFile } from "./idb";
import { fetchTrack, isYouTubeUrl, parseYouTubeId, thumbnailUrl, watchUrl } from "./youtube";

const SPOTIFY_TRACK = /(?:open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/|spotify:track:)([A-Za-z0-9]+)/i;

export function parseSpotifyId(input: string): string | null {
  const match = input.trim().match(SPOTIFY_TRACK);
  return match?.[1] ?? null;
}

export function isSpotifyUrl(input: string): boolean {
  return parseSpotifyId(input) !== null;
}

export function spotifyUrl(id: string): string {
  return `https://open.spotify.com/track/${id}`;
}

export function spotifyEmbed(id: string, autoplay = false): string {
  return `https://open.spotify.com/embed/track/${id}?utm_source=generator${autoplay ? "&autoplay=1" : ""}`;
}

export function spotifyUri(id: string): string {
  return `spotify:track:${id}`;
}

export function detectSource(input: string): SongSource | null {
  if (isYouTubeUrl(input)) return "youtube";
  if (isSpotifyUrl(input)) return "spotify";
  return null;
}

type OEmbed = { title?: string; author_name?: string; thumbnail_url?: string };

async function lookupItunes(title: string): Promise<{ artist: string; artwork: string }> {
  const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&entity=song&limit=5`,
  );
  if (!res.ok) return { artist: "", artwork: "" };
  const data = (await res.json()) as {
    results?: { trackName?: string; artistName?: string; artworkUrl100?: string }[];
  };
  const hit = data.results?.find((item) => item.trackName) ?? data.results?.[0];
  const artwork = hit?.artworkUrl100 ? hit.artworkUrl100.replace("100x100bb", "300x300bb") : "";
  return { artist: hit?.artistName || "", artwork };
}

export async function fetchSpotifyTrack(input: string): Promise<Song> {
  const id = parseSpotifyId(input);
  if (!id) throw new Error("Please paste a valid Spotify track link");
  const url = spotifyUrl(id);
  let title = "";
  let artist = "";
  let artworkUrl = "";

  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
    if (res.ok) {
      const data = (await res.json()) as OEmbed;
      title = data.title?.trim() || "";
      artist = data.author_name?.trim() || "";
      artworkUrl = data.thumbnail_url || "";
    }
  } catch {
    /* try iTunes next */
  }

  if ((!artist || !artworkUrl) && title) {
    try {
      const extras = await lookupItunes(title);
      artist = artist || extras.artist;
      artworkUrl = artworkUrl || extras.artwork;
    } catch {
      /* keep what we have */
    }
  }

  return {
    id,
    url,
    title: title || "Spotify track",
    artist,
    artworkUrl,
    source: "spotify",
  };
}

export async function fetchYouTubeSong(input: string): Promise<Song> {
  const track = await fetchTrack(input);
  return { ...track, source: "youtube" };
}

export async function importLocalSong(file: File): Promise<Song> {
  if (!file.type.startsWith("audio/") && !/\.(mp3|m4a|aac|wav|ogg|flac|aiff)$/i.test(file.name)) {
    throw new Error("Please pick an audio file");
  }
  const id = `file-${crypto.randomUUID()}`;
  await saveLocalFile(id, file);
  const fromName = titleFromFilename(file.name);
  const tags = await readAudioTags(file, file.name);
  let artworkUrl = "";
  if (tags.artwork) {
    try {
      artworkUrl = await compressArtwork(tags.artwork, 72);
    } catch {
      artworkUrl = "";
    }
  }
  if (!artworkUrl) {
    artworkUrl = fallbackArtworkDataUrl(tags.title || fromName.title);
  }
  let url = "";
  try {
    url = await hostAudioFile(file, file.name);
  } catch {
    url = "";
  }
  return {
    id,
    url,
    title: tags.title || fromName.title,
    artist: tags.artist || fromName.artist,
    artworkUrl,
    source: "file",
  };
}

export async function resolveLink(input: string): Promise<Song> {
  const source = detectSource(input);
  if (source === "youtube") return fetchYouTubeSong(input);
  if (source === "spotify") return fetchSpotifyTrack(input);
  throw new Error("Paste a YouTube or Spotify link");
}

export function songWatchUrl(song: Song): string | null {
  if ((song.source ?? "youtube") === "youtube") return watchUrl(parseYouTubeId(song.url) || song.id);
  if (song.source === "spotify") return spotifyUrl(song.id);
  return null;
}

export function songArtwork(song: Song): string {
  if (song.artworkUrl) return song.artworkUrl;
  if ((song.source ?? "youtube") === "youtube") return thumbnailUrl(song.id);
  return "";
}

export async function ensureHostedSongs(songs: Song[]): Promise<Song[]> {
  const next: Song[] = [];
  for (const song of songs) {
    if (song.source !== "file" || song.url.startsWith("http")) {
      next.push(song);
      continue;
    }
    const blob = await getLocalFile(song.id);
    if (!blob) {
      next.push(song);
      continue;
    }
    try {
      next.push({ ...song, url: await hostAudioFile(blob, `${song.title || "track"}.mp3`) });
    } catch {
      next.push(song);
    }
  }
  return next;
}
