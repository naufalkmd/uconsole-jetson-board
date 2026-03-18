import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeMockStateFile } from "./export-state.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const uiDir = path.join(rootDir, "ui");
const port = Number(process.env.PORT ?? 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

await writeMockStateFile();

const server = http.createServer(async (request, response) => {
  try {
    const urlPath = request.url === "/" ? "/index.html" : request.url;
    const filePath = path.join(uiDir, decodeURIComponent(urlPath));

    const body = await readFile(filePath);
    const ext = path.extname(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[ext] ?? "application/octet-stream"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`Software PoC preview running at http://127.0.0.1:${port}`);
});
