import { useEffect, useMemo, useRef, useState } from "react";
import { getLocalFile } from "../lib/idb";
import { songArtwork, songWatchUrl, spotifyUri } from "../lib/media";
import { thumbnailUrl } from "../lib/youtube";
import { songSource, type Song, type TapeSide } from "../types";
import { SongThumb } from "./SongThumb";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          width?: string | number;
          height?: string | number;
          playerVars: Record<string, number | string>;
          events: Record<string, (event?: { data: number; target?: YtPlayer }) => void>;
        },
      ) => YtPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void;
    __spotifyIframeApi?: SpotifyIFrameAPI;
  }
}

type YtPlayer = {
  loadVideoById: (id: string) => void;
  cueVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  seekTo: (seconds: number, allowSeek: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

type SpotifyEmbedController = {
  loadUri: (uri: string) => void;
  play: () => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (seconds: number) => void;
  destroy: () => void;
  addListener: (event: string, cb: (event: { data?: { isPaused?: boolean; position?: number; duration?: number } }) => void) => void;
};

type SpotifyIFrameAPI = {
  createController: (
    el: HTMLElement,
    opts: { uri: string; width: string | number; height: string | number },
    cb: (controller: SpotifyEmbedController) => void,
  ) => void;
};

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.getElementById("yt-iframe-api")) {
      const script = document.createElement("script");
      script.id = "yt-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }
    if (window.YT?.Player) resolve();
  });
}

function loadSpotifyApi(): Promise<SpotifyIFrameAPI> {
  const cached = window.__spotifyIframeApi;
  if (cached) return Promise.resolve(cached);
  return new Promise((resolve) => {
    const prev = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      window.__spotifyIframeApi = api;
      prev?.(api);
      resolve(api);
    };
    document.getElementById("spotify-iframe-api")?.remove();
    const script = document.createElement("script");
    script.id = "spotify-iframe-api";
    script.async = true;
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    document.head.appendChild(script);
  });
}

function upcomingSongs(
  sideA: Song[],
  sideB: Song[],
  playSide: TapeSide,
  index: number,
  hasBoth: boolean,
  count = 2,
): Song[] {
  const catalog = hasBoth ? null : [...sideA, ...sideB];
  let side = playSide;
  let list = hasBoth ? (playSide === "A" ? sideA : sideB) : catalog || [];
  let i = index;
  const out: Song[] = [];
  const seen = new Set<string>();
  const keyOf = (song: Song) => `${songSource(song)}:${song.id}`;
  if (list[index]) seen.add(keyOf(list[index]));
  while (out.length < count && list.length) {
    if (i < list.length - 1) {
      i += 1;
      const next = list[i];
      const key = keyOf(next);
      if (seen.has(key)) break;
      seen.add(key);
      out.push(next);
      continue;
    }
    if (hasBoth && side === "A" && sideB.length) {
      side = "B";
      list = sideB;
      i = 0;
      const next = list[0];
      const key = keyOf(next);
      if (seen.has(key)) break;
      seen.add(key);
      out.push(next);
      continue;
    }
    if (!hasBoth && list.length > 1) {
      i = (i + 1) % list.length;
      const next = list[i];
      const key = keyOf(next);
      if (seen.has(key)) break;
      seen.add(key);
      out.push(next);
      continue;
    }
    break;
  }
  return out;
}

function warmArtwork(songs: Song[]) {
  for (const song of songs) {
    const src = songArtwork(song) || (songSource(song) === "youtube" ? thumbnailUrl(song.id) : "");
    if (!src || src.startsWith("data:")) continue;
    const img = new Image();
    img.decoding = "async";
    img.src = src;
  }
}

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PrevIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M4.5 4.5V17.5" stroke="#090909" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M17.5 4.5L8.5 11L17.5 17.5V4.5Z" stroke="#090909" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M17.5 4.5V17.5" stroke="#090909" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4.5 4.5L13.5 11L4.5 17.5V4.5Z" stroke="#090909" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="15" height="17" viewBox="0 0 15 17" fill="none" aria-hidden="true">
      <path d="M2 1.5L13 8.5L2 15.5V1.5Z" fill="white" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="16" viewBox="0 0 14 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="1" width="4" height="14" rx="1.5" fill="white" />
      <rect x="8.5" y="1" width="4" height="14" rx="1.5" fill="white" />
    </svg>
  );
}

function FlipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 5.5h7.5a3 3 0 0 1 0 6H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M5.5 3 3 5.5 5.5 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 10.5H5.5a3 3 0 0 1 0-6H7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10.5 13 13 10.5 10.5 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Player({
  sideA,
  sideB,
  onFirstPlay,
  onPlayingChange,
  onSideChange,
}: {
  sideA: Song[];
  sideB: Song[];
  onFirstPlay?: () => void;
  onPlayingChange?: (playing: boolean) => void;
  onSideChange?: (side: TapeSide) => void;
}) {
  const playerRef = useRef<YtPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytSlotRef = useRef<HTMLDivElement | null>(null);
  const ytWarmSlotRef = useRef<HTMLDivElement | null>(null);
  const spotifySlotRef = useRef<HTMLDivElement | null>(null);
  const spotifyWarmSlotRef = useRef<HTMLDivElement | null>(null);
  const spotifyRef = useRef<SpotifyEmbedController | null>(null);
  const catalog = useMemo(() => [...sideA, ...sideB], [sideA, sideB]);
  const hasBothSides = sideA.length > 0 && sideB.length > 0;
  const [playSide, setPlaySide] = useState<TapeSide>("A");
  const songs = hasBothSides ? (playSide === "A" ? sideA : sideB) : catalog;
  const songsRef = useRef(songs);
  songsRef.current = songs;
  const readyRef = useRef(false);
  const spotifyReadyRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const wantPlayRef = useRef(false);
  const switchingRef = useRef(false);
  const indexRef = useRef(0);
  const firstPlayRef = useRef(false);
  const onFirstPlayRef = useRef(onFirstPlay);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onSideChangeRef = useRef(onSideChange);
  const fileUrlRef = useRef("");
  const spotifyLoadedRef = useRef("");
  const spotifyHoldRef = useRef(false);
  const spotifyPositionRef = useRef(0);
  const ytTimerRef = useRef<number | undefined>(undefined);
  const progressGenRef = useRef(0);
  const ytIdRef = useRef("");
  const ytSyncedKeyRef = useRef<string | null>(null);
  const ytWarmPoolRef = useRef<{ id: string; player: YtPlayer }[]>([]);
  const spotifyWarmPoolRef = useRef<{ id: string; controller: SpotifyEmbedController }[]>([]);
  const fileWarmRef = useRef<Map<string, { url: string; audio: HTMLAudioElement; ownedBlob: boolean }>>(new Map());
  const sourceRef = useRef<ReturnType<typeof songSource> | null>(null);
  const hasBothRef = useRef(hasBothSides);
  const sideRef = useRef(playSide);
  const sideALenRef = useRef(sideA.length);
  hasBothRef.current = hasBothSides;
  sideRef.current = playSide;
  sideALenRef.current = sideA.length;
  const idsKey = useMemo(() => catalog.map((song) => `${songSource(song)}:${song.id}`).join(","), [catalog]);
  const hasYouTube = catalog.some((song) => songSource(song) === "youtube");
  const hasSpotify = catalog.some((song) => songSource(song) === "spotify");
  const firstYt = catalog.find((song) => songSource(song) === "youtube");
  const firstSpotify = catalog.find((song) => songSource(song) === "spotify");
  const [index, setIndex] = useState(0);
  const currentSong = songs[index] ?? songs[0];
  const source = currentSong ? songSource(currentSong) : null;
  sourceRef.current = source;
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fileMissing, setFileMissing] = useState(false);

  useEffect(() => {
    onFirstPlayRef.current = onFirstPlay;
    onPlayingChangeRef.current = onPlayingChange;
    onSideChangeRef.current = onSideChange;
  }, [onFirstPlay, onPlayingChange, onSideChange]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    setPlaySide("A");
    setIndex(0);
  }, [idsKey]);

  function markPlaying(next: boolean) {
    setPlaying(next);
    onPlayingChangeRef.current?.(next);
  }

  function playSpotify(fromStart = false) {
    const controller = spotifyRef.current;
    if (!controller) return;
    try {
      if (fromStart) {
        try {
          controller.seek(0);
        } catch {
          /* ignore */
        }
        controller.play();
      } else {
        controller.resume();
      }
    } catch {
      try {
        controller.togglePlay();
      } catch {
        /* ignore */
      }
    }
    const pos = spotifyPositionRef.current;
    if (!fromStart && pos > 0.5) {
      window.setTimeout(() => {
        if (sourceRef.current !== "spotify") return;
        try {
          spotifyRef.current?.seek(Math.round(pos));
        } catch {
          /* ignore */
        }
      }, 80);
    }
  }

  function pauseSpotify() {
    try {
      spotifyRef.current?.pause();
    } catch {
      /* ignore */
    }
  }

  function clearYtTimer() {
    if (ytTimerRef.current !== undefined) {
      window.clearInterval(ytTimerRef.current);
      ytTimerRef.current = undefined;
    }
  }

  function pauseYouTube() {
    try {
      playerRef.current?.pauseVideo();
    } catch {
      /* ignore */
    }
    clearYtTimer();
  }

  function restartYouTube(player: YtPlayer, id: string, play: boolean) {
    ytIdRef.current = id;
    if (play) {
      player.loadVideoById(id);
      player.unMute?.();
      player.setVolume?.(100);
      return;
    }
    try {
      player.cueVideoById(id);
    } catch {
      player.loadVideoById(id);
      player.pauseVideo();
    }
    try {
      player.seekTo(0, true);
    } catch {
      /* ignore */
    }
  }

  function syncYouTube(id: string, play: boolean, fromStart = false) {
    const player = playerRef.current;
    if (!player || !readyRef.current) {
      if (play) pendingPlayRef.current = true;
      return;
    }
    try {
      if (ytIdRef.current !== id || fromStart) {
        restartYouTube(player, id, play);
        return;
      }
      if (play) {
        player.unMute?.();
        player.setVolume?.(100);
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } catch {
      if (play) {
        try {
          player.playVideo();
        } catch {
          /* ignore */
        }
      }
    }
  }

  function resetProgress() {
    progressGenRef.current += 1;
    spotifyPositionRef.current = 0;
    setTime(0);
    setDuration(0);
    clearYtTimer();
    return progressGenRef.current;
  }

  function applyProgress(nextTime: number, nextDuration?: number, gen = progressGenRef.current) {
    if (gen !== progressGenRef.current) return;
    if (Number.isFinite(nextTime) && nextTime >= 0) setTime(nextTime);
    if (typeof nextDuration === "number" && Number.isFinite(nextDuration) && nextDuration > 0) {
      setDuration(nextDuration);
    }
  }

  function startYtTimer() {
    clearYtTimer();
    const gen = progressGenRef.current;
    ytTimerRef.current = window.setInterval(() => {
      if (gen !== progressGenRef.current || sourceRef.current !== "youtube") {
        clearYtTimer();
        return;
      }
      try {
        applyProgress(playerRef.current?.getCurrentTime() || 0, playerRef.current?.getDuration() || 0, gen);
      } catch {
        /* ignore */
      }
    }, 250);
  }

  function eject() {
    if (firstPlayRef.current) return;
    firstPlayRef.current = true;
    onFirstPlayRef.current?.();
  }

  function flipTo(next: TapeSide, continuePlaying = false, startIndex = 0) {
    if (!hasBothRef.current || sideRef.current === next) return;
    switchingRef.current = true;
    if (!continuePlaying) {
      wantPlayRef.current = false;
      pendingPlayRef.current = false;
      markPlaying(false);
    }
    resetProgress();
    sideRef.current = next;
    setPlaySide(next);
    setIndex(startIndex);
    onSideChangeRef.current?.(next);
  }

  function goToNext() {
    const list = songsRef.current;
    const i = indexRef.current;
    if (!list.length) return;
    if (i < list.length - 1) {
      setIndex(i + 1);
      return;
    }
    if (hasBothRef.current && sideRef.current === "A") {
      flipTo("B", wantPlayRef.current);
      return;
    }
    if (!hasBothRef.current) {
      setIndex((i + 1) % list.length);
      return;
    }
    wantPlayRef.current = false;
    pendingPlayRef.current = false;
    markPlaying(false);
  }

  function goToPrev() {
    const list = songsRef.current;
    const i = indexRef.current;
    if (!list.length) return;
    if (i > 0) {
      setIndex(i - 1);
      return;
    }
    if (hasBothRef.current && sideRef.current === "B") {
      flipTo("A", wantPlayRef.current, Math.max(0, sideALenRef.current - 1));
      return;
    }
    if (!hasBothRef.current) {
      setIndex((i - 1 + list.length) % list.length);
    }
  }

  function onYtStateChange(event?: { data: number; target?: YtPlayer }) {
    const target = event?.target;
    if (target && playerRef.current && target !== playerRef.current) {
      if (event?.data === 1) {
        try {
          target.mute?.();
          target.setVolume?.(0);
          target.pauseVideo();
        } catch {
          /* ignore */
        }
      }
      return;
    }
    if (sourceRef.current !== "youtube") {
      clearYtTimer();
      return;
    }
    if (event?.data === 1) {
      if (!wantPlayRef.current) return;
      pendingPlayRef.current = false;
      markPlaying(true);
      eject();
      startYtTimer();
    } else if (event?.data === 2) {
      clearYtTimer();
      if (!switchingRef.current && !wantPlayRef.current) markPlaying(false);
    } else if (event?.data === 0) {
      clearYtTimer();
      if (switchingRef.current || sourceRef.current !== "youtube") return;
      markPlaying(false);
      goToNext();
    }
  }

  function destroyYtWarms() {
    for (const warm of ytWarmPoolRef.current) {
      if (warm.player === playerRef.current) continue;
      try {
        warm.player.destroy();
      } catch {
        /* ignore */
      }
    }
    ytWarmPoolRef.current = [];
    ytWarmSlotRef.current?.replaceChildren();
  }

  function destroySpotifyWarms() {
    for (const warm of spotifyWarmPoolRef.current) {
      if (warm.controller === spotifyRef.current) continue;
      try {
        warm.controller.destroy();
      } catch {
        /* ignore */
      }
    }
    spotifyWarmPoolRef.current = [];
    spotifyWarmSlotRef.current?.replaceChildren();
  }

  function pruneFileWarms(keepIds: Set<string>) {
    for (const [id, warm] of fileWarmRef.current) {
      if (keepIds.has(id)) continue;
      try {
        warm.audio.pause();
        warm.audio.removeAttribute("src");
        warm.audio.load();
      } catch {
        /* ignore */
      }
      if (warm.ownedBlob && warm.url !== fileUrlRef.current) {
        URL.revokeObjectURL(warm.url);
      }
      fileWarmRef.current.delete(id);
    }
  }

  function promoteYtWarm(id: string): boolean {
    const idx = ytWarmPoolRef.current.findIndex((warm) => warm.id === id);
    if (idx < 0) return false;
    const warm = ytWarmPoolRef.current[idx];
    const old = playerRef.current;
    ytWarmPoolRef.current.splice(idx, 1);
    playerRef.current = warm.player;
    readyRef.current = true;
    ytIdRef.current = id;
    if (old && old !== warm.player) {
      try {
        old.pauseVideo();
        old.mute?.();
        old.setVolume?.(0);
      } catch {
        /* ignore */
      }
      ytWarmPoolRef.current.push({ id: "", player: old });
    }
    if (import.meta.env.DEV) {
      (window as unknown as { __mtYt?: YtPlayer | null }).__mtYt = playerRef.current;
    }
    return true;
  }

  function promoteSpotifyWarm(id: string): boolean {
    const idx = spotifyWarmPoolRef.current.findIndex((warm) => warm.id === id);
    if (idx < 0) return false;
    const warm = spotifyWarmPoolRef.current[idx];
    const old = spotifyRef.current;
    spotifyWarmPoolRef.current.splice(idx, 1);
    spotifyRef.current = warm.controller;
    spotifyReadyRef.current = true;
    spotifyLoadedRef.current = id;
    if (old && old !== warm.controller) {
      try {
        old.pause();
      } catch {
        /* ignore */
      }
      spotifyWarmPoolRef.current.push({ id: "", controller: old });
    }
    return true;
  }

  function attachSpotifyWarmListeners(controller: SpotifyEmbedController) {
    controller.addListener("playback_update", (event) => {
      if (controller !== spotifyRef.current) {
        if (event?.data?.isPaused === false) {
          try {
            controller.pause();
          } catch {
            /* ignore */
          }
        }
        return;
      }
      const data = event?.data;
      if (!data) return;
      if (sourceRef.current !== "spotify" || spotifyHoldRef.current) return;
      const position = (data.position || 0) / 1000;
      const length = (data.duration || 0) / 1000;
      applyProgress(position, length);
      if (data.isPaused === false) {
        if (!wantPlayRef.current) {
          pauseSpotify();
          return;
        }
        spotifyPositionRef.current = position;
        markPlaying(true);
        eject();
      } else if (data.isPaused === true) {
        if (switchingRef.current) return;
        if (position > 0.25) spotifyPositionRef.current = position;
        markPlaying(false);
        if (length > 1 && position > 1 && position >= length - 0.45) {
          goToNext();
        }
      }
    });
  }

  async function warmNextTracks() {
    const current = songsRef.current[indexRef.current];
    const upcoming = upcomingSongs(sideA, sideB, sideRef.current, indexRef.current, hasBothRef.current, 2);
    warmArtwork(upcoming);
    const keepFiles = new Set(
      [current, ...upcoming].filter((song) => song && songSource(song) === "file").map((song) => song.id),
    );
    pruneFileWarms(keepFiles);

    for (const song of upcoming) {
      if (songSource(song) !== "file" || fileWarmRef.current.has(song.id)) continue;
      const hosted = song.url.startsWith("http") ? song.url : "";
      const blob = hosted ? null : await getLocalFile(song.id);
      if (fileWarmRef.current.has(song.id)) continue;
      const url = hosted || (blob ? URL.createObjectURL(blob) : "");
      if (!url) continue;
      const audio = new Audio();
      audio.preload = "auto";
      audio.src = url;
      audio.load();
      fileWarmRef.current.set(song.id, { url, audio, ownedBlob: !hosted && url.startsWith("blob:") });
    }

    const nextYt = upcoming.filter((song) => songSource(song) === "youtube").map((song) => song.id).slice(0, 2);
    if (nextYt.length) {
      await loadYouTubeApi();
    }
    if (nextYt.length && window.YT?.Player) {
      const assigned = new Set<string>();
      for (const warm of ytWarmPoolRef.current) {
        if (warm.player === playerRef.current) continue;
        const take = nextYt.find((id) => !assigned.has(id));
        if (!take) continue;
        assigned.add(take);
        if (warm.id === take) continue;
        warm.id = take;
        try {
          warm.player.mute?.();
          warm.player.setVolume?.(0);
          warm.player.cueVideoById(take);
        } catch {
          /* ignore */
        }
      }
      for (const id of nextYt) {
        if (assigned.has(id) || ytWarmPoolRef.current.some((warm) => warm.id === id)) continue;
        const slot = ytWarmSlotRef.current;
        if (!slot || ytWarmPoolRef.current.length >= 2) continue;
        const mount = document.createElement("div");
        slot.appendChild(mount);
        try {
          const player = new window.YT.Player(mount, {
            videoId: id,
            width: 240,
            height: 136,
            playerVars: {
              autoplay: 0,
              controls: 0,
              disablekb: 1,
              fs: 0,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              origin: window.location.origin,
              enablejsapi: 1,
              widget_referrer: window.location.origin,
            },
            events: {
              onReady: (event) => {
                const target = event?.target;
                try {
                  target?.mute?.();
                  target?.setVolume?.(0);
                  target?.cueVideoById(id);
                } catch {
                  /* ignore */
                }
              },
              onStateChange: onYtStateChange,
            },
          });
          ytWarmPoolRef.current.push({ id, player });
        } catch {
          /* ignore */
        }
      }
    }

    const nextSpotify = upcoming.filter((song) => songSource(song) === "spotify").map((song) => song.id).slice(0, 2);
    if (nextSpotify.length && !window.__spotifyIframeApi) {
      try {
        await loadSpotifyApi();
      } catch {
        /* ignore */
      }
    }
    const api = window.__spotifyIframeApi;
    const spotSlot = spotifyWarmSlotRef.current;
    if (nextSpotify.length && api && spotSlot) {
      const assigned = new Set<string>();
      for (const warm of spotifyWarmPoolRef.current) {
        if (warm.controller === spotifyRef.current) continue;
        const take = nextSpotify.find((id) => !assigned.has(id));
        if (!take) continue;
        assigned.add(take);
        if (warm.id === take) continue;
        warm.id = take;
        try {
          warm.controller.loadUri(spotifyUri(take));
        } catch {
          /* ignore */
        }
      }
      for (const id of nextSpotify) {
        if (assigned.has(id) || spotifyWarmPoolRef.current.some((warm) => warm.id === id)) continue;
        if (spotifyWarmPoolRef.current.length >= 2) continue;
        const mount = document.createElement("div");
        spotSlot.appendChild(mount);
        try {
          api.createController(mount, { uri: spotifyUri(id), width: 320, height: 152 }, (controller) => {
            if (spotifyWarmPoolRef.current.some((warm) => warm.controller === controller)) return;
            spotifyWarmPoolRef.current.push({ id, controller });
            attachSpotifyWarmListeners(controller);
            controller.addListener("ready", () => {
              if (controller === spotifyRef.current) return;
              try {
                controller.pause();
              } catch {
                /* ignore */
              }
            });
            try {
              controller.pause();
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* ignore */
        }
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;
    if (!hasYouTube || !firstYt) return undefined;

    async function setup() {
      await loadYouTubeApi();
      if (cancelled || !window.YT || !firstYt) return;
      const slot = ytSlotRef.current;
      if (!slot) return;
      const mount = document.createElement("div");
      slot.replaceChildren(mount);
      playerRef.current = new window.YT.Player(mount, {
        videoId: firstYt.id,
        width: 240,
        height: 136,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
          enablejsapi: 1,
          widget_referrer: window.location.origin,
        },
        events: {
          onReady: () => {
            if (cancelled) return;
            readyRef.current = true;
            ytIdRef.current = firstYt.id;
            if (import.meta.env.DEV) {
              (window as unknown as { __mtYt?: YtPlayer | null }).__mtYt = playerRef.current;
            }
            const current = songsRef.current[indexRef.current];
            if (current && songSource(current) === "youtube" && current.id !== firstYt.id) {
              try {
                ytIdRef.current = current.id;
                playerRef.current?.loadVideoById(current.id);
              } catch {
                /* ignore */
              }
            }
            if (pendingPlayRef.current && songSource(songsRef.current[indexRef.current]) === "youtube") {
              try {
                playerRef.current?.playVideo();
              } catch {
                /* ignore */
              }
            }
          },
          onStateChange: (event) => {
            if (cancelled) return;
            onYtStateChange(event);
          },
          onError: (event) => {
            if (import.meta.env.DEV) {
              (window as unknown as { __ytErr?: { code?: number; cancelled: boolean } }).__ytErr = {
                code: event?.data,
                cancelled,
              };
            }
            if (cancelled) return;
          },
        },
      });
      ytIdRef.current = firstYt.id;
    }

    void setup();
    return () => {
      cancelled = true;
      clearYtTimer();
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      readyRef.current = false;
      ytIdRef.current = "";
      ytSyncedKeyRef.current = null;
      destroyYtWarms();
      if (import.meta.env.DEV) {
        (window as unknown as { __mtYt?: YtPlayer | null }).__mtYt = null;
      }
    };
  }, [idsKey, hasYouTube, firstYt?.id]);

  useEffect(() => {
    let cancelled = false;
    spotifyReadyRef.current = false;
    if (!hasSpotify || !firstSpotify) return undefined;

    async function setup() {
      const api = await loadSpotifyApi();
      const slot = spotifySlotRef.current;
      if (cancelled || !slot || !firstSpotify) return;
      slot.replaceChildren();
      const mount = document.createElement("div");
      slot.appendChild(mount);
      api.createController(
        mount,
        { uri: spotifyUri(firstSpotify.id), width: 320, height: 152 },
        (controller) => {
          if (cancelled) {
            try {
              controller.destroy();
            } catch {
              /* ignore */
            }
            return;
          }
          spotifyRef.current = controller;
          spotifyLoadedRef.current = firstSpotify.id;
          spotifyReadyRef.current = true;
          const arm = () => {
            if (cancelled) return;
            spotifyHoldRef.current = false;
            const current = songsRef.current[indexRef.current];
            if (current && songSource(current) === "spotify" && current.id !== firstSpotify.id) {
              spotifyLoadedRef.current = current.id;
              spotifyHoldRef.current = true;
              controller.loadUri(spotifyUri(current.id));
            }
            if (wantPlayRef.current && songSource(songsRef.current[indexRef.current]) === "spotify") {
              playSpotify(true);
            }
          };
          controller.addListener("ready", arm);
          arm();
          controller.addListener("playback_update", (event) => {
            if (controller !== spotifyRef.current) {
              if (event?.data?.isPaused === false) {
                try {
                  controller.pause();
                } catch {
                  /* ignore */
                }
              }
              return;
            }
            const data = event?.data;
            if (!data) return;
            if (sourceRef.current !== "spotify" || spotifyHoldRef.current) return;
            const position = (data.position || 0) / 1000;
            const length = (data.duration || 0) / 1000;
            applyProgress(position, length);
            if (data.isPaused === false) {
              if (!wantPlayRef.current) {
                pauseSpotify();
                return;
              }
              spotifyPositionRef.current = position;
              markPlaying(true);
              eject();
            } else if (data.isPaused === true) {
              if (switchingRef.current) return;
              if (position > 0.25) spotifyPositionRef.current = position;
              markPlaying(false);
              if (length > 1 && position > 1 && position >= length - 0.45) {
                goToNext();
              }
            }
          });
        },
      );
    }

    void setup();
    return () => {
      cancelled = true;
      try {
        spotifyRef.current?.destroy();
      } catch {
        /* ignore */
      }
      spotifyRef.current = null;
      spotifyReadyRef.current = false;
      destroySpotifyWarms();
    };
  }, [idsKey, hasSpotify, firstSpotify?.id]);

  useEffect(() => {
    const song = songsRef.current[index];
    const source = song ? songSource(song) : null;
    const gen = resetProgress();
    setFileMissing(false);
    switchingRef.current = true;
    if (source !== "youtube") {
      pauseYouTube();
      try {
        playerRef.current?.seekTo(0, true);
      } catch {
        /* ignore */
      }
    } else clearYtTimer();
    pauseSpotify();
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    if (fileUrlRef.current.startsWith("blob:")) {
      const stillWarm = [...fileWarmRef.current.values()].some((warm) => warm.url === fileUrlRef.current);
      if (!stillWarm) URL.revokeObjectURL(fileUrlRef.current);
      fileUrlRef.current = "";
    }

    if (!song || !source) {
      wantPlayRef.current = false;
      pendingPlayRef.current = false;
      markPlaying(false);
      return undefined;
    }
    if (!wantPlayRef.current) {
      pendingPlayRef.current = false;
      markPlaying(false);
    }
    if (source === "youtube") {
      const key = `${sideRef.current}:${index}:${song.id}`;
      const firstLoad = ytSyncedKeyRef.current === null;
      ytSyncedKeyRef.current = key;
      const promoted = !firstLoad && promoteYtWarm(song.id);
      if (promoted) {
        if (wantPlayRef.current) {
          try {
            playerRef.current?.unMute?.();
            playerRef.current?.setVolume?.(100);
            playerRef.current?.seekTo(0, true);
            playerRef.current?.playVideo();
          } catch {
            /* ignore */
          }
        }
      } else if (firstLoad) {
        if (wantPlayRef.current) syncYouTube(song.id, true);
      } else {
        syncYouTube(song.id, wantPlayRef.current, true);
      }
    }
    if (source === "spotify") {
      const promoted = promoteSpotifyWarm(song.id);
      if (promoted) {
        spotifyHoldRef.current = true;
        window.setTimeout(() => {
          if (progressGenRef.current !== gen) return;
          spotifyHoldRef.current = false;
        }, 400);
        if (wantPlayRef.current) playSpotify(true);
      } else if (spotifyRef.current && spotifyReadyRef.current) {
        try {
          const controller = spotifyRef.current;
          const sameTrack = spotifyLoadedRef.current === song.id || spotifyLoadedRef.current === `${song.id}:reload`;
          spotifyHoldRef.current = true;
          if (sameTrack) {
            spotifyLoadedRef.current = `${song.id}:reload`;
            controller.loadUri(`https://open.spotify.com/track/${song.id}`);
          } else {
            spotifyLoadedRef.current = song.id;
            controller.loadUri(spotifyUri(song.id));
          }
          window.setTimeout(() => {
            if (progressGenRef.current !== gen) return;
            spotifyHoldRef.current = false;
          }, 500);
          if (wantPlayRef.current) playSpotify(true);
        } catch {
          /* ignore */
        }
      }
    }
    if (source !== "spotify" && source !== "youtube") {
      markPlaying(false);
    }
    const switchTimer = window.setTimeout(() => {
      if (gen === progressGenRef.current) switchingRef.current = false;
    }, 400);
    if (source === "file") {
      let cancelled = false;
      void (async () => {
        const warm = fileWarmRef.current.get(song.id);
        if (warm) {
          if (cancelled || !audioRef.current || gen !== progressGenRef.current) return;
          fileUrlRef.current = warm.url;
          audioRef.current.src = warm.url;
          audioRef.current.load();
          if (wantPlayRef.current) void audioRef.current.play();
          return;
        }
        const hosted = song.url.startsWith("http") ? song.url : "";
        const blob = hosted ? null : await getLocalFile(song.id);
        if (cancelled || !audioRef.current || gen !== progressGenRef.current) return;
        if (hosted) {
          audioRef.current.src = hosted;
          audioRef.current.load();
          if (wantPlayRef.current) void audioRef.current.play();
          return;
        }
        if (!blob) {
          setFileMissing(true);
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        fileUrlRef.current = objectUrl;
        audioRef.current.src = objectUrl;
        audioRef.current.load();
        if (wantPlayRef.current) void audioRef.current.play();
      })();
      return () => {
        cancelled = true;
        window.clearTimeout(switchTimer);
      };
    }
    return () => {
      window.clearTimeout(switchTimer);
    };
  }, [index, idsKey, playSide]);

  useEffect(() => {
    if (!playing) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void warmNextTracks();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [playing, index, playSide, idsKey]);

  useEffect(() => {
    return () => pruneFileWarms(new Set());
  }, [idsKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTime = () => {
      if (sourceRef.current !== "file") return;
      applyProgress(audio.currentTime, Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    const onPlay = () => {
      if (sourceRef.current !== "file") return;
      markPlaying(true);
      eject();
    };
    const onPause = () => {
      if (sourceRef.current !== "file") return;
      markPlaying(false);
    };
    const onEnded = () => {
      if (sourceRef.current !== "file") return;
      markPlaying(false);
      goToNext();
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [songs.length]);

  if (!songs.length || !currentSong || !source) return null;
  const current = currentSong;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeTime = safeDuration > 0 && Number.isFinite(time) ? Math.max(0, Math.min(time, safeDuration)) : 0;
  const progress = safeDuration > 0 ? Math.min(100, (safeTime / safeDuration) * 100) : 0;
  const openUrl = songWatchUrl(current);

  async function togglePlay() {
    eject();
    if (source === "youtube") {
      const next = !playing;
      wantPlayRef.current = next;
      pendingPlayRef.current = next;
      markPlaying(next);
      try {
        if (next) {
          const player = playerRef.current;
          if (!player || !readyRef.current) {
            pendingPlayRef.current = true;
          } else {
            if (ytIdRef.current !== current.id) {
              ytIdRef.current = current.id;
              player.loadVideoById(current.id);
            }
            player.playVideo();
          }
        } else {
          pauseYouTube();
        }
      } catch {
        /* ignore */
      }
      return;
    }
    if (source === "spotify") {
      const next = !playing;
      wantPlayRef.current = next;
      pendingPlayRef.current = next;
      markPlaying(next);
      if (next) playSpotify(spotifyPositionRef.current < 0.5);
      else pauseSpotify();
      return;
    }
    if (source === "file") {
      const audio = audioRef.current;
      if (!audio) return;
      if (playing) {
        wantPlayRef.current = false;
        audio.pause();
      } else {
        wantPlayRef.current = true;
        try {
          await audio.play();
        } catch {
          setFileMissing(true);
        }
      }
    }
  }

  function seekTo(next: number) {
    const clamped = safeDuration > 0 ? Math.max(0, Math.min(next, safeDuration)) : 0;
    setTime(clamped);
    spotifyPositionRef.current = clamped;
    if (source === "youtube") {
      try {
        playerRef.current?.seekTo(next, true);
      } catch {
        /* ignore */
      }
      return;
    }
    if (source === "spotify") {
      try {
        spotifyRef.current?.seek(Math.round(next));
      } catch {
        /* ignore */
      }
      return;
    }
    if (audioRef.current) audioRef.current.currentTime = next;
  }

  return (
    <div className="player">
      <audio ref={audioRef} preload="auto" />
      <div className="embed-host" aria-hidden="true">
        <div ref={ytSlotRef} className="embed-slot" />
        <div ref={ytWarmSlotRef} className="embed-slot embed-warm" />
        <div ref={spotifySlotRef} className="embed-slot" />
        <div ref={spotifyWarmSlotRef} className="embed-slot embed-warm" />
      </div>
      <div className="player-ui">
      <div className="player-now">
        <div className="player-art">
          <SongThumb song={current} />
        </div>
        <div className="player-meta">
          <p className="player-title">{current.title}</p>
          <p className="player-artist">
            {current.artist || (source === "file" ? "On this device" : source === "spotify" ? "Spotify" : "YouTube")}
          </p>
        </div>
        <span className={`source-pill source-${source}`}>
          {source === "file" ? "Device" : source === "spotify" ? "Spotify" : "YouTube"}
        </span>
        {(hasBothSides || songs.length > 1) && (
          <span className="player-count">
            {hasBothSides ? `${playSide} ${index + 1}/${songs.length}` : `${index + 1}/${songs.length}`}
          </span>
        )}
      </div>

      {source === "file" && fileMissing ? (
        <p className="player-embed-fail">This track isn&apos;t available here. Ask for a new link, or play it on the device that added it.</p>
      ) : (
        <>
          <div className="player-progress">
            <div className="bar" style={{ width: `${progress}%` }} />
            <input
              type="range"
              min={0}
              max={safeDuration || 100}
              step={0.25}
              value={Number.isFinite(safeTime) ? safeTime : 0}
              aria-label="Seek"
              onChange={(event) => seekTo(Number(event.target.value))}
            />
            <div className="knob" style={{ left: `${progress}%` }} />
          </div>
          <div className="player-times">
            <span>{fmt(safeTime)}</span>
            <span>{safeDuration > 0 ? fmt(safeDuration) : "--:--"}</span>
          </div>
        </>
      )}

      {openUrl && (
        <a className="open-source" href={openUrl} target="_blank" rel="noreferrer">
          Open on {source === "spotify" ? "Spotify" : "YouTube"}
        </a>
      )}

      <div className="player-controls">
        <button
          type="button"
          onClick={goToPrev}
          aria-label="Previous track"
          disabled={hasBothSides ? playSide === "A" && index === 0 : songs.length < 2}
        >
          <PrevIcon />
        </button>
        <button type="button" className="play" aria-label={playing ? "Pause" : "Play"} onClick={() => void togglePlay()}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          onClick={goToNext}
          aria-label="Next track"
          disabled={hasBothSides ? playSide === "B" && index === songs.length - 1 : songs.length < 2}
        >
          <NextIcon />
        </button>
      </div>
      {hasBothSides && (
        <button type="button" className="player-flip" onClick={() => flipTo(playSide === "A" ? "B" : "A", false)}>
          <FlipIcon />
          Flip to Side {playSide === "A" ? "B" : "A"}
        </button>
      )}
      </div>
    </div>
  );
}
