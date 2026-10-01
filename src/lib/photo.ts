import { hostShareFile } from "./hostAudio";

const MAX_EDGE = 320;
const TARGET_BYTES = 12_000;

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that photo"));
    };
    image.src = url;
  });
}

export async function compressPhoto(file: Blob): Promise<string> {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare that photo");
  ctx.drawImage(image, 0, 0, width, height);

  for (const quality of [0.55, 0.4, 0.28, 0.18]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length * 0.75 <= TARGET_BYTES || quality === 0.18) return dataUrl;
  }
  return canvas.toDataURL("image/jpeg", 0.18);
}

export async function hostPhotoForShare(photo: string): Promise<string> {
  if (!photo || photo.startsWith("http")) return photo;
  if (!photo.startsWith("data:")) return photo;
  const blob = await (await fetch(photo)).blob();
  return hostShareFile(blob, "polaroid.jpg", blob.type || "image/jpeg");
}
