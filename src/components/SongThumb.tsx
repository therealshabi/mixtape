import { useEffect, useState } from "react";
import { songInitials } from "../lib/artwork";
import { songArtwork } from "../lib/media";
import { songSource, type Song } from "../types";

export function SongThumb({ song }: { song: Song }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? "" : songArtwork(song);
  useEffect(() => {
    setFailed(false);
  }, [song.id, song.artworkUrl]);
  if (src) {
    return <img src={src} alt="" draggable={false} onError={() => setFailed(true)} />;
  }
  return (
    <span className={`song-thumb-fallback source-${songSource(song)}`} aria-hidden="true">
      {songInitials(song.title)}
    </span>
  );
}
