import react from "@vitejs/plugin-react";
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function serveFile(req: IncomingMessage, res: ServerResponse, file: { bytes: Buffer; type: string }) {
  const total = file.bytes.length;
  res.setHeader("Content-Type", file.type);
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Access-Control-Allow-Origin", "*");
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
  if (!range) {
    res.statusCode = 200;
    res.setHeader("Content-Length", total);
    res.end(file.bytes);
    return;
  }
  const start = range[1] ? Number(range[1]) : Math.max(0, total - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
  if (start >= total || start > end) {
    res.statusCode = 416;
    res.setHeader("Content-Range", `bytes */${total}`);
    res.end();
    return;
  }
  res.statusCode = 206;
  res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
  res.setHeader("Content-Length", end - start + 1);
  res.end(file.bytes.subarray(start, end + 1));
}

function hostAudioPlugin(): Plugin {
  const files = new Map<string, { bytes: Buffer; type: string }>();
  return {
    name: "host-audio",
    configureServer(server) {
      server.middlewares.use("/api/file", (req: IncomingMessage, res: ServerResponse) => {
        const id = (req.url || "").split("?")[0].replace(/^\//, "");
        const file = files.get(id);
        if (!file) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        serveFile(req, res, file);
      });
      server.middlewares.use("/api/host-audio", async (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader("Content-Type", "application/json");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "POST only" }));
          return;
        }
        try {
          const payload = JSON.parse((await readBody(req)).toString("utf8")) as {
            filename?: string;
            type?: string;
            data?: string;
          };
          if (!payload.data) throw new Error("Missing file data");
          const key = randomBytes(8).toString("hex");
          files.set(key, { bytes: Buffer.from(payload.data, "base64"), type: payload.type || "application/octet-stream" });
          // Use the request's own host so links also work from a phone on the LAN.
          const host = req.headers.host || "localhost:5173";
          res.statusCode = 200;
          res.end(JSON.stringify({ url: `http://${host}/api/file/${key}` }));
        } catch (err) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Upload failed" }));
        }
      });
    },
  };
}

function tapeStorePlugin(): Plugin {
  const tapes = new Map<string, string>();
  function newId() {
    return randomBytes(5).toString("hex");
  }
  return {
    name: "tape-store",
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        void (async () => {
        const url = (req.url || "").split("?")[0];
        if (!url.startsWith("/api/tape")) {
          next();
          return;
        }
        res.setHeader("Content-Type", "application/json");
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        const parts = url.split("/").filter(Boolean);
        const id = parts[0] === "api" && parts[1] === "tape" ? parts[2] : "";
        try {
          if (req.method === "GET") {
            if (!id) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Missing id" }));
              return;
            }
            const payload = tapes.get(id);
            if (!payload) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: "Not found" }));
              return;
            }
            res.statusCode = 200;
            res.end(JSON.stringify({ payload }));
            return;
          }
          if (req.method !== "POST") {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: "POST or GET only" }));
            return;
          }
          const body = JSON.parse((await readBody(req)).toString("utf8")) as { payload?: string };
          const payload = body.payload?.trim() || "";
          if (payload.length < 20 || payload.length > 200_000) {
            res.statusCode = 400;
            res.end(JSON.stringify({ error: "Invalid mixtape" }));
            return;
          }
          let key = newId();
          while (tapes.has(key)) key = newId();
          tapes.set(key, payload);
          res.statusCode = 200;
          res.end(JSON.stringify({ id: key }));
        } catch (err) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Tape failed" }));
        }
        })();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), hostAudioPlugin(), tapeStorePlugin()],
});
