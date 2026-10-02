export const MAX_SHARE_BYTES = 4_200_000;

function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Couldn't read that file"));
    reader.readAsDataURL(file);
  });
}

export async function hostShareFile(file: Blob, filename: string, type = file.type): Promise<string> {
  if (file.size > MAX_SHARE_BYTES) {
    const mb = (file.size / 1_000_000).toFixed(1);
    throw new Error(`it's ${mb} MB, and device files need to be under 4 MB to share`);
  }
  const data = await fileToBase64(file);
  let res: Response;
  try {
    res = await fetch("/api/host-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, type: type || "application/octet-stream", data }),
    });
  } catch {
    throw new Error("couldn't reach the upload server — check your connection");
  }
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !body.url?.startsWith("http")) {
    if (res.status === 413) throw new Error("the file is too large for the upload server");
    throw new Error(body.error || `upload server returned ${res.status}`);
  }
  return body.url;
}

export async function hostAudioFile(file: Blob, filename: string): Promise<string> {
  return hostShareFile(file, filename, file.type || "audio/mpeg");
}
