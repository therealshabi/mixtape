import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CassetteCase, FlippingTape } from "../components/Cassette";
import { NoteCard } from "../components/NoteCard";
import { Player } from "../components/Player";
import { decodeMixtape, listenUrl, mixtapePayload } from "../lib/share";
import { useTheme } from "../lib/theme";
import type { TapeSide } from "../types";

function useTapeFromRoute() {
  const params = useParams();
  const location = useLocation();
  const payload = mixtapePayload(location.hash, params);
  return useMemo(() => ({ payload, tape: decodeMixtape(payload) }), [payload]);
}

function MissingTape() {
  return (
    <section className="share missing">
      <h2>Mixtape not found</h2>
      <p>This link may be incomplete. Ask for the full URL, or make a new one.</p>
      <Link to="/create" className="btn btn-dark">
        Create a mixtape
      </Link>
    </section>
  );
}

function TapeStage({
  tape,
  opened,
  spinning,
  playSide,
  onOpen,
}: {
  tape: NonNullable<ReturnType<typeof decodeMixtape>>;
  opened: boolean;
  spinning?: boolean;
  playSide: TapeSide;
  onOpen?: () => void;
}) {
  const canFlip = tape.sideA.length > 0 && tape.sideB.length > 0;
  const sealed = Boolean(onOpen) && !opened;
  function caseArt() {
    return (
      <CassetteCase
        coverId={tape.coverId}
        stickers={tape.stickers}
        sideA={tape.sideA}
        sideB={tape.sideB}
        photo={tape.photo}
      />
    );
  }

  if (onOpen) {
    return (
      <div className={`share-stage ${opened ? "is-open" : "is-sealed"}`}>
        {tape.note && (
          <div className={`note-slide ${opened ? "out" : ""}`}>
            <NoteCard value={tape.note} readOnly className="share-note" />
          </div>
        )}
        <div
          className={`case-clamshell ${sealed ? "is-sealed" : ""} ${opened ? "is-open" : ""}`}
          role={sealed ? "button" : undefined}
          tabIndex={sealed ? 0 : undefined}
          aria-expanded={opened}
          aria-label={sealed ? "Open mixtape" : undefined}
          onClick={sealed ? onOpen : undefined}
          onKeyDown={
            sealed
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpen();
                  }
                }
              : undefined
          }
        >
          <div className="case-base">
            <div className="case-tray">
              <FlippingTape coverId={tape.coverId} spinning={spinning} side={playSide} enabled={canFlip} />
            </div>
          </div>
          <div className="case-lid">
            <div className="case-lid-front">{caseArt()}</div>
            <div className="case-lid-back">{caseArt()}</div>
          </div>
          <span className="case-hinge" aria-hidden="true" />
          {sealed && <span className="case-open-hint">Tap to open</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={`share-stage ${opened ? "is-open" : "is-sealed"}`}>
      {tape.note && (
        <div className={`note-slide ${opened ? "out" : ""}`}>
          <NoteCard value={tape.note} readOnly className="share-note" />
        </div>
      )}
      <div className="share-stack">
        <div className={`tape-slide ${opened ? "out" : ""}`}>
          <FlippingTape coverId={tape.coverId} spinning={spinning} side={playSide} enabled={canFlip} />
        </div>
        <div className="case-stay">{caseArt()}</div>
      </div>
    </div>
  );
}

export function SharePage() {
  const { payload, tape } = useTapeFromRoute();
  const [copied, setCopied] = useState(false);
  const [ejected, setEjected] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playSide, setPlaySide] = useState<TapeSide>("A");
  const shareUrl = typeof window !== "undefined" ? listenUrl(window.location.origin, payload) : `/m#${payload}`;
  useTheme(tape?.themeId);

  if (!tape) return <MissingTape />;

  const songs = [...tape.sideA, ...tape.sideB];

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const hasUnhosted = songs.some((song) => song.source === "file" && !song.url.startsWith("http"));

  return (
    <section className="share">
      <h2>Share Your Mixtape</h2>
      <TapeStage tape={tape} opened={ejected} spinning={ejected && playing} playSide={playSide} />
      <Player
        sideA={tape.sideA}
        sideB={tape.sideB}
        onFirstPlay={() => setEjected(true)}
        onPlayingChange={setPlaying}
        onSideChange={(side) => {
          setEjected(true);
          setPlaySide(side);
        }}
      />
      {hasUnhosted && (
        <p className="hint">A device track on this tape didn&apos;t upload, so it may only play on the original phone or laptop.</p>
      )}
      <div className="share-box">
        <p>Share this mixtape:</p>
        <div className="share-row">
          <p>{shareUrl}</p>
          <button type="button" className={`btn btn-dark copy-btn ${copied ? "copied" : ""}`} onClick={() => void copy()}>
            {!copied && (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <rect x="4" y="4" width="9" height="9" rx="1.5" stroke="white" strokeWidth="1.4" />
                <path d="M2 10V2h8" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
    </section>
  );
}

export function ListenPage() {
  const { tape } = useTapeFromRoute();
  const playerRef = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playSide, setPlaySide] = useState<TapeSide>("A");
  const [playerInView, setPlayerInView] = useState(false);
  useTheme(tape?.themeId);

  useEffect(() => {
    if (!opened) {
      setPlayerInView(false);
      return;
    }
    const el = playerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setPlayerInView(entry.isIntersecting && entry.intersectionRatio >= 0.45);
      },
      { threshold: [0.45], rootMargin: "0px 0px -18% 0px" },
    );
    const start = window.setTimeout(() => {
      const player = el.querySelector(".player") ?? el;
      observer.observe(player);
    }, 1100);
    return () => {
      window.clearTimeout(start);
      observer.disconnect();
    };
  }, [opened]);

  if (!tape) return <MissingTape />;

  function openTape() {
    setOpened(true);
  }

  function scrollToPlayer() {
    playerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const showScrollHint = opened && !playing && !playerInView;

  return (
    <section className={`share ${opened ? "is-open" : "is-sealed"}`}>
      <h2>A Mixtape For You</h2>
      <TapeStage tape={tape} opened={opened} spinning={opened && playing} playSide={playSide} onOpen={openTape} />
      <div ref={playerRef} className={`share-reveal ${opened ? "is-open" : ""}`} inert={!opened}>
        <Player
          sideA={tape.sideA}
          sideB={tape.sideB}
          onFirstPlay={openTape}
          onPlayingChange={setPlaying}
          onSideChange={(side) => {
            openTape();
            setPlaySide(side);
          }}
        />
      </div>
      {showScrollHint && (
        <button type="button" className="scroll-play-hint" onClick={scrollToPlayer}>
          Scroll down to play
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 7l5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </section>
  );
}
