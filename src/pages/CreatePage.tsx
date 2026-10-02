import { useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CassettePreview } from "../components/Cassette";
import { NoteCard } from "../components/NoteCard";
import { SongList } from "../components/SongList";
import { StickerArt } from "../components/StickerArt";
import { StepBar, WizardNav } from "../components/Wizard";
import { COVERS } from "../data/covers";
import { defaultStickerCategory, PICKABLE_STICKERS, STICKER_CATEGORIES, type StickerDef } from "../data/stickers";
import { findTheme, isThemeId } from "../data/themes";
import { ensureHostedSongs, importLocalSong, resolveLink } from "../lib/media";
import { compressPhoto, compressSticker, hostPhotoForShare } from "../lib/photo";
import { encodeMixtape, publishTape } from "../lib/share";
import { useTheme } from "../lib/theme";
import type { Mixtape, TapeSide } from "../types";
import { MAX_NOTE, MAX_SONGS_PER_SIDE, MAX_STICKERS } from "../types";

export function CreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const rawTheme = params.get("theme");
  const themeId = isThemeId(rawTheme) ? rawTheme : "none";
  const theme = findTheme(themeId);
  useTheme(themeId);

  const [step, setStep] = useState(1);
  const [tape, setTape] = useState<Mixtape>({
    coverId: theme.heroCover,
    stickers: theme.id === "none" ? [] : theme.stickers.map((sticker) => ({ ...sticker })),
    sideA: [],
    sideB: [],
    note: "",
    themeId,
    photo: "",
    photoCaption: "",
  });
  const [category, setCategory] = useState<(typeof STICKER_CATEGORIES)[number]["id"]>(
    defaultStickerCategory(themeId),
  );
  const [side, setSide] = useState<TapeSide>("A");
  const [link, setLink] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const stickerFileRef = useRef<HTMLInputElement>(null);
  const [customStickers, setCustomStickers] = useState<StickerDef[]>([]);

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

  async function addFromLink() {
    const value = link.trim();
    if (currentSongs.length >= MAX_SONGS_PER_SIDE) {
      setError(`Side ${side} is full — ${MAX_SONGS_PER_SIDE} songs max`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const song = await resolveLink(value);
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
      setError(err instanceof Error ? err.message : "Couldn't load that track");
    } finally {
      setLoading(false);
    }
  }

  async function addFromFile(file: File | undefined) {
    if (!file) return;
    if (currentSongs.length >= MAX_SONGS_PER_SIDE) {
      setError(`Side ${side} is full — ${MAX_SONGS_PER_SIDE} songs max`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      const song = await importLocalSong(file);
      setTape((current) =>
        side === "A"
          ? { ...current, sideA: [...current.sideA, song] }
          : { ...current, sideB: [...current.sideB, song] },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that file");
    } finally {
      setLoading(false);
    }
  }

  async function addPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const photo = await compressPhoto(file);
      setTape((current) => ({ ...current, photo }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that photo");
    }
  }

  function removeSticker(id: string) {
    setTape((current) => ({
      ...current,
      stickers: current.stickers.filter((sticker) => sticker.id !== id),
    }));
    setCustomStickers((list) => list.filter((sticker) => sticker.id !== id));
    if (error) setError("");
  }

  function toggleSticker(id: string) {
    if (tape.stickers.some((sticker) => sticker.id === id)) {
      removeSticker(id);
      return;
    }
    if (tape.stickers.length >= MAX_STICKERS) return;
    const custom = customStickers.find((sticker) => sticker.id === id);
    setTape((current) =>
      current.stickers.length >= MAX_STICKERS
        ? current
        : { ...current, stickers: [...current.stickers, { id, rotation: 0, image: custom?.image }] },
    );
  }

  async function addCustomStickers(files: File[]) {
    if (!files.length) return;
    setError("");
    const added: StickerDef[] = [];
    for (const file of files) {
      try {
        const image = await compressSticker(file);
        added.push({ id: `custom-${crypto.randomUUID()}`, label: "Custom", category: "custom", image });
      } catch {
        /* skip unreadable files */
      }
    }
    if (!added.length) {
      setError("Couldn't add those stickers");
      return;
    }
    setCustomStickers((list) => [...list, ...added]);
    const room = Math.max(0, MAX_STICKERS - tape.stickers.length);
    setTape((current) => {
      const slots = MAX_STICKERS - current.stickers.length;
      if (slots <= 0) return current;
      return {
        ...current,
        stickers: [
          ...current.stickers,
          ...added.slice(0, slots).map((sticker) => ({ id: sticker.id, rotation: 0, image: sticker.image })),
        ],
      };
    });
    if (room <= 0) {
      setError(`You already have ${MAX_STICKERS} stickers — tap one to swap it out`);
    } else if (added.length > room) {
      setError(`Placed ${room} on the case — tap one to swap the rest in`);
    }
  }

  async function finish() {
    setLoading(true);
    setError("");
    try {
      const sideA = await ensureHostedSongs(tape.sideA);
      const sideB = await ensureHostedSongs(tape.sideB);
      const stuck = [...sideA, ...sideB].filter((song) => song.source === "file" && !song.url.startsWith("http"));
      if (stuck.length) {
        throw new Error(
          `Couldn't upload ${stuck.map((song) => song.title).join(", ")} for sharing. Try a smaller audio file, then Finish again.`,
        );
      }
      const photo = await hostPhotoForShare(tape.photo);
      const ready = { ...tape, sideA, sideB, photo };
      setTape(ready);
      const encoded = encodeMixtape(ready);
      try {
        const id = await publishTape(encoded);
        navigate(`/share/${id}`);
      } catch {
        navigate({ pathname: "/share", hash: encoded });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't pack this mixtape");
    } finally {
      setLoading(false);
    }
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
            onRemoveSticker={removeSticker}
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
            {customStickers.length > 0 && (
              <>
                <p className="sticker-yours-label">Yours</p>
                <div className="sticker-grid">
                  {customStickers.map((sticker) => {
                    const selected = tape.stickers.some((placed) => placed.id === sticker.id);
                    return (
                      <button
                        key={sticker.id}
                        type="button"
                        className={selected ? "picked" : ""}
                        aria-pressed={selected}
                        aria-label={`${selected ? "Remove" : "Add"} your sticker`}
                        onClick={() => toggleSticker(sticker.id)}
                      >
                        <StickerArt sticker={sticker} />
                        {selected && <span className="check">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
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
            <input
              ref={stickerFileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(event) => {
                const files = event.target.files ? [...event.target.files] : [];
                event.target.value = "";
                void addCustomStickers(files);
              }}
            />
            <button type="button" className="btn btn-light file-btn" onClick={() => stickerFileRef.current?.click()}>
              Add custom sticker(s)
            </button>
            {error && <p className="form-error">{error}</p>}
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
              <SongList
                songs={currentSongs}
                onReorder={(songs) =>
                  setTape((current) => (side === "A" ? { ...current, sideA: songs } : { ...current, sideB: songs }))
                }
                onRemove={(index) =>
                  setTape((current) =>
                    side === "A"
                      ? { ...current, sideA: current.sideA.filter((_, i) => i !== index) }
                      : { ...current, sideB: current.sideB.filter((_, i) => i !== index) },
                  )
                }
              />
            )}
            <p className="song-count">
              {currentSongs.length}/{MAX_SONGS_PER_SIDE} songs on side {side}
              {currentSongs.length > 1 ? " · drag to reorder" : ""}
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
                  void addFromLink();
                }
              }}
              placeholder="Paste a YouTube or Spotify link…"
              inputMode="url"
              disabled={loading || currentSongs.length >= MAX_SONGS_PER_SIDE}
            />
            <button
              type="button"
              className="btn btn-dark add-btn"
              onClick={() => void addFromLink()}
              disabled={loading || !link.trim() || currentSongs.length >= MAX_SONGS_PER_SIDE}
            >
              {loading ? "…" : "Add"}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void addFromFile(file);
            }}
          />
          <button
            type="button"
            className="btn btn-light file-btn"
            onClick={() => fileRef.current?.click()}
            disabled={loading || currentSongs.length >= MAX_SONGS_PER_SIDE}
          >
            Add from this device
          </button>
          <p className="hint">Device files are uploaded with the share link (about 8 MB max).</p>
          {error && <p className="form-error">{error}</p>}
        </div>
      )}

      {step === 4 && (
        <div className="create-step">
          <h2>Add a little note</h2>
          <CassettePreview tape={tape} compact />
          <NoteCard value={tape.note} maxLength={MAX_NOTE} onChange={(note) => setTape((current) => ({ ...current, note }))} />
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              void addPhoto(file);
            }}
          />
          <div className="photo-row">
            {tape.photo ? (
              <div className="photo-preview">
                <img src={tape.photo} alt="Added to mixtape" />
                <button type="button" className="btn btn-light" onClick={() => setTape((current) => ({ ...current, photo: "" }))}>
                  Remove photo
                </button>
              </div>
            ) : (
              <button type="button" className="btn btn-light file-btn" onClick={() => photoRef.current?.click()}>
                Add one photo
              </button>
            )}
          </div>
          {error && <p className="form-error">{error}</p>}
        </div>
      )}

      <WizardNav
        onBack={() => (step === 1 ? navigate("/") : setStep((n) => n - 1))}
        onNext={() => {
          setError("");
          if (step === 4) void finish();
          else setStep((n) => n + 1);
        }}
        nextLabel={step === 4 ? (loading ? "Packing…" : "Finish") : "Next"}
        nextDisabled={!canNext || loading}
      />
    </section>
  );
}
