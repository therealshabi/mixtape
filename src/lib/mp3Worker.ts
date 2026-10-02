import { Mp3Encoder } from "@breezystack/lamejs";

type EncodeRequest = {
  channels: Float32Array[];
  sampleRate: number;
  kbps: number;
};

const BLOCK = 1152 * 20;

function toInt16(samples: Float32Array, start: number, end: number): Int16Array {
  const out = new Int16Array(end - start);
  for (let i = start; i < end; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i - start] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

self.onmessage = (event: MessageEvent<EncodeRequest>) => {
  const { channels, sampleRate, kbps } = event.data;
  try {
    const encoder = new Mp3Encoder(channels.length, sampleRate, kbps);
    const [left, right] = channels;
    const parts: Uint8Array[] = [];
    let lastReport = 0;
    for (let i = 0; i < left.length; i += BLOCK) {
      const end = Math.min(i + BLOCK, left.length);
      const chunk = right
        ? encoder.encodeBuffer(toInt16(left, i, end), toInt16(right, i, end))
        : encoder.encodeBuffer(toInt16(left, i, end));
      if (chunk.length) parts.push(chunk.slice());
      const progress = end / left.length;
      if (progress - lastReport >= 0.02) {
        lastReport = progress;
        self.postMessage({ type: "progress", progress });
      }
    }
    const tail = encoder.flush();
    if (tail.length) parts.push(tail.slice());
    self.postMessage({ type: "done", parts });
  } catch (err) {
    self.postMessage({ type: "error", message: err instanceof Error ? err.message : "Couldn't encode that song" });
  }
};
