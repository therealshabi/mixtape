import type { PlacedSticker, ThemeId } from "../types";

export type ThemeDef = {
  id: ThemeId;
  label: string;
  blurb: string;
  heroCover: string;
  heroCase: string;
  stickers: PlacedSticker[];
};

export const THEMES: ThemeDef[] = [
  {
    id: "none",
    label: "None",
    blurb: "Just a cassette",
    heroCover: "brown-four",
    heroCase: "white-black",
    stickers: [
      { id: "fall-poststamp", rotation: -8 },
      { id: "fall-coffee", rotation: 6 },
      { id: "fall-leaf", rotation: 12 },
    ],
  },
  {
    id: "birthday",
    label: "Birthday",
    blurb: "Cake, bows, and a little fuss",
    heroCover: "yellow-grid",
    heroCase: "yellow-brown",
    stickers: [
      { id: "birthday-cake", rotation: -8 },
      { id: "birthday-balloons", rotation: 6 },
      { id: "birthday-gift", rotation: 10 },
    ],
  },
  {
    id: "anniversary",
    label: "Anniversary",
    blurb: "Soft and a bit romantic",
    heroCover: "red-grid",
    heroCase: "brown-five",
    stickers: [
      { id: "anniversary-heart", rotation: -6 },
      { id: "anniversary-rings", rotation: 8 },
      { id: "anniversary-champagne", rotation: 4 },
    ],
  },
  {
    id: "travel",
    label: "Travel",
    blurb: "Postcards from the glovebox",
    heroCover: "blue-daisy",
    heroCase: "blue-two",
    stickers: [
      { id: "travel-camera", rotation: -10 },
      { id: "travel-suitcase", rotation: 6 },
      { id: "travel-plane", rotation: 12 },
    ],
  },
  {
    id: "good-day",
    label: "Good day",
    blurb: "Sunshine on a beige dashboard",
    heroCover: "clover",
    heroCase: "green-three",
    stickers: [
      { id: "goodday-sun", rotation: -4 },
      { id: "goodday-daisy", rotation: 8 },
      { id: "goodday-butterfly", rotation: 12 },
    ],
  },
  {
    id: "office",
    label: "Office",
    blurb: "Coffee, tabs, and a 4pm song",
    heroCover: "brown-one",
    heroCase: "brown-two",
    stickers: [
      { id: "office-mug", rotation: -8 },
      { id: "office-notes", rotation: 6 },
      { id: "office-plant", rotation: 10 },
    ],
  },
  {
    id: "commute",
    label: "Commute",
    blurb: "Red lights and a playlist",
    heroCover: "blue-brown",
    heroCase: "brown-three",
    stickers: [
      { id: "commute-taigun", rotation: -8 },
      { id: "commute-bike", rotation: 6 },
      { id: "commute-lights", rotation: 10 },
    ],
  },
];

export function findTheme(id: string | null | undefined): ThemeDef {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}
