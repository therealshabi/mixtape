async function uploadCatbox(filename, type, data) {
  const bytes = Buffer.from(data, "base64");
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", new Blob([bytes], { type: type || "audio/mpeg" }), filename || "track.mp3");
  const res = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: form });
  const url = (await res.text()).trim();
  if (!url.startsWith("http")) throw new Error(url || "Upload failed");
  return url;
}

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "";
    const payload = JSON.parse(raw);
    const url = await uploadCatbox(payload.filename, payload.type, payload.data);
    return { statusCode: 200, headers, body: JSON.stringify({ url }) };
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: err instanceof Error ? err.message : "Upload failed" }) };
  }
}
