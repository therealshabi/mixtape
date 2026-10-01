import react from "@vitejs/plugin-react";
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

export default defineConfig({
  plugins: [react(), hostAudioPlugin()],
});
