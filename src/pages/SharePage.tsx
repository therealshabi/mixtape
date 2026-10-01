import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CassetteCase, CassetteTape } from "../components/Cassette";
import { NoteCard } from "../components/NoteCard";
import { Player } from "../components/Player";
import { allSongs, decodeMixtape } from "../lib/share";
import { useTheme } from "../lib/theme";

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
  ejected,
  spinning,
}: {
  tape: NonNullable<ReturnType<typeof decodeMixtape>>;
  ejected?: boolean;
  spinning?: boolean;
}) {
  return (
    <div className="share-stage">
      {tape.note && <NoteCard value={tape.note} readOnly className="share-note" />}
      <div className={`share-stack ${ejected === undefined ? "stacked" : ""}`}>
        {ejected === undefined ? (
          <CassetteTape coverId={tape.coverId} spinning={spinning} />
        ) : (
          <div className={`tape-slide ${ejected ? "out" : ""}`}>
            <CassetteTape coverId={tape.coverId} spinning={spinning} />
          </div>
        )}
        <CassetteCase
          coverId={tape.coverId}
          stickers={tape.stickers}
          sideA={tape.sideA}
          sideB={tape.sideB}
          photo={tape.photo}
        />
      </div>
    </div>
  );
}

export function SharePage() {
  const { id = "" } = useParams();
  const tape = useMemo(() => decodeMixtape(id), [id]);
  const songs = useMemo(() => (tape ? allSongs(tape) : []), [tape]);
  const [copied, setCopied] = useState(false);
  const [ejected, setEjected] = useState(false);
  const [playing, setPlaying] = useState(false);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/m/${id}` : `/m/${id}`;
  useTheme(tape?.themeId);

  if (!tape) return <MissingTape />;

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
      <TapeStage tape={tape} ejected={ejected} spinning={ejected && playing} />
      <Player songs={songs} onFirstPlay={() => setEjected(true)} onPlayingChange={setPlaying} />
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
  const { id = "" } = useParams();
  const tape = useMemo(() => decodeMixtape(id), [id]);
  const songs = useMemo(() => (tape ? allSongs(tape) : []), [tape]);
  const [ejected, setEjected] = useState(false);
  const [playing, setPlaying] = useState(false);
  useTheme(tape?.themeId);

  if (!tape) return <MissingTape />;

  return (
    <section className="share">
      <h2>A Mixtape For You</h2>
      <TapeStage tape={tape} ejected={ejected} spinning={ejected && playing} />
      <Player
        songs={songs}
        onFirstPlay={() => setEjected(true)}
        onPlayingChange={setPlaying}
      />
    </section>
  );
}
