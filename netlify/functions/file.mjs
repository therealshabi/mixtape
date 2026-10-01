import { getStore } from "@netlify/blobs";

export async function handler(event) {
  const headers = { "Access-Control-Allow-Origin": "*" };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers, body: "" };
  if (event.httpMethod !== "GET") return { statusCode: 405, headers, body: "GET only" };
  try {
    const id = event.queryStringParameters?.id || event.path.split("/").filter(Boolean).pop();
    if (!id || id === "file") return { statusCode: 400, headers, body: "Missing id" };
    const store = getStore("mixtape-files");
    const result = await store.getWithMetadata(id, { type: "arrayBuffer" });
    if (!result) return { statusCode: 404, headers, body: "Not found" };
    return {
      statusCode: 200,
      isBase64Encoded: true,
      headers: {
        ...headers,
        "Content-Type": result.metadata?.type || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
      body: Buffer.from(result.data).toString("base64"),
    };
  } catch (err) {
    return { statusCode: 502, headers, body: err instanceof Error ? err.message : "Read failed" };
  }
}
