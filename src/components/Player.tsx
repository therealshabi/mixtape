import { useEffect, useMemo, useRef, useState } from "react";
import { getLocalFile } from "../lib/idb";
import { songWatchUrl, spotifyUri } from "../lib/media";
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
          events: Record<string, (event?: { data: number }) => void>;
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
  playVideo: () => void;
  pauseVideo: () => void;
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
  const spotifySlotRef = useRef<HTMLDivElement | null>(null);
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
      if (fromStart) controller.play();
      else controller.resume();
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

  function syncYouTube(id: string, play: boolean) {
    const player = playerRef.current;
    if (!player || !readyRef.current) {
      if (play) pendingPlayRef.current = true;
      return;
    }
    try {
      if (ytIdRef.current !== id) {
        ytIdRef.current = id;
        player.loadVideoById(id);
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
            if (cancelled || sourceRef.current !== "youtube") {
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
            const data = event?.data;
            if (!data) return;
            if (sourceRef.current !== "spotify" || spotifyHoldRef.current) return;
            applyProgress((data.position || 0) / 1000, (data.duration || 0) / 1000);
            if (data.isPaused === false) {
              if (!wantPlayRef.current) {
                pauseSpotify();
                return;
              }
              spotifyPositionRef.current = (data.position || 0) / 1000;
              markPlaying(true);
              eject();
            } else if (data.isPaused === true) {
              const position = (data.position || 0) / 1000;
              const length = (data.duration || 0) / 1000;
              if (position > 0.25) spotifyPositionRef.current = position;
              markPlaying(false);
              if (!switchingRef.current && length > 1 && position > 1 && position >= length - 0.45) {
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
    };
  }, [idsKey, hasSpotify, firstSpotify?.id]);

  useEffect(() => {
    const song = songsRef.current[index];
    const source = song ? songSource(song) : null;
    const gen = resetProgress();
    setFileMissing(false);
    switchingRef.current = true;
    if (source !== "youtube") pauseYouTube();
    else clearYtTimer();
    pauseSpotify();
    audioRef.current?.pause();
    if (fileUrlRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(fileUrlRef.current);
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
      if (firstLoad) {
        if (wantPlayRef.current) syncYouTube(song.id, true);
      } else {
        syncYouTube(song.id, wantPlayRef.current);
      }
    }
    if (source === "spotify" && spotifyRef.current && spotifyReadyRef.current) {
      try {
        spotifyHoldRef.current = true;
        spotifyLoadedRef.current = song.id;
        spotifyRef.current.loadUri(spotifyUri(song.id));
        if (wantPlayRef.current) playSpotify(true);
      } catch {
        /* ignore */
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
      if (next) playSpotify(false);
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
      <audio ref={audioRef} preload="metadata" />
      <div className="embed-host" aria-hidden="true">
        <div ref={ytSlotRef} className="embed-slot" />
        <div ref={spotifySlotRef} className="embed-slot" />
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
