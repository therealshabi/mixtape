export type StickerCategory = "fall" | "stars" | "flowers" | "ribbons";

export type StickerDef = {
  id: string;
  label: string;
  category: StickerCategory;
  image: string;
};

export const STICKER_CATEGORIES: { id: StickerCategory; label: string }[] = [
  { id: "fall", label: "Fall" },
  { id: "stars", label: "Stars" },
  { id: "flowers", label: "Flowers" },
  { id: "ribbons", label: "Ribbons" },
];

export const STICKERS: StickerDef[] = [
  { id: "fall-poststamp", label: "Poststamp", category: "fall", image: "/assets/stickers/fall-poststamp.png" },
  { id: "fall-citrus", label: "Citrus", category: "fall", image: "/assets/stickers/fall-citrus.png" },
  { id: "fall-coffee", label: "Coffee", category: "fall", image: "/assets/stickers/fall-coffee.png" },
  { id: "fall-letter", label: "Letter", category: "fall", image: "/assets/stickers/fall-letter.png" },
  { id: "fall-eucalyptus", label: "Eucalyptus", category: "fall", image: "/assets/stickers/fall-eucalyptus.png" },
  { id: "fall-books", label: "Books", category: "fall", image: "/assets/stickers/fall-books.png" },
  { id: "fall-white-flowers", label: "White flowers", category: "fall", image: "/assets/stickers/fall-white-flowers.png" },
  { id: "fall-red-rose", label: "Red rose", category: "fall", image: "/assets/stickers/fall-red-rose.png" },
  { id: "fall-candle", label: "Candle", category: "fall", image: "/assets/stickers/fall-candle.png" },
  { id: "fall-leaf", label: "Fall leaf", category: "fall", image: "/assets/stickers/fall-fall-leaf.png" },
  { id: "star-brown", label: "Brown star", category: "stars", image: "/assets/stickers/star-brown.png" },
  { id: "star-white", label: "White star", category: "stars", image: "/assets/stickers/star-white-one.png" },
  { id: "star-white-one", label: "White star one", category: "stars", image: "/assets/stickers/star-white-one.png" },
  { id: "star-white-two", label: "White star two", category: "stars", image: "/assets/stickers/star-white-two.png" },
  { id: "star-black", label: "Black star", category: "stars", image: "/assets/stickers/star-black.png" },
  { id: "star-green", label: "Green star", category: "stars", image: "/assets/stickers/star-green.png" },
  { id: "star-leopard", label: "Leopard star", category: "stars", image: "/assets/stickers/star-leopard.png" },
  { id: "star-pink", label: "Pink star", category: "stars", image: "/assets/stickers/star-pink.png" },
  { id: "star-blue", label: "Blue star", category: "stars", image: "/assets/stickers/star-blue.png" },
  { id: "flower-brown", label: "Brown flower", category: "flowers", image: "/assets/stickers/flower-brown.png" },
  { id: "flower-white", label: "White flower", category: "flowers", image: "/assets/stickers/flower-white-one.png" },
  { id: "flower-white-one", label: "White flower one", category: "flowers", image: "/assets/stickers/flower-white-one.png" },
  { id: "flower-white-two", label: "White flower two", category: "flowers", image: "/assets/stickers/flower-white-two.png" },
  { id: "flower-black", label: "Black flower", category: "flowers", image: "/assets/stickers/flower-black.png" },
  { id: "flower-green", label: "Green flower", category: "flowers", image: "/assets/stickers/flower-green.png" },
  { id: "flower-leopard", label: "Leopard flower", category: "flowers", image: "/assets/stickers/flower-leopard.png" },
  { id: "flower-pink", label: "Pink flower", category: "flowers", image: "/assets/stickers/flower-pink.png" },
  { id: "flower-blue", label: "Blue flower", category: "flowers", image: "/assets/stickers/flower-blue.png" },
  { id: "ribbon-brown", label: "Brown ribbon", category: "ribbons", image: "/assets/stickers/ribbon-brown.png" },
  { id: "ribbon-white", label: "White ribbon", category: "ribbons", image: "/assets/stickers/ribbon-white-one.png" },
  { id: "ribbon-white-one", label: "White ribbon one", category: "ribbons", image: "/assets/stickers/ribbon-white-one.png" },
  { id: "ribbon-white-two", label: "White ribbon two", category: "ribbons", image: "/assets/stickers/ribbon-white-two.png" },
  { id: "ribbon-black", label: "Black ribbon", category: "ribbons", image: "/assets/stickers/ribbon-black.png" },
  { id: "ribbon-green", label: "Green ribbon", category: "ribbons", image: "/assets/stickers/ribbon-green.png" },
  { id: "ribbon-leopard", label: "Leopard ribbon", category: "ribbons", image: "/assets/stickers/ribbon-leopard.png" },
  { id: "ribbon-pink", label: "Pink ribbon", category: "ribbons", image: "/assets/stickers/ribbon-pink.png" },
  { id: "ribbon-blue", label: "Blue ribbon", category: "ribbons", image: "/assets/stickers/ribbon-blue.png" },
];

const HIDDEN_ALIAS_IDS = new Set(["star-white", "flower-white", "ribbon-white"]);

export const PICKABLE_STICKERS = STICKERS.filter((sticker) => !HIDDEN_ALIAS_IDS.has(sticker.id));

export function findSticker(id: string) {
  return STICKERS.find((sticker) => sticker.id === id);
}
