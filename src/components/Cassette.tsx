import { findCover } from "../data/covers";
import { findSticker } from "../data/stickers";
import type { Mixtape, PlacedSticker, Song } from "../types";

export function CassetteTape({ coverId, spinning = false }: { coverId: string; spinning?: boolean }) {
  const cover = findCover(coverId);
  return (
    <div className={`tape-photo ${spinning ? "spinning" : ""}`} data-testid="cassette-preview">
      <img src="/assets/cassette-tape.png" alt="Cassette tape" className="tape-body" draggable={false} />
      <div className="tape-cover">
        <img src={cover.src} alt={`${cover.name} cassette label`} draggable={false} />
      </div>
      <span className="tape-reel left" aria-hidden="true" />
      <span className="tape-reel right" aria-hidden="true" />
    </div>
  );
}

function SongLines({ songs, compact }: { songs: Song[]; compact?: boolean }) {
  const visible = songs.slice(0, compact ? 4 : 6);
  if (!visible.length) return null;
  return (
    <ol className="case-songs">
      {visible.map((song) => (
        <li key={song.id}>{song.title}</li>
      ))}
    </ol>
  );
}

type CaseProps = {
  coverId: string;
  stickers: PlacedSticker[];
  sideA: Song[];
  sideB: Song[];
  photo?: string;
  compact?: boolean;
  editable?: boolean;
  onRemoveSticker?: (id: string) => void;
  onRotateSticker?: (id: string) => void;
};

export function CassetteCase({
  stickers,
  sideA,
  sideB,
  photo,
  compact,
  editable,
  onRemoveSticker,
  onRotateSticker,
}: CaseProps) {
  const hasSongs = sideA.length > 0 || sideB.length > 0;
  return (
    <div className={`case-photo ${compact ? "case-compact" : ""}`}>
      <div className="case-layer-art">
        <img src="/assets/cassette-case.png" alt="Cassette case" className="case-body" draggable={false} />
      </div>
      <div className="case-layer-content">
        <div className={`case-window ${photo ? "has-photo" : ""}`}>
          {photo && (
            <div className="case-polaroid-wrap">
              <figure className="case-polaroid">
                <span className="case-polaroid-clip" aria-hidden="true" />
                <img src={photo} alt="Mixtape photo" referrerPolicy="no-referrer" />
              </figure>
            </div>
          )}
          {stickers.length > 0 && (
            <div className={`case-stickers ${editable ? "editable" : ""}`}>
              {stickers.map((placed, index) => {
                const def = findSticker(placed.id);
                if (!def) return null;
                return (
                  <div
                    key={placed.id}
                    className="placed-sticker"
                    style={{ animationDelay: `${index * 110}ms` }}
                  >
                    <img
                      src={def.image}
                      alt={def.label}
                      draggable={false}
                      style={{ transform: `rotate(${placed.rotation}deg)` }}
                    />
                    {editable && (
                      <div className="sticker-tools">
                        <button type="button" aria-label={`Remove ${def.label} sticker`} onClick={() => onRemoveSticker?.(placed.id)}>
                          ×
                        </button>
                        <button type="button" aria-label={`Rotate ${def.label} sticker`} onClick={() => onRotateSticker?.(placed.id)}>
                          ↻
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {hasSongs && (
          <div className="case-tracklists">
            <SongLines songs={[...sideA, ...sideB]} compact={compact} />
          </div>
        )}
      </div>
    </div>
  );
}

export function CassettePreview({
  tape,
  showTape,
  compact,
  editable,
  spinning,
  onRemoveSticker,
  onRotateSticker,
}: {
  tape: Pick<Mixtape, "coverId" | "stickers" | "sideA" | "sideB" | "photo">;
  showTape?: boolean;
  compact?: boolean;
  editable?: boolean;
  spinning?: boolean;
  onRemoveSticker?: (id: string) => void;
  onRotateSticker?: (id: string) => void;
}) {
  if (showTape) return <CassetteTape coverId={tape.coverId} spinning={spinning} />;
  return (
    <CassetteCase
      coverId={tape.coverId}
      stickers={tape.stickers}
      sideA={tape.sideA}
      sideB={tape.sideB}
      photo={tape.photo}
      compact={compact}
      editable={editable}
      onRemoveSticker={onRemoveSticker}
      onRotateSticker={onRotateSticker}
    />
  );
}
