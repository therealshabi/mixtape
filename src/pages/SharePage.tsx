import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CassetteCase, CassetteTape } from "../components/Cassette";
import { NoteCard } from "../components/NoteCard";
import { Player } from "../components/Player";
import { allSongs, decodeMixtape } from "../lib/share";

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

export function SharePage() {
  const { id = "" } = useParams();
  const tape = useMemo(() => decodeMixtape(id), [id]);
  const songs = useMemo(() => (tape ? allSongs(tape) : []), [tape]);
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/m/${id}` : `/m/${id}`;

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

  return (
    <section className="share">
      <h2>Share Your Mixtape</h2>
      <div className="share-stage">
        {tape.note && <NoteCard value={tape.note} readOnly className="share-note" />}
        <div className="share-stack stacked">
          <CassetteTape coverId={tape.coverId} />
          <CassetteCase
            coverId={tape.coverId}
            stickers={tape.stickers}
            sideA={tape.sideA}
            sideB={tape.sideB}
          />
        </div>
      </div>
      <Player songs={songs} />
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

  if (!tape) return <MissingTape />;

  return (
    <section className="share">
      <h2>A Mixtape For You</h2>
      <div className="share-stage">
        {tape.note && <NoteCard value={tape.note} readOnly className="share-note" />}
        <div className="share-stack">
          <div className={`tape-slide ${ejected ? "out" : ""}`}>
            <CassetteTape coverId={tape.coverId} />
          </div>
          <CassetteCase
            coverId={tape.coverId}
            stickers={tape.stickers}
            sideA={tape.sideA}
            sideB={tape.sideB}
          />
        </div>
      </div>
      <Player songs={songs} onFirstPlay={() => setEjected(true)} />
    </section>
  );
}
