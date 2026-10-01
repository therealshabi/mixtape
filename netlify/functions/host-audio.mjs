import { randomBytes } from "node:crypto";
import { connectLambda, getStore } from "@netlify/blobs";

export async function handler(event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };
  try {
    connectLambda(event);
    const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "";
    const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!payload?.data) throw new Error("Missing file data");
    const bytes = Buffer.from(payload.data, "base64");
    const key = randomBytes(8).toString("hex");
    const type = payload.type || "application/octet-stream";
    const filename = payload.filename || "file.bin";
    const store = getStore("mixtape-files");
    await store.set(key, bytes, { metadata: { type, filename } });
    const origin = (process.env.URL || process.env.DEPLOY_PRIME_URL || "").replace(/\/$/, "");
    return { statusCode: 200, headers, body: JSON.stringify({ url: `${origin}/api/file/${key}` }) };
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: err instanceof Error ? err.message : "Upload failed" }) };
  }
}
