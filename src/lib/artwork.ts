export type AudioTags = {
  title?: string;
  artist?: string;
  artwork?: Blob;
};

function synchsafe(b0: number, b1: number, b2: number, b3: number) {
  return ((b0 & 0x7f) << 21) | ((b1 & 0x7f) << 14) | ((b2 & 0x7f) << 7) | (b3 & 0x7f);
}

function u32(bytes: Uint8Array, i: number) {
  return ((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]) >>> 0;
}

function asBlob(bytes: Uint8Array): Blob | null {
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (!jpeg && !png) return null;
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new Blob([copy], { type: jpeg ? "image/jpeg" : "image/png" });
}

function findImage(data: Uint8Array): Blob | null {
  for (let i = 0; i < Math.min(data.length - 8, 800); i += 1) {
    const blob = asBlob(data.subarray(i));
    if (blob) return blob;
  }
  return null;
}

function readId3Text(data: Uint8Array): string {
  if (!data.length) return "";
  const enc = data[0];
  const payload = data.subarray(1);
  if (enc === 1 || enc === 2) {
    const bom = payload.length >= 2 ? (payload[0] << 8) | payload[1] : 0;
    const little = enc === 1 && bom === 0xfffe;
    const start = bom === 0xfeff || bom === 0xfffe ? 2 : 0;
    let text = "";
    for (let i = start; i + 1 < payload.length; i += 2) {
      const code = little ? payload[i] | (payload[i + 1] << 8) : (payload[i] << 8) | payload[i + 1];
      if (code === 0) break;
      text += String.fromCharCode(code);
    }
    return text.trim();
  }
  const decoded = new TextDecoder(enc === 3 ? "utf-8" : "latin1").decode(payload);
  return decoded.replace(/\0+$/g, "").trim();
}

function parseId3(bytes: Uint8Array): AudioTags {
  const tags: AudioTags = {};
  if (bytes.length < 10 || bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) return tags;
  const version = bytes[3];
  const tagSize = synchsafe(bytes[6], bytes[7], bytes[8], bytes[9]);
  let offset = 10;
  if (bytes[5] & 0x40) {
    if (offset + 4 > bytes.length) return tags;
    offset += version >= 4 ? synchsafe(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]) : u32(bytes, offset);
  }
  const end = Math.min(bytes.length, 10 + tagSize);
  while (offset + 10 <= end) {
    const id = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
    if (!/^[A-Z0-9]{3,4}$/.test(id)) break;
    const frameSize =
      version >= 4
        ? synchsafe(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7])
        : u32(bytes, offset + 4);
    offset += 10;
    if (frameSize <= 0 || offset + frameSize > bytes.length) break;
    const body = bytes.subarray(offset, offset + frameSize);
    if ((id === "APIC" || id === "PIC") && !tags.artwork) tags.artwork = findImage(body) ?? undefined;
    if ((id === "TIT2" || id === "TT2") && !tags.title) tags.title = readId3Text(body);
    if ((id === "TPE1" || id === "TP1") && !tags.artist) tags.artist = readId3Text(body);
    offset += frameSize;
  }
  return tags;
}

function walkMp4(bytes: Uint8Array, start: number, end: number): Blob | null {
  let i = start;
  while (i + 8 <= end) {
    let size = u32(bytes, i);
    const type = String.fromCharCode(bytes[i + 4], bytes[i + 5], bytes[i + 6], bytes[i + 7]);
    if (size === 1 && i + 16 <= end) size = u32(bytes, i + 12);
    if (size < 8) break;
    const boxEnd = Math.min(i + size, end);
    if (type === "covr" || type === "data") {
      const pic = findImage(bytes.subarray(i + 8, boxEnd));
      if (pic) return pic;
    }
    if (type === "moov" || type === "udta" || type === "meta" || type === "ilst" || type === "----") {
      const inner = type === "meta" ? i + 12 : i + 8;
      const pic = walkMp4(bytes, inner, boxEnd);
      if (pic) return pic;
    }
    i += size;
  }
  return null;
}

export function titleFromFilename(name: string): { title: string; artist: string } {
  const stem = name.replace(/\.[^/.]+$/, "").replace(/[_]+/g, " ").trim();
  const parts = stem.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(" - ").trim() };
  }
  return { title: stem || "Audio file", artist: "On this device" };
}

export async function readAudioTags(file: Blob, filename = ""): Promise<AudioTags> {
  const slice = file.slice(0, Math.min(file.size, 3_000_000));
  const bytes = new Uint8Array(await slice.arrayBuffer());
  const tags = parseId3(bytes);
  if (!tags.artwork && bytes.length > 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    tags.artwork = walkMp4(bytes, 0, bytes.length) ?? undefined;
  }
  if (!tags.title && filename) {
    const fromName = titleFromFilename(filename);
    tags.title = fromName.title;
    tags.artist = tags.artist || fromName.artist;
  }
  return tags;
}

function loadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read artwork"));
    };
    image.src = url;
  });
}

export async function compressArtwork(blob: Blob, maxEdge = 160): Promise<string> {
  const image = await loadImage(blob);
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Couldn't prepare artwork");
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function fallbackArtworkDataUrl(title: string, tint = "#b08968"): string {
  const canvas = document.createElement("canvas");
  canvas.width = 72;
  canvas.height = 72;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, 72, 72);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.beginPath();
  ctx.arc(56, -4, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 22px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(songInitials(title), 36, 38);
  return canvas.toDataURL("image/jpeg", 0.7);
}

export function songInitials(title: string) {
  const parts = title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "♪";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
