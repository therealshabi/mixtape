import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CassettePreview } from "../components/Cassette";
import { NoteCard } from "../components/NoteCard";
import { StickerArt } from "../components/StickerArt";
import { StepBar, WizardNav } from "../components/Wizard";
import { COVERS } from "../data/covers";
import { PICKABLE_STICKERS, STICKER_CATEGORIES } from "../data/stickers";
import { encodeMixtape } from "../lib/share";
import { fetchTrack, isYouTubeUrl, parseYouTubeId } from "../lib/youtube";
import type { Mixtape, TapeSide } from "../types";
import { MAX_NOTE, MAX_SONGS_PER_SIDE, MAX_STICKERS } from "../types";

const emptyTape: Mixtape = {
  coverId: "clover",
  stickers: [],
  sideA: [],
  sideB: [],
  note: "",
};

export function CreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [tape, setTape] = useState<Mixtape>(emptyTape);
  const [category, setCategory] = useState<(typeof STICKER_CATEGORIES)[number]["id"]>("fall");
  const [side, setSide] = useState<TapeSide>("A");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentSongs = side === "A" ? tape.sideA : tape.sideB;
  const totalSongs = tape.sideA.length + tape.sideB.length;
  const canNext =
    step === 1 ||
    step === 2 ||
    (step === 3 && totalSongs >= 1) ||
    (step === 4 && tape.note.trim().length > 0);

  const stickersInCategory = useMemo(
    () => PICKABLE_STICKERS.filter((sticker) => sticker.category === category),
    [category],
  );

  async function addSong() {
    const value = link.trim();
    if (!isYouTubeUrl(value)) {
      setError("Please paste a valid YouTube link");
      return;
    }
    const incomingId = parseYouTubeId(value);
    if (incomingId && [...tape.sideA, ...tape.sideB].some((song) => song.id === incomingId)) {
      setError("This song is already added");
      return;
    }
    if (currentSongs.length >= MAX_SONGS_PER_SIDE) {
      setError(`Side ${side} is full — ${MAX_SONGS_PER_SIDE} songs max`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const song = await fetchTrack(value);
      if ([...tape.sideA, ...tape.sideB].some((existing) => existing.id === song.id)) {
        setError("This song is already added");
        return;
      }
      setTape((current) =>
        side === "A"
          ? { ...current, sideA: [...current.sideA, song] }
          : { ...current, sideB: [...current.sideB, song] },
      );
      setLink("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load that track — check the link");
    } finally {
      setLoading(false);
    }
  }

  function toggleSticker(id: string) {
    setTape((current) => {
      if (current.stickers.some((sticker) => sticker.id === id)) {
        return { ...current, stickers: current.stickers.filter((sticker) => sticker.id !== id) };
      }
      if (current.stickers.length >= MAX_STICKERS) return current;
      return { ...current, stickers: [...current.stickers, { id, rotation: 0 }] };
    });
  }

  function finish() {
    const id = encodeMixtape(tape);
    navigate(`/share/${id}`);
  }

  return (
    <section className="create">
      <StepBar step={step} />
      {step === 1 && (
        <div className="create-step">
          <h2>Pick Cassette Color</h2>
          <CassettePreview tape={tape} showTape />
          <div className="swatches" role="list">
            {COVERS.map((cover) => (
              <button
                key={cover.id}
                type="button"
                role="listitem"
                aria-label={cover.name}
                aria-pressed={tape.coverId === cover.id}
                className={`swatch ${tape.coverId === cover.id ? "selected" : ""}`}
                style={{ backgroundImage: `url(${cover.swatch})` }}
                onClick={() => setTape((current) => ({ ...current, coverId: cover.id }))}
              />
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="create-step">
          <h2>Add Stickers</h2>
          <CassettePreview
            tape={tape}
            editable
            onRemoveSticker={(id) =>
              setTape((current) => ({
                ...current,
                stickers: current.stickers.filter((sticker) => sticker.id !== id),
              }))
            }
            onRotateSticker={(id) =>
              setTape((current) => ({
                ...current,
                stickers: current.stickers.map((sticker) =>
                  sticker.id === id ? { ...sticker, rotation: sticker.rotation + 15 } : sticker,
                ),
              }))
            }
          />
          <div className="sticker-panel">
            <div className="sticker-panel-head">
              <span>Choose up to {MAX_STICKERS} stickers</span>
              <span>
                {tape.stickers.length} / {MAX_STICKERS}
              </span>
            </div>
            <div className="sticker-tabs" role="tablist" aria-label="Sticker categories">
              {STICKER_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={category === item.id}
                  className={category === item.id ? "on" : ""}
                  onClick={() => setCategory(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="sticker-grid">
              {stickersInCategory.map((sticker) => {
                const selected = tape.stickers.some((placed) => placed.id === sticker.id);
                return (
                  <button
                    key={sticker.id}
                    type="button"
                    className={selected ? "picked" : ""}
                    aria-pressed={selected}
                    aria-label={`${selected ? "Remove" : "Add"} ${sticker.label} sticker`}
                    onClick={() => toggleSticker(sticker.id)}
                  >
                    <StickerArt sticker={sticker} />
                    {selected && <span className="check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="create-step">
          <h2>Add Your Songs</h2>
          <CassettePreview tape={tape} />
          <div className="side-toggle" role="tablist" aria-label="Tape side">
            <button type="button" className={side === "A" ? "on" : ""} onClick={() => setSide("A")}>
              Side A · {tape.sideA.length}/{MAX_SONGS_PER_SIDE}
            </button>
            <button type="button" className={side === "B" ? "on" : ""} onClick={() => setSide("B")}>
              Side B · {tape.sideB.length}/{MAX_SONGS_PER_SIDE}
            </button>
          </div>
          <div className="song-box">
            {currentSongs.length === 0 ? (
              <p className="empty-songs">No songs yet – up to {MAX_SONGS_PER_SIDE} on this side</p>
            ) : (
              currentSongs.map((song, index) => (
                <div key={song.id} className="song-row">
                  {song.artworkUrl && <img src={song.artworkUrl} alt="" />}
                  <div>
                    <p>{song.title}</p>
                    {song.artist && <small>{song.artist}</small>}
                  </div>
                  <button
                    type="button"
                    aria-label="Remove song"
                    onClick={() =>
                      setTape((current) =>
                        side === "A"
                          ? { ...current, sideA: current.sideA.filter((_, i) => i !== index) }
                          : { ...current, sideB: current.sideB.filter((_, i) => i !== index) },
                      )
                    }
                  >
                    ×
                  </button>
                </div>
              ))
            )}
            <p className="song-count">
              {currentSongs.length}/{MAX_SONGS_PER_SIDE} songs on side {side}
            </p>
          </div>
          <div className="song-add">
            <input
              value={link}
              onChange={(event) => {
                setLink(event.target.value);
                if (error) setError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addSong();
                }
              }}
              placeholder="Paste a YouTube link…"
              inputMode="url"
              disabled={loading || currentSongs.length >= MAX_SONGS_PER_SIDE}
            />
            <button
              type="button"
              className="btn btn-dark add-btn"
              onClick={() => void addSong()}
              disabled={loading || !link.trim() || currentSongs.length >= MAX_SONGS_PER_SIDE}
            >
              {loading ? "…" : "Add"}
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>
      )}

      {step === 4 && (
        <div className="create-step">
          <h2>Add a little note</h2>
          <CassettePreview tape={tape} compact />
          <NoteCard value={tape.note} maxLength={MAX_NOTE} onChange={(note) => setTape((current) => ({ ...current, note }))} />
        </div>
      )}

      <WizardNav
        onBack={() => (step === 1 ? navigate("/") : setStep((n) => n - 1))}
        onNext={() => (step === 4 ? finish() : setStep((n) => n + 1))}
        nextLabel={step === 4 ? "Finish" : "Next"}
        nextDisabled={!canNext}
      />
    </section>
  );
}
