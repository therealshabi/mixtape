import { randomBytes } from "node:crypto";
import { connectLambda, getStore } from "@netlify/blobs";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

function newId() {
  return randomBytes(5).toString("hex");
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };

  try {
    connectLambda(event);
    const store = getStore("mixtape-tapes");
    const id = event.queryStringParameters?.id || event.path.split("/").filter(Boolean).pop();

    if (event.httpMethod === "GET") {
      if (!id || id === "tape") return { statusCode: 400, headers, body: JSON.stringify({ error: "Missing id" }) };
      const payload = await store.get(id, { type: "text" });
      if (!payload) return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
      return { statusCode: 200, headers, body: JSON.stringify({ payload }) };
    }

    if (event.httpMethod !== "POST") {
      return { statusCode: 405, headers, body: JSON.stringify({ error: "POST or GET only" }) };
    }

    const raw = event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : event.body || "";
    const body = typeof raw === "string" ? JSON.parse(raw) : raw;
    const payload = typeof body?.payload === "string" ? body.payload.trim() : "";
    if (payload.length < 20 || payload.length > 200_000) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid mixtape" }) };
    }

    let key = newId();
    for (let i = 0; i < 4; i += 1) {
      const existing = await store.get(key, { type: "text" });
      if (!existing) break;
      key = newId();
    }
    await store.set(key, payload, { metadata: { type: "text/plain" } });
    return { statusCode: 200, headers, body: JSON.stringify({ id: key }) };
  } catch (err) {
    return { statusCode: 502, headers, body: JSON.stringify({ error: err instanceof Error ? err.message : "Tape failed" }) };
  }
}
