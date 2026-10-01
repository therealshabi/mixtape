export type Cover = {
  id: string;
  name: string;
  src: string;
  swatch: string;
};

export const COVERS: Cover[] = [
  { id: "clover", name: "Green clover", src: "/assets/covers/clover.webp", swatch: "/assets/swatch-sources/clover.png" },
  { id: "yellow-grid", name: "Yellow grid", src: "/assets/covers/yellow-grid.webp", swatch: "/assets/swatch-sources/yellow-grid.png" },
  { id: "red-grid", name: "Red grid", src: "/assets/covers/red-grid.webp", swatch: "/assets/swatch-sources/red-grid.png" },
  { id: "blue-daisy", name: "Blue daisy", src: "/assets/covers/blue-daisy.webp", swatch: "/assets/swatch-sources/blue-daisy.png" },
  { id: "brown-one", name: "Brown cover one", src: "/assets/covers/brown-one.webp", swatch: "/assets/swatch-sources/brown-one.png" },
  { id: "brown-four", name: "Brown cover four", src: "/assets/covers/brown-four.webp", swatch: "/assets/swatch-sources/brown-four.png" },
  { id: "brown-two", name: "Brown cover two", src: "/assets/covers/brown-two.webp", swatch: "/assets/swatch-sources/brown-two.png" },
  { id: "brown-three", name: "Brown cover three", src: "/assets/covers/brown-three.webp", swatch: "/assets/swatch-sources/brown-three.png" },
  { id: "blue-brown", name: "Blue and brown", src: "/assets/covers/blue-brown.webp", swatch: "/assets/swatch-sources/blue-brown.png" },
  { id: "yellow-brown", name: "Yellow and brown", src: "/assets/covers/yellow-brown.webp", swatch: "/assets/swatch-sources/yellow-brown.png" },
  { id: "white-black", name: "White and black", src: "/assets/covers/white-black.webp", swatch: "/assets/swatch-sources/white-black.png" },
  { id: "blue-two", name: "Blue cover two", src: "/assets/covers/blue-two.webp", swatch: "/assets/swatch-sources/blue-two.png" },
  { id: "green-two", name: "Green cover two", src: "/assets/covers/green-two.webp", swatch: "/assets/swatch-sources/green-two.png" },
  { id: "green-three", name: "Green cover three", src: "/assets/covers/green-three.webp", swatch: "/assets/swatch-sources/green-three.png" },
  { id: "green-four", name: "Green cover four", src: "/assets/covers/green-four.webp", swatch: "/assets/swatch-sources/green-four.png" },
  { id: "green-five", name: "Green cover five", src: "/assets/covers/green-five.webp", swatch: "/assets/swatch-sources/green-five.png" },
  { id: "brown-five", name: "Brown cover five", src: "/assets/covers/brown-five.webp", swatch: "/assets/swatch-sources/brown-five.png" },
  { id: "green-six", name: "Green cover six", src: "/assets/covers/green-six.webp", swatch: "/assets/swatch-sources/green-six.png" },
];

export function findCover(id: string) {
  return COVERS.find((cover) => cover.id === id) ?? COVERS[0];
}
