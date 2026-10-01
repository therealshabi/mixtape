import type { StickerDef } from "../data/stickers";

export function StickerArt({ sticker, className = "" }: { sticker: StickerDef; className?: string }) {
  return (
    <div className={`sticker-art ${className}`}>
      <img src={sticker.image} alt="" draggable={false} />
    </div>
  );
}
