import { useEffect, useMemo, useRef, useState } from "react";
import type { Song } from "../types";
import { watchUrl } from "../lib/youtube";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement,
        opts: {
          videoId: string;
          playerVars: Record<string, number>;
          events: Record<string, (event?: { data: number }) => void>;
        },
      ) => YtPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
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

function loadApi(): Promise<void> {
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

export function Player({ songs, onFirstPlay }: { songs: Song[]; onFirstPlay?: () => void }) {
  const playerRef = useRef<YtPlayer | null>(null);
  const readyRef = useRef(false);
  const indexRef = useRef(0);
  const firstPlayRef = useRef(false);
  const onFirstPlayRef = useRef(onFirstPlay);
  const idsKey = useMemo(() => songs.map((song) => song.id).join(","), [songs]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [blocked, setBlocked] = useState<Set<number>>(new Set());
  const [allBlocked, setAllBlocked] = useState(false);

  useEffect(() => {
    onFirstPlayRef.current = onFirstPlay;
  }, [onFirstPlay]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  function eject() {
    if (firstPlayRef.current) return;
    firstPlayRef.current = true;
    onFirstPlayRef.current?.();
  }

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    let holder: HTMLDivElement | null = null;
    readyRef.current = false;

    async function setup() {
      if (!songs.length) return;
      await loadApi();
      if (cancelled || !window.YT) return;
      holder = document.createElement("div");
      holder.className = "yt-offscreen";
      holder.setAttribute("aria-hidden", "true");
      const mount = document.createElement("div");
      holder.appendChild(mount);
      document.body.appendChild(holder);
      playerRef.current = new window.YT.Player(mount, {
        videoId: songs[0].id,
        playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            readyRef.current = true;
          },
          onStateChange: (event) => {
            if (event?.data === 1) {
              setPlaying(true);
              eject();
              window.clearInterval(timer);
              timer = window.setInterval(() => {
                try {
                  setTime(playerRef.current?.getCurrentTime() || 0);
                  const d = playerRef.current?.getDuration() || 0;
                  if (d > 0) setDuration(d);
                } catch {
                  /* ignore */
                }
              }, 250);
            } else if (event?.data === 2) {
              setPlaying(false);
            } else if (event?.data === 0) {
              setPlaying(false);
              setIndex((current) => (current + 1) % songs.length);
            }
          },
          onError: () => {
            const failed = indexRef.current;
            setBlocked((current) => {
              const next = new Set(current);
              next.add(failed);
              if (next.size >= songs.length) setAllBlocked(true);
              return next;
            });
            setIndex((current) => (current + 1) % songs.length);
          },
        },
      });
    }

    void setup();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
      readyRef.current = false;
      holder?.remove();
    };
  }, [idsKey, songs.length]);

  useEffect(() => {
    const song = songs[index];
    if (!song || !playerRef.current || !readyRef.current) return;
    setTime(0);
    setDuration(0);
    try {
      playerRef.current.loadVideoById(song.id);
    } catch {
      /* ignore */
    }
  }, [index, idsKey]);

  if (!songs.length) return null;
  const current = songs[index] ?? songs[0];
  const progress = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const currentBlocked = blocked.has(index);

  return (
    <div className="player">
      <div className="player-now">
        {current.artworkUrl ? (
          <img src={current.artworkUrl} alt="" />
        ) : (
          <div className="player-art-fallback" />
        )}
        <div className="player-meta">
          <p className="player-title">{current.title}</p>
          {current.artist && <p className="player-artist">{current.artist}</p>}
        </div>
        {songs.length > 1 && (
          <span className="player-count">
            {index + 1}/{songs.length}
          </span>
        )}
      </div>

      {allBlocked ? (
        <div className="player-fallback">
          <p>These tracks can&apos;t be played here</p>
          {songs.map((song) => (
            <a key={song.id} href={watchUrl(song.id)} target="_blank" rel="noreferrer">
              {song.title}
            </a>
          ))}
        </div>
      ) : currentBlocked ? (
        <p className="player-embed-fail">
          This video can&apos;t be embedded —{" "}
          <a href={watchUrl(current.id)} target="_blank" rel="noreferrer">
            open on YouTube
          </a>
        </p>
      ) : (
        <>
          <div className="player-progress">
            <div className="bar" style={{ width: `${progress}%` }} />
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.25}
              value={time}
              aria-label="Seek"
              onChange={(event) => {
                const next = Number(event.target.value);
                setTime(next);
                try {
                  playerRef.current?.seekTo(next, true);
                } catch {
                  /* ignore */
                }
              }}
            />
            <div className="knob" style={{ left: `${progress}%` }} />
          </div>
          <div className="player-times">
            <span>{fmt(time)}</span>
            <span>{duration > 0 ? fmt(duration) : "--:--"}</span>
          </div>
        </>
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
        <button
          type="button"
          className="play"
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => {
            eject();
            try {
              playing ? playerRef.current?.pauseVideo() : playerRef.current?.playVideo();
            } catch {
              /* ignore */
            }
          }}
        >
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
  );
}
