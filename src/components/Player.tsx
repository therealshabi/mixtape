import { useEffect, useMemo, useRef, useState } from "react";
import { getLocalFile } from "../lib/idb";
import { songWatchUrl, spotifyUri } from "../lib/media";
import { songSource, type Song } from "../types";
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
  seekTo: (seconds: number, allowSeek: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
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

export function Player({
  songs,
  onFirstPlay,
  onPlayingChange,
}: {
  songs: Song[];
  onFirstPlay?: () => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const playerRef = useRef<YtPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ytSlotRef = useRef<HTMLDivElement | null>(null);
  const spotifySlotRef = useRef<HTMLDivElement | null>(null);
  const spotifyRef = useRef<SpotifyEmbedController | null>(null);
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
  const fileUrlRef = useRef("");
  const spotifyLoadedRef = useRef("");
  const spotifyPositionRef = useRef(0);
  const ytTimerRef = useRef<number | undefined>(undefined);
  const sourceRef = useRef<ReturnType<typeof songSource> | null>(null);
  const idsKey = useMemo(() => songs.map((song) => `${songSource(song)}:${song.id}`).join(","), [songs]);
  const hasYouTube = songs.some((song) => songSource(song) === "youtube");
  const hasSpotify = songs.some((song) => songSource(song) === "spotify");
  const firstYt = songs.find((song) => songSource(song) === "youtube");
  const firstSpotify = songs.find((song) => songSource(song) === "spotify");
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
  }, [onFirstPlay, onPlayingChange]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

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

  function applyProgress(nextTime: number, nextDuration?: number) {
    if (Number.isFinite(nextTime) && nextTime >= 0) setTime(nextTime);
    if (typeof nextDuration === "number" && Number.isFinite(nextDuration) && nextDuration > 0) {
      setDuration(nextDuration);
    }
  }

  function startYtTimer() {
    clearYtTimer();
    ytTimerRef.current = window.setInterval(() => {
      if (sourceRef.current !== "youtube") {
        clearYtTimer();
        return;
      }
      try {
        applyProgress(playerRef.current?.getCurrentTime() || 0, playerRef.current?.getDuration() || 0);
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
            readyRef.current = true;
            const current = songsRef.current[indexRef.current];
            if (current && songSource(current) === "youtube" && current.id !== firstYt.id) {
              try {
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
            if (sourceRef.current !== "youtube") {
              clearYtTimer();
              return;
            }
            if (event?.data === 1) {
              markPlaying(true);
              eject();
              startYtTimer();
            } else if (event?.data === 2) {
              clearYtTimer();
              if (!switchingRef.current) markPlaying(false);
            } else if (event?.data === 0) {
              clearYtTimer();
              markPlaying(false);
              setIndex((current) => (current + 1) % songsRef.current.length);
            }
          },
        },
      });
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
            const current = songsRef.current[indexRef.current];
            if (current && songSource(current) === "spotify" && current.id !== firstSpotify.id) {
              spotifyLoadedRef.current = current.id;
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
            if (sourceRef.current !== "spotify") return;
            applyProgress((data.position || 0) / 1000, (data.duration || 0) / 1000);
            if (data.isPaused === false) {
              spotifyPositionRef.current = (data.position || 0) / 1000;
              markPlaying(true);
              eject();
            } else if (data.isPaused === true) {
              const position = (data.position || 0) / 1000;
              const length = (data.duration || 0) / 1000;
              if (position > 0.25) spotifyPositionRef.current = position;
              markPlaying(false);
              if (!switchingRef.current && length > 1 && position > 1 && position >= length - 0.45) {
                setIndex((current) => (current + 1) % songsRef.current.length);
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
    setTime(0);
    setDuration(0);
    setFileMissing(false);
    switchingRef.current = true;
    if (source !== "youtube") {
      clearYtTimer();
      try {
        playerRef.current?.pauseVideo();
      } catch {
        /* ignore */
      }
    }
    if (source !== "spotify") {
      pauseSpotify();
    }
    if (source !== "file") {
      audioRef.current?.pause();
    }
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
    if (source === "youtube" && playerRef.current && readyRef.current) {
      try {
        playerRef.current.loadVideoById(song.id);
        if (wantPlayRef.current) playerRef.current.playVideo();
      } catch {
        /* ignore */
      }
    }
    if (source === "spotify" && spotifyRef.current && spotifyReadyRef.current) {
      try {
        if (spotifyLoadedRef.current !== song.id) {
          spotifyLoadedRef.current = song.id;
          spotifyPositionRef.current = 0;
          spotifyRef.current.loadUri(spotifyUri(song.id));
          if (wantPlayRef.current) playSpotify(true);
        } else if (wantPlayRef.current) {
          playSpotify(false);
        }
      } catch {
        /* ignore */
      }
    }
    if (source !== "spotify" && source !== "youtube") {
      markPlaying(false);
    }
    window.setTimeout(() => {
      switchingRef.current = false;
    }, 400);
    if (source === "file") {
      let cancelled = false;
      void (async () => {
        const hosted = song.url.startsWith("http") ? song.url : "";
        const blob = hosted ? null : await getLocalFile(song.id);
        if (cancelled || !audioRef.current) return;
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
      };
    }
    return undefined;
  }, [index, idsKey]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onTime = () => {
      if (sourceRef.current !== "file") return;
      applyProgress(audio.currentTime, audio.duration);
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
      setIndex((current) => (current + 1) % songs.length);
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
  const safeTime = Number.isFinite(time) ? Math.max(0, Math.min(time, safeDuration || time)) : 0;
  const progress = safeDuration > 0 ? Math.min(100, (safeTime / safeDuration) * 100) : 0;
  const openUrl = songWatchUrl(current);

  async function togglePlay() {
    eject();
    if (source === "youtube") {
      const next = !playing;
      wantPlayRef.current = next;
      markPlaying(next);
      pendingPlayRef.current = next;
      try {
        if (next) playerRef.current?.playVideo();
        else playerRef.current?.pauseVideo();
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
    setTime(next);
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
        {songs.length > 1 && (
          <span className="player-count">
            {index + 1}/{songs.length}
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
          onClick={() => setIndex((i) => (i - 1 + songs.length) % songs.length)}
          aria-label="Previous track"
          disabled={songs.length < 2}
        >
          <PrevIcon />
        </button>
        <button type="button" className="play" aria-label={playing ? "Pause" : "Play"} onClick={() => void togglePlay()}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          type="button"
          onClick={() => setIndex((i) => (i + 1) % songs.length)}
          aria-label="Next track"
          disabled={songs.length < 2}
        >
          <NextIcon />
        </button>
      </div>
      </div>
    </div>
  );
}
