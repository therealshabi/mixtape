import { useRef, useState } from "react";
import { moveItem } from "../lib/artwork";
import { songSource, type Song } from "../types";
import { SongThumb } from "./SongThumb";

function GripIcon() {
  return (
    <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="3" r="1.4" />
      <circle cx="10" cy="3" r="1.4" />
      <circle cx="4" cy="9" r="1.4" />
      <circle cx="10" cy="9" r="1.4" />
      <circle cx="4" cy="15" r="1.4" />
      <circle cx="10" cy="15" r="1.4" />
    </svg>
  );
}

function sourceLabel(song: Song) {
  const source = songSource(song);
  if (source === "file") return "This device";
  if (source === "spotify") return "Spotify";
  return "YouTube";
}

export function SongList({
  songs,
  onReorder,
  onRemove,
}: {
  songs: Song[];
  onReorder: (next: Song[]) => void;
  onRemove: (index: number) => void;
}) {
  const dragFrom = useRef<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);

  function finishDrag(to: number | null) {
    const from = dragFrom.current;
    dragFrom.current = null;
    setDragging(null);
    setOver(null);
    if (from == null || to == null || from === to) return;
    onReorder(moveItem(songs, from, to));
  }

  return (
    <>
      {songs.map((song, index) => (
        <div
          key={song.id}
          className={`song-row ${dragging === index ? "dragging" : ""} ${over === index && dragging !== index ? "drop-target" : ""}`}
          data-song-index={index}
          onDragOver={(event) => {
            event.preventDefault();
            setOver(index);
          }}
          onDrop={(event) => {
            event.preventDefault();
            finishDrag(index);
          }}
        >
          <button
            type="button"
            className="song-handle"
            aria-label={`Drag to reorder ${song.title}`}
            draggable
            onDragStart={(event) => {
              dragFrom.current = index;
              setDragging(index);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", song.id);
            }}
            onDragEnd={() => finishDrag(over)}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse") return;
              event.currentTarget.setPointerCapture(event.pointerId);
              dragFrom.current = index;
              setDragging(index);
            }}
            onPointerMove={(event) => {
              if (event.pointerType === "mouse" || dragFrom.current == null) return;
              const node = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-song-index]");
              if (!node) return;
              const next = Number(node.getAttribute("data-song-index"));
              if (Number.isFinite(next)) setOver(next);
            }}
            onPointerUp={(event) => {
              if (event.pointerType === "mouse") return;
              finishDrag(over);
            }}
          >
            <GripIcon />
          </button>
          <SongThumb song={song} />
          <div className="song-row-meta">
            <p>{song.title}</p>
            <small>
              {sourceLabel(song)}
              {song.artist ? ` · ${song.artist}` : ""}
            </small>
          </div>
          <button type="button" className="song-remove" aria-label={`Remove ${song.title}`} onClick={() => onRemove(index)}>
            ×
          </button>
        </div>
      ))}
    </>
  );
}
