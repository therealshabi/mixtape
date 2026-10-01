import react from "@vitejs/plugin-react";
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";

async function uploadCatbox(filename: string, type: string, data: string) {
  const bytes = Buffer.from(data, "base64");
  const form = new FormData();
  form.append("reqtype", "fileupload");
  form.append("fileToUpload", new Blob([bytes], { type: type || "audio/mpeg" }), filename || "track.mp3");
  const res = await fetch("https://catbox.moe/user/api.php", { method: "POST", body: form });
  const url = (await res.text()).trim();
  if (!url.startsWith("http")) throw new Error(url || "Upload failed");
  return url;
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function hostAudioPlugin(): Plugin {
  return {
    name: "host-audio",
    configureServer(server) {
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
          const url = await uploadCatbox(payload.filename || "track.mp3", payload.type || "audio/mpeg", payload.data);
          res.statusCode = 200;
          res.end(JSON.stringify({ url }));
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
