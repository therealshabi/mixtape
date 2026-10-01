const MAX_SHARE_BYTES = 4_200_000;

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
    throw new Error("Keep device files under 4 MB so they can travel with the share link");
  }
  const data = await fileToBase64(file);
  const res = await fetch("/api/host-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, type: type || "application/octet-stream", data }),
  });
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !body.url?.startsWith("http")) {
    throw new Error(body.error || "Couldn't upload that file for sharing");
  }
  return body.url;
}

export async function hostAudioFile(file: Blob, filename: string): Promise<string> {
  return hostShareFile(file, filename, file.type || "audio/mpeg");
}
