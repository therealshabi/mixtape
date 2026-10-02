const MP3_BITRATES = [32, 40, 48, 56, 64, 80, 96, 112, 128];
const SAMPLE_RATE = 44_100;

type WorkerMessage =
  | { type: "progress"; progress: number }
  | { type: "done"; parts: Uint8Array[] }
  | { type: "error"; message: string };

function pickBitrate(maxBytes: number, seconds: number): number | null {
  const budgetKbps = (maxBytes * 0.94 * 8) / seconds / 1000;
  const fits = MP3_BITRATES.filter((kbps) => kbps <= budgetKbps);
  return fits.length ? fits[fits.length - 1] : null;
}

function mp3Name(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "track";
  return `${base}.mp3`;
}

export async function shrinkAudio(
  file: File,
  maxBytes: number,
  onProgress?: (progress: number) => void,
): Promise<File> {
  let audio: AudioBuffer;
  try {
    const ctx = new OfflineAudioContext(2, 1, SAMPLE_RATE);
    audio = await ctx.decodeAudioData(await file.arrayBuffer());
  } catch {
    throw new Error("Couldn't read that song to make it smaller — try an MP3 under 4 MB");
  }

  const kbps = pickBitrate(maxBytes, audio.duration);
  if (!kbps) {
    const minutes = Math.round(audio.duration / 60);
    throw new Error(`That song is ${minutes} minutes long — too long to fit in a share link`);
  }
  // Below 80 kbps, mono sounds cleaner than starved stereo.
  const stereo = audio.numberOfChannels > 1 && kbps >= 80;
  const channels = stereo
    ? [audio.getChannelData(0).slice(), audio.getChannelData(1).slice()]
    : [mixToMono(audio)];

  const worker = new Worker(new URL("./mp3Worker.ts", import.meta.url), { type: "module" });
  try {
    const parts = await new Promise<Uint8Array[]>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
        const msg = event.data;
        if (msg.type === "progress") onProgress?.(msg.progress);
        else if (msg.type === "done") resolve(msg.parts);
        else reject(new Error(msg.message));
      };
      worker.onerror = () => reject(new Error("Couldn't make that song smaller"));
      worker.postMessage(
        { channels, sampleRate: audio.sampleRate, kbps },
        channels.map((c) => c.buffer),
      );
    });
    const shrunk = new File(parts as BlobPart[], mp3Name(file.name), { type: "audio/mpeg" });
    if (shrunk.size > maxBytes) throw new Error("Couldn't get that song under 4 MB");
    return shrunk;
  } finally {
    worker.terminate();
  }
}

function mixToMono(audio: AudioBuffer): Float32Array {
  const mono = new Float32Array(audio.length);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const data = audio.getChannelData(c);
    for (let i = 0; i < data.length; i++) mono[i] += data[i] / audio.numberOfChannels;
  }
  return mono;
}
