export type StickerCategory =
  | "birthday"
  | "anniversary"
  | "travel"
  | "good-day"
  | "office"
  | "commute"
  | "fall"
  | "stars"
  | "flowers"
  | "ribbons"
  | "custom";

export type StickerDef = {
  id: string;
  label: string;
  category: StickerCategory;
  image: string;
};

export const STICKER_CATEGORIES: { id: StickerCategory; label: string }[] = [
  { id: "birthday", label: "Birthday" },
  { id: "anniversary", label: "Anniversary" },
  { id: "travel", label: "Travel" },
  { id: "good-day", label: "Good day" },
  { id: "office", label: "Office" },
  { id: "commute", label: "Commute" },
  { id: "fall", label: "Fall" },
  { id: "stars", label: "Stars" },
  { id: "flowers", label: "Flowers" },
  { id: "ribbons", label: "Ribbons" },
];

export function defaultStickerCategory(themeId: string | null | undefined): StickerCategory {
  return STICKER_CATEGORIES.some((item) => item.id === themeId)
    ? (themeId as StickerCategory)
    : "fall";
}

export const STICKERS: StickerDef[] = [
  { id: "birthday-cake", label: "Cake", category: "birthday", image: "/assets/stickers/birthday-cake.png" },
  { id: "birthday-balloons", label: "Balloons", category: "birthday", image: "/assets/stickers/birthday-balloons.png" },
  { id: "birthday-gift", label: "Gift", category: "birthday", image: "/assets/stickers/birthday-gift.png" },
  { id: "birthday-hat", label: "Party hat", category: "birthday", image: "/assets/stickers/birthday-hat.png" },
  { id: "anniversary-heart", label: "Felt heart", category: "anniversary", image: "/assets/stickers/anniversary-heart.png" },
  { id: "anniversary-rings", label: "Rings", category: "anniversary", image: "/assets/stickers/anniversary-rings.png" },
  { id: "anniversary-champagne", label: "Champagne", category: "anniversary", image: "/assets/stickers/anniversary-champagne.png" },
  { id: "anniversary-locket", label: "Locket", category: "anniversary", image: "/assets/stickers/anniversary-locket.png" },
  { id: "travel-camera", label: "Camera", category: "travel", image: "/assets/stickers/travel-camera.png" },
  { id: "travel-suitcase", label: "Suitcase", category: "travel", image: "/assets/stickers/travel-suitcase.png" },
  { id: "travel-plane", label: "Plane", category: "travel", image: "/assets/stickers/travel-plane.png" },
  { id: "travel-compass", label: "Compass", category: "travel", image: "/assets/stickers/travel-compass.png" },
  { id: "goodday-sun", label: "Sunshine", category: "good-day", image: "/assets/stickers/goodday-sun.png" },
  { id: "goodday-daisy", label: "Daisy", category: "good-day", image: "/assets/stickers/goodday-daisy.png" },
  { id: "goodday-butterfly", label: "Butterfly", category: "good-day", image: "/assets/stickers/goodday-butterfly.png" },
  { id: "goodday-lemonade", label: "Lemonade", category: "good-day", image: "/assets/stickers/goodday-lemonade.png" },
  { id: "office-mug", label: "Mug", category: "office", image: "/assets/stickers/office-mug.png" },
  { id: "office-laptop", label: "Laptop", category: "office", image: "/assets/stickers/office-laptop.png" },
  { id: "office-notes", label: "Sticky notes", category: "office", image: "/assets/stickers/office-notes.png" },
  { id: "office-plant", label: "Desk plant", category: "office", image: "/assets/stickers/office-plant.png" },
  { id: "commute-taigun", label: "Taigun", category: "commute", image: "/assets/stickers/commute-taigun.png" },
  { id: "commute-car", label: "Car", category: "commute", image: "/assets/stickers/commute-car.png" },
  { id: "commute-bike", label: "Bike", category: "commute", image: "/assets/stickers/commute-bike.png" },
  { id: "commute-lights", label: "Traffic lights", category: "commute", image: "/assets/stickers/commute-lights.png" },
  { id: "commute-train", label: "Train", category: "commute", image: "/assets/stickers/commute-train.png" },
  { id: "commute-headphones", label: "Headphones", category: "commute", image: "/assets/stickers/commute-headphones.png" },
  { id: "commute-ticket", label: "Ticket", category: "commute", image: "/assets/stickers/commute-ticket.png" },
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

export function resolveSticker(placed: { id: string; image?: string }): StickerDef | undefined {
  if (placed.image) {
    return { id: placed.id, label: "Custom", category: "custom", image: placed.image };
  }
  return findSticker(placed.id);
}
